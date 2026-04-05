require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue('order_notifications');
        console.log('Notification Service connected to RabbitMQ and listening to order_notifications...');
        
        channel.consume('order_notifications', (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log(`[x] Received notification task:`, data);
                
                // Simulate sending email or SMS notification
                setTimeout(() => {
                    console.log(`[x] Notification sent successfully to user ${data.email} for order ${data.orderId}`);
                    channel.ack(msg);
                }, 1500);
            }
        });
    } catch (error) {
        console.error('Failed to connect to RabbitMQ from Notification Service:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectRabbitMQ, 5000);
    }
}

connectRabbitMQ();
