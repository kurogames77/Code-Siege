import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API Key found');
        return;
    }
    console.log('API Key found:', apiKey.substring(0, 10) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);

    // Testing a mix of older and newer models
    const models = ['gemini-2.5-flash', 'gemini-flash-latest'];

    for (const modelName of models) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello, are you working?');
            const response = await result.response;
            console.log(`Success! Response: ${response.text()}`);
            return; // Exit on first success
        } catch (error) {
            console.error(`Error with ${modelName}:`, error.message);
            fs.appendFileSync('test_gemini_error.txt', `Error with ${modelName}: ${error.stack}\n\n`);
        }
    }
}

testGemini();
