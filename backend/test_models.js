import 'dotenv/config';
import fs from 'fs';

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not found in .env');
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        let output = '--- v1beta ---\n';
        data.models?.forEach(m => output += m.name + '\n');

        const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const dataV1 = await responseV1.json();
        output += '\n--- v1 ---\n';
        dataV1.models?.forEach(m => output += m.name + '\n');

        fs.writeFileSync('test_output.txt', output);
        console.log('Results written to test_output.txt');
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

listModels();
