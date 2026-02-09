import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Note: The SDK doesn't have a direct 'listModels' method exposed easily on the main class in some versions,
// but we can try to use the GenAI instance if it supports it, or just use fetch directly.

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Fetching models with key:', apiKey.substring(0, 10) + '...');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('Error fetching models:', data.error);
            fs.writeFileSync('models_error.txt', JSON.stringify(data.error, null, 2));
        } else {
            console.log('Available Models:');
            if (data.models) {
                const modelNames = data.models.map(m => m.name);
                console.log(modelNames.join('\n'));
                fs.writeFileSync('available_models.txt', modelNames.join('\n'));
            } else {
                console.log('No models found in response.');
                console.log(JSON.stringify(data, null, 2));
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

listModels();
