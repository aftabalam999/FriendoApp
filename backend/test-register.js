const fetch = require('node-fetch'); // You might need to install this or use built-in fetch if node 18+

async function testRegister() {
    const url = 'http://localhost:3000/api/auth/register';
    const body = {
        username: 'testuser_' + Date.now(),
        password: 'password123',
        displayName: 'Test User'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testRegister();
