require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./prisma/generated/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
app.get('/health', (req, res) => res.json({ status: 'Product service running' }));

app.get('/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

app.post('/', async (req, res) => {
    try {
        const { name, description, price, imageUrl } = req.body;
        const product = await prisma.product.create({
            data: { name, description, price, imageUrl }
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create product' });
    }
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Product Service listening on port ${PORT}`));
