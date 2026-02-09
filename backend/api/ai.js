import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Helper to get initialized Gemini instance
const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('CRITICAL: GEMINI_API_KEY is missing from process.env');
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    console.log(`Gemini initialized with key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
    return new GoogleGenerativeAI(apiKey);
};

/**
 * POST /api/ai/generate-levels
 * Generate puzzle levels based on course parameters
 */
router.post('/generate-levels', authenticateUser, async (req, res) => {
    try {
        const { language, difficulty, mode } = req.body;

        if (!language || !difficulty || !mode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const genAI = getGenAI();
        let model;

        // Use confirmed available models from test_output.txt
        const modelsToTry = [
            "gemini-flash-latest",
            "gemini-2.0-flash",
            "gemini-pro-latest",
            "gemini-1.5-flash-8b"
        ];

        let lastError = null;
        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to use model: ${modelName}...`);
                model = genAI.getGenerativeModel({ model: modelName });
                // We need to do a dummy call or just hope it works. 
                // Actually, getGenerativeModel doesn't verify existence until generateContent.
                break;
            } catch (e) {
                lastError = e;
                continue;
            }
        }

        const isAdvance = mode.toLowerCase().includes('advance');

        const prompt = `
        You are an expert coding instructor designed to generate educational coding puzzles.
        Generate 10 progressive coding puzzle levels for a course with the following settings:
        - Language: ${language}
        - Difficulty: ${difficulty}
        - Mode: ${mode}

        Each level should teach a concept appropriate for the difficulty.
        
        CRITICAL RULES FOR DIFFICULTY SCALING:
        1. Maintain difficulty WITHIN the scope of the '${mode}' mode.
        2. A 'Hard' level in '${mode}' should still be conceptually simpler than an 'Easy' level in the next higher mode.
        3. Do NOT exceed the conceptual boundaries of the mode.
           - Beginner: Basic syntax, variables, loop concepts (Visual/Block focus)
           - Intermediate: Conditionals, functions, basic algorithms
           - Advance: Complex logic, optimization, data structures (Pure Code focus)
        4. If ${difficulty} is 'Hard', make it challenging relative to OTHER ${mode} levels, but not impossible for a ${mode} student.

        Return the response strictly as a JSON array of objects. Do not wrap in markdown code blocks.
        The JSON structure for each level object should be:
        {
            "id": "level_number",
            "name": "Short Creative Title",
            "description": "Clear instruction of what to do",
            "initialCode": "Starter code snippet (optional)",
            "expectedOutput": "The expected result string",
            "solution": "The correct code solution",
            "hints": [
                { "text": "Hint 1", "cost": 10 },
                { "text": "Hint 2", "cost": 20 }
            ],
            "rewards": {
                "exp": 100,
                "coins": 0
            },
            "initialBlocks": ${isAdvance ? "[]" : `[
                { 
                    "id": "b1", 
                    "content": "keyword/code", 
                    "type": "function|value|control", 
                    "color": "bg-red-500|bg-purple-500|bg-cyan-500",
                    "connectors": { "top": 0, "right": 1, "bottom": 0, "left": 0 } 
                }
            ]`},
            "correctSequence": ${isAdvance ? "[]" : `["b1", "b2"]`}
        }
        
        ${isAdvance ? `
        IMPORTANT: For 'Advance' mode, this is a PURE CODE challenge. 
        - DO NOT generate 'initialBlocks'. Return an empty array [].
        - DO NOT generate 'correctSequence'. Return an empty array [].
        - Focus on 'initialCode', 'solution', and 'expectedOutput'.
        ` : `
        Note: For 'initialBlocks', provide 3-4 blocks.
        CRITICAL: Visual Interlocking Rules (connectors: 0=None, 1=Out/Tab, 2=In/Slot):
        - You MUST define 'connectors' for every block so they snap together logically in the 'correctSequence'.
        - If Block A is followed by Block B: Block A 'right' must be 1 (Tab), and Block B 'left' must be 2 (Slot).
        
        - **ALL SIDES MUST HAVE CONNECTORS**:
          - NEVER use 0 (None/Flat). Every single side (top, right, bottom, left) MUST be 1 or 2.
          - Even the first block's Left side and last block's Right side must have 1 or 2 (to look like infinite puzzle pieces).
          - Top/Bottom: Randomly assign 1 or 2.
        
        - **DUMMY BLOCK**: You MUST include 1 extra block in 'initialBlocks' that is NOT in 'correctSequence'.
          - This block is a distractor (e.g. wrong function name or syntax).
          - Give it an ID like "dummy1".
          - It should have connectors that *could* fit but are wrong logic.
        `}

        - Ensure the 'id' is just the number (1 to 10).
        - REWARDS MUST BE STRICTLY: { "exp": 100, "coins": 0 }. Do not scale rewards.
        - Ensure difficulty scales slightly with each level.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Robust JSON cleaning
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the first [ and last ] to extract just the array if there's noise
        const startIdx = text.indexOf('[');
        const endIdx = text.lastIndexOf(']');

        if (startIdx === -1 || endIdx === -1) {
            console.error('Invalid AI Output (No JSON array found):', text);
            throw new Error('AI output did not contain a valid JSON array');
        }

        const cleanText = text.substring(startIdx, endIdx + 1);

        try {
            const levels = JSON.parse(cleanText);
            res.json({ levels, mode, difficulty });
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw text that failed to parse:', cleanText);
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('AI Generation Error Detail:', error);


        res.status(500).json({
            error: 'Failed to generate levels',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/ai/debug-code
 * Analyze code and provide debugging hints
 */
router.post('/debug-code', authenticateUser, async (req, res) => {
    try {
        const { code, language, problemDescription } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const genAI = getGenAI();

        const prompt = `
        You are a helpful AI coding tutor.
        Analyze the following ${language || 'code'} snippet which is attempting to solve: "${problemDescription || 'a coding problem'}".
        
        Code:
        ${code}

        Identified specific errors and provide a helpful, encouraging hint to fix it.
        Do not just give the solution. Guide the user.
        Keep the response short and concise (max 2-3 sentences).
        `;

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
        let result = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                break; // If successful, exit loop
            } catch (e) {
                console.warn(`Model ${modelName} failed:`, e.message);
                lastError = e;
            }
        }

        if (!result) {
            throw lastError || new Error('All AI models failed');
        }

        const response = await result.response;
        const feedback = response.text();

        res.json({ feedback });
    } catch (error) {
        console.error('AI Debug Error:', error);
        res.status(500).json({ error: 'Failed to analyze code', details: error.message });
    }
});

/**
 * POST /api/ai/verify-code
 * Verify if code is a valid solution despite strict mismatch
 */
router.post('/verify-code', authenticateUser, async (req, res) => {
    try {
        const { code, language, problemDescription, expectedOutput } = req.body;

        if (!code) return res.status(400).json({ error: 'Code is required' });

        const genAI = getGenAI();
        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
        let result = null;
        let lastError = null;

        const prompt = `
        You are an expert coding judge.
        Problem: "${problemDescription}"
        Expected Output: "${expectedOutput}"
        
        Student's Code:
        ${code}

        Is this code a VALID solution that solves the problem and produces the expected logical result?
        Allowed: Different variable names, different order of independent statements (e.g. A=5; B=4 vs B=4; A=5), different whitespace.
        
        Return STRICT JSON:
        {
            "correct": boolean,
            "message": "Short explanation if correct or incorrect"
        }
        `;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                break;
            } catch (e) {
                console.warn(`Model ${modelName} failed (verify):`, e.message);
                lastError = e;
            }
        }

        if (!result) {
            throw lastError || new Error('All AI models failed');
        }

        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonResponse = JSON.parse(text);
        res.json(jsonResponse);

    } catch (error) {
        console.error('AI Verify Error:', error);
        // Fallback to false if AI fails
        res.json({ correct: false, message: "AI verification unavailable." });
    }
});

export default router;
