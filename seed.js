const axios = require('axios');

const GATEWAY = 'http://localhost:3000';

async function seed() {
    try {
        console.log('Seeding Database...');

        // 1. Create a User
        console.log('-> Creating test user...');
        const userRes = await axios.post(`${GATEWAY}/users/register`, {
            email: 'testuser@example.com',
            password: 'password123',
            name: 'John Doe'
        });
        const userId = userRes.data.id;
        console.log(`User created with ID: ${userId}`);

        // 2. Create Products
        console.log('-> Creating products...');
        const p1Res = await axios.post(`${GATEWAY}/products/`, {
            name: 'Premium Wireless Headphones',
            description: 'Noise cancelling, 30h battery',
            price: 299,
            imageUrl: ''
        });
        const p2Res = await axios.post(`${GATEWAY}/products/`, {
            name: 'Mechanical Keyboard',
            description: 'RGB, tactile switches',
            price: 149,
            imageUrl: ''
        });
        console.log('Products created.');
        const p1Id = p1Res.data.id;
        const p2Id = p2Res.data.id;

        // 3. Add Inventory
        console.log('-> Adding inventory to Redis...');
        await axios.post(`${GATEWAY}/inventory/add`, { productId: p1Id, quantity: 100 });
        await axios.post(`${GATEWAY}/inventory/add`, { productId: p2Id, quantity: 50 });
        console.log('Inventory added.');

        console.log('\n======================================');
        console.log('SEEDING COMPLETE! Please open your frontend app.');
        console.log(`NOTE: Update frontend App.jsx to use this User ID: ${userId}`);
        console.log('======================================\n');
    } catch (e) {
        console.error('Seeding failed:', e.message);
        if (e.response && e.response.data) {
            console.error(e.response.data);
        }
    }
}

seed();
