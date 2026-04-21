import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// MULTI-KEY, MULTI-MODEL FAILOVER SYSTEM
// ============================================================

/**
 * Collects all available Gemini API keys from environment variables.
 * Supports: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.
 */
const getApiKeys = () => {
    const keys = [];
    // Primary key
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    // Additional keys (2-10)
    for (let i = 2; i <= 10; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
};

/**
 * Models to attempt for each key, in priority order.
 * More reliable/faster models first, heavier models as fallback.
 */
const MODELS_TO_TRY = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-flash-latest",
    "gemini-pro-latest",
];

/**
 * Unified AI content generation with multi-key, multi-model failover.
 * For each API key, tries all models before moving to the next key.
 * @param {string} prompt - The prompt to send
 * @param {object} opts - Optional config: { jsonMode: boolean }
 * Returns the generated result or throws an error if all fail.
 */
const tryGenerateContent = async (prompt, opts = {}) => {
    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
        console.error('CRITICAL: No GEMINI_API_KEY found in environment variables');
        throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY in environment variables.');
    }

    let lastError = null;
    let attemptCount = 0;

    const generationConfig = {
        temperature: 0.7,
        maxOutputTokens: 32768,
    };

    // Force Gemini to output valid JSON natively
    if (opts.jsonMode) {
        generationConfig.responseMimeType = 'application/json';
    }

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        const apiKey = apiKeys[keyIndex];
        const keyLabel = `Key#${keyIndex + 1} (${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)})`;

        const genAI = new GoogleGenerativeAI(apiKey);

        for (const modelName of MODELS_TO_TRY) {
            attemptCount++;
            try {
                console.log(`[AI Failover] Attempt ${attemptCount}: ${keyLabel} → ${modelName}${opts.jsonMode ? ' [JSON mode]' : ''}`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig
                });
                const result = await model.generateContent(prompt);
                console.log(`[AI Failover] ✓ SUCCESS on ${keyLabel} → ${modelName}`);
                return result;
            } catch (e) {
                const shortMsg = e.message ? e.message.substring(0, 200) : 'Unknown error';
                const isQuota = shortMsg.includes('429') || shortMsg.includes('Quota') || shortMsg.includes('quota') || shortMsg.includes('Resource has been exhausted');
                const isModelNotFound = shortMsg.includes('not found') || shortMsg.includes('404') || shortMsg.includes('is not supported');

                if (isModelNotFound) {
                    console.warn(`[AI Failover] ✗ ${keyLabel} → ${modelName}: Model not available, skipping.`);
                } else if (isQuota) {
                    console.warn(`[AI Failover] ✗ ${keyLabel} → ${modelName}: Quota exhausted, trying next...`);
                } else {
                    console.warn(`[AI Failover] ✗ ${keyLabel} → ${modelName}: ${shortMsg}`);
                }
                lastError = e;
                continue;
            }
        }
    }

    // All keys and models exhausted
    const isQuota = lastError && lastError.message && (lastError.message.includes('Quota') || lastError.message.includes('429'));
    if (isQuota) {
        throw new Error(`All AI model quotas exhausted across ${apiKeys.length} API key(s). Please wait a few minutes and try again, or add more API keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.).`);
    }
    throw lastError || new Error(`All AI models failed across ${apiKeys.length} key(s) after ${attemptCount} attempts.`);
};

// ============================================================
// LANGUAGE SYNTAX RULES
// ============================================================

const LANGUAGE_SYNTAX_RULES = {
    'Python': `
    - Use PEP 8 style: spaces around = in assignments (x = 5, NOT x=5)
    - Each statement must be on its own line (x = 5\\ny = 2, NOT x=5,y=2)
    - Use snake_case for variable names
    - String quotes: use consistent double quotes
    - Function calls use parentheses: print("hello") NOT print "hello"
    - For loops: for i in range(n): with proper colon and 4-space indentation
    - Use proper Python built-ins: print(), input(), len(), range(), int(), str()`,
    'C#': `
    - Use PascalCase for methods and classes, camelCase for local variables
    - All statements end with semicolons (;)
    - Use curly braces for code blocks: if (x > 0) { ... }
    - String interpolation: $"Hello {name}" or concatenation "Hello " + name
    - Console output: Console.WriteLine("text"); or Console.Write("text");
    - Type declarations required: int x = 5; string name = "test"; bool flag = true;
    - Use 'using System;' for namespace imports`,
    'C++': `
    - Include directives: #include <iostream> for I/O, #include <string> for strings
    - Use 'using namespace std;' or prefix with std::
    - All statements end with semicolons (;)
    - Output: cout << "text" << endl; or std::cout << "text" << std::endl;
    - Variable declarations: int x = 5; string s = "test"; double d = 3.14;
    - Use curly braces for code blocks
    - Main function: int main() { ... return 0; }`,
    'JavaScript': `
    - Use camelCase for variables and functions
    - Use const for constants, let for variables (NEVER var)
    - Template literals for string interpolation: \\\`Hello \\\${name}\\\`
    - Console output: console.log("text");
    - Arrow functions: const fn = (x) => x * 2;
    - All statements end with semicolons (;)
    - Array methods: .map(), .filter(), .forEach(), .reduce()`,
    'PHP': `
    - All variables start with $: $x = 5; $name = "test";
    - All statements end with semicolons (;)
    - String concatenation uses dot operator: $x . " text"
    - String interpolation in double quotes: "Hello $name" or "Hello {$name}"
    - Output: echo "text"; or print("text");
    - Arrays: $arr = [1, 2, 3]; or $arr = array(1, 2, 3);
    - Opening tag: <?php (include in solution if standalone script)`,
    'MySQL': `
    - SQL keywords in UPPERCASE: SELECT, FROM, WHERE, INSERT INTO, UPDATE, DELETE
    - Table and column names in lowercase or snake_case
    - String values in single quotes: 'value'
    - Statements end with semicolons (;)
    - Use proper JOIN syntax: INNER JOIN table_name ON condition
    - Use aliases: SELECT t.column FROM table_name AS t
    - Aggregates: COUNT(), SUM(), AVG(), MAX(), MIN() in UPPERCASE
    - Clauses order: SELECT ... FROM ... WHERE ... GROUP BY ... ORDER BY ... LIMIT`
};

// ============================================================
// POST /api/ai/generate-levels
// ============================================================

router.post('/generate-levels', authenticateUser, async (req, res) => {
    try {
        const { language, difficulty, mode } = req.body;

        if (!language || !difficulty || !mode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const isAdvance = mode.toLowerCase().includes('advance');
        const isBeginner = mode.toLowerCase().includes('beginner');
        const isIntermediate = mode.toLowerCase().includes('intermediate');
        const syntaxRules = LANGUAGE_SYNTAX_RULES[language] || `- Use proper syntax conventions for ${language}. Follow the language's official style guide.`;

        const prompt = `
        You are an expert university-level coding instructor and puzzle designer.
        Generate 10 progressive coding puzzle levels for a course with the following settings:
        - Language: ${language}
        - Difficulty: ${difficulty}
        - Mode: ${mode}

        Each level should teach a concept appropriate for the difficulty.
        
        LANGUAGE-SPECIFIC SYNTAX RULES FOR ${language}:
        ${syntaxRules}

        CRITICAL RULES FOR DIFFICULTY SCALING:
        1. Maintain difficulty WITHIN the scope of the '${mode}' mode.
        2. A 'Hard' level in '${mode}' should still be conceptually simpler than an 'Easy' level in the next higher mode.
        3. Do NOT exceed the conceptual boundaries of the mode.
        4. DIFFICULTY CALIBRATION FOR EACH MODE:
           - Beginner: These are for 4th-year university Computer Science students who know basic syntax. DO NOT make trivial "Hello World" puzzles. Instead focus on:
             * Multi-variable arithmetic expressions (e.g., compute area, swap variables, format currency)
             * String manipulation (concatenation, slicing, f-strings/template literals)
             * Type conversion and formatted output (e.g., "Result: 3.14" with proper formatting)
             * Simple conditional checks (if/else with comparisons and logical operators)
             * Basic loop patterns (counting, summing, range-based iteration)
             * List/Array creation and basic access patterns
             * Combining print statements with computed values
             Each level MUST require the student to think — not just drag one function call.
           - Intermediate: Functions, nested loops, error handling, string algorithms, sorting, search
           - Advance: Complex algorithms, data structures, optimization, OOP patterns (Pure Code focus)
        5. If ${difficulty} is 'Hard', make it challenging relative to OTHER ${mode} levels, but not impossible for a ${mode} student.

        PROGRESSIVE TEACHING ORDER (Levels 1-10 must follow this sequence):
        - Levels 1-2: Multi-step output with variables and expressions (NOT just print "hello")
        - Levels 3-4: String manipulation and formatted output with computations
        - Levels 5-6: Conditional logic with comparisons, logical operators
        - Levels 7-8: Loop patterns (counting, accumulation, iteration)
        - Levels 9-10: Combining multiple concepts (loops + conditionals, functions + formatting)

        Return the response strictly as a JSON array of objects. Do not wrap in markdown code blocks.
        The JSON structure for each level object should be:
        {
            "id": "level_number",
            "name": "Short Creative Title",
            "description": "Clear instruction of what to do",
            "initialCode": "Starter code snippet (optional)",
            "expectedOutput": "The expected result string",
            "solution": "The correct code solution using PROPER ${language} syntax",
            "hints": [
                { "text": "Hint 1", "cost": 10 },
                { "text": "Hint 2", "cost": 20 }
            ]
        }
        
        - Ensure the 'id' is just the number (1 to 10).
        - Ensure difficulty scales slightly with each level.
        - ALL code in 'solution' MUST follow the ${language} syntax rules listed above exactly.
        `;

        const result = await tryGenerateContent(prompt, { jsonMode: true });
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

        let cleanText = text.substring(startIdx, endIdx + 1);

        /**
         * Sanitize common JSON issues from AI output:
         * 1. Trailing commas before ] or }
         * 2. Unescaped control characters inside strings
         * 3. Single-line comments
         * 4. Unescaped backslashes in code strings
         */
        const sanitizeJSON = (str) => {
            // Remove single-line comments (// ...) outside of strings — rough but effective
            str = str.replace(/\/\/[^\n"]*$/gm, '');
            // Remove trailing commas before } or ]
            str = str.replace(/,\s*([\]}])/g, '$1');
            // Fix unescaped newlines inside JSON string values
            // Replace actual newline chars inside strings with \\n
            str = str.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
                return match
                    .replace(/\r\n/g, '\\n')
                    .replace(/\r/g, '\\n')
                    .replace(/\n/g, '\\n')
                    .replace(/\t/g, '\\t');
            });
            return str;
        };

        cleanText = sanitizeJSON(cleanText);

        let levels;
        try {
            levels = JSON.parse(cleanText);
        } catch (parseError) {
            console.warn('[AI] First parse failed, attempting deeper sanitization...', parseError.message);
            
            // Second attempt: more aggressive cleaning
            try {
                // Try to fix unescaped quotes inside string values
                let deepClean = cleanText;
                // Remove any BOM or zero-width chars
                deepClean = deepClean.replace(/[\u200B-\u200D\uFEFF]/g, '');
                // Replace problematic unicode quotes with standard quotes
                deepClean = deepClean.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
                
                levels = JSON.parse(deepClean);
            } catch (secondError) {
                console.error('JSON Parse Error (both attempts failed):', secondError);
                console.error('Raw text that failed to parse:', cleanText.substring(0, 500));
                throw new Error(`Failed to parse AI response: ${secondError.message}`);
            }
        }

            // Post-process the blocks on the server to prevent AI hallucination and drastically improve speeds
            if (!isAdvance) {
                const { generateBlocksFromSolution } = await import('../utils/blockGenerator.js');
                levels = levels.map(level => {
                    if (level.solution) {
                        try {
                            const blockData = generateBlocksFromSolution(level.solution, mode);
                            if (blockData) {
                                level.initialBlocks = blockData.initialBlocks || [];
                                level.correctSequence = blockData.correctSequence || [];
                            } else {
                                level.initialBlocks = [];
                                level.correctSequence = [];
                            }
                        } catch (e) {
                            console.error(`Block generation failed for level ${level.id}:`, e);
                            level.initialBlocks = [];
                            level.correctSequence = [];
                        }
                    }
                    
                    // Attach default rewards since AI no longer does it
                    level.rewards = { exp: 100, coins: 0 };
                    return level;
                });
            } else {
                levels = levels.map(level => {
                    level.initialBlocks = [];
                    level.correctSequence = [];
                    level.rewards = { exp: 100, coins: 0 };
                    return level;
                });
            }

            res.json({ levels, mode, difficulty });
    } catch (error) {
        console.error('AI Generation Error Detail:', error);

        res.status(500).json({
            error: 'Failed to generate levels',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ============================================================
// POST /api/ai/debug-code
// ============================================================

router.post('/debug-code', authenticateUser, async (req, res) => {
    try {
        const { code, language, problemDescription } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const prompt = `
        You are a helpful AI coding tutor.
        Analyze the following ${language || 'code'} snippet which is attempting to solve: "${problemDescription || 'a coding problem'}".
        
        Code:
        ${code}

        Identified specific errors and provide a helpful, encouraging hint to fix it.
        Do not just give the solution. Guide the user.
        Keep the response short and concise (max 2-3 sentences).
        `;

        const result = await tryGenerateContent(prompt);
        const response = await result.response;
        const feedback = response.text();

        res.json({ feedback });
    } catch (error) {
        console.error('AI Debug Error:', error);
        res.status(500).json({ error: 'Failed to analyze code', details: error.message });
    }
});

// ============================================================
// POST /api/ai/verify-code
// ============================================================

router.post('/verify-code', authenticateUser, async (req, res) => {
    try {
        const { code, language, problemDescription, expectedOutput } = req.body;

        if (!code) return res.status(400).json({ error: 'Code is required' });

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

        const result = await tryGenerateContent(prompt);
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
