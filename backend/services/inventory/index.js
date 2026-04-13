require('ecommerce-otel').start({ serviceName: 'inventory-service' });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
app.use(cors());
app.use(express.json());

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', err => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();
app.get('/health', (req, res) => res.json({ status: 'Inventory service running' }));

app.get('/:productId', async (req, res) => {
    try {
        const stock = await redisClient.get(`stock:${req.params.productId}`);
        res.json({ productId: req.params.productId, stock: stock ? parseInt(stock, 10) : 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

app.post('/deduct', async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const stockStr = await redisClient.get(`stock:${productId}`);
        let currentStock = stockStr ? parseInt(stockStr, 10) : 0;

        if (currentStock >= quantity) {
            currentStock -= quantity;
            await redisClient.set(`stock:${productId}`, currentStock);
            res.json({ success: true, newStock: currentStock });
        } else {
            res.status(400).json({ success: false, error: 'Insufficient stock' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to deduct inventory' });
    }
});

app.post('/add', async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const stockStr = await redisClient.get(`stock:${productId}`);
        let currentStock = stockStr ? parseInt(stockStr, 10) : 0;
        currentStock += quantity;
        await redisClient.set(`stock:${productId}`, currentStock);
        res.json({ success: true, newStock: currentStock });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add inventory' });
    }
});


const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Inventory Service listening on port ${PORT}`));
