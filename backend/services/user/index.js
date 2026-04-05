require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./prisma/generated/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name }
        });
        res.status(201).json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ error: 'User registration failed', details: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/health', (req, res) => res.json({ status: 'User service running' }));

app.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Service listening on port ${PORT}`));
