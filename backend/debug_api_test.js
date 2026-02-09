// Node 18+ has global fetch

async function testDebugEndpoint() {
    // Skip login for now as we disabled auth on endpoint
    runTest('dummy-token');
}

async function runTest(token) {
    console.log('Authenticated (via dummy). Testing debug-code...');

    const payload = {
        code: "print('Hello World'",
        language: "python",
        problemDescription: "Print Hello World"
    };

    const res = await fetch('http://localhost:3001/api/ai/debug-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
}

testDebugEndpoint();
