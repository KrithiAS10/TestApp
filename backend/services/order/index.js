require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./prisma/generated/client');
const axios = require('axios');
const amqp = require('amqplib');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const USER_SVC = process.env.USER_SVC_URL || 'http://localhost:3001';
const INVENTORY_SVC = process.env.INVENTORY_SVC_URL || 'http://localhost:3003';
const PAYMENT_SVC = process.env.PAYMENT_SVC_URL || 'http://localhost:3005';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

let rabbitChannel = null;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        rabbitChannel = await connection.createChannel();
        await rabbitChannel.assertQueue('order_notifications');
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('RabbitMQ connection failed:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

app.post('/create', async (req, res) => {
    const { userId, productId, quantity, totalAmount } = req.body;

    try {
        // 1. Validate User
        const userRes = await axios.get(`${USER_SVC}/${userId}`).catch(() => null);
        if (!userRes || !userRes.data) return res.status(400).json({ error: 'Invalid user' });

        // 2. Check and Deduct Inventory
        const inventoryRes = await axios.post(`${INVENTORY_SVC}/deduct`, { productId, quantity }).catch(() => null);
        if (!inventoryRes || !inventoryRes.data.success) {
            return res.status(400).json({ error: 'Insufficient stock or inventory error' });
        }

        // 3. Process Payment
        const paymentRes = await axios.post(`${PAYMENT_SVC}/process`, {
            orderId: `temp_${Date.now()}`,
            amount: totalAmount
        }).catch(() => null);

        if (!paymentRes || !paymentRes.data.success) {
            // Rollback inventory if payment fails
            await axios.post(`${INVENTORY_SVC}/add`, { productId, quantity });
            return res.status(400).json({ error: 'Payment failed, inventory restored' });
        }

        // 4. Save Order
        const order = await prisma.order.create({
            data: { userId, productId, quantity, totalAmount, status: 'Completed' }
        });

        // 5. Publish Notification
        if (rabbitChannel) {
            const message = JSON.stringify({ event: 'order_placed', orderId: order.id, userId, email: userRes.data.email });
            rabbitChannel.sendToQueue('order_notifications', Buffer.from(message));
        }

        res.status(201).json(order);

    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/health', (req, res) => res.json({ status: 'Order service running' }));

app.get('/:id', async (req, res) => {
    try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});


const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Order Service listening on port ${PORT}`));
