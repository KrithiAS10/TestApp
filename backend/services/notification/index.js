const otel = require('ecommerce-otel');
otel.start({ serviceName: 'notification-service' });
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
                otel.emitLog('INFO', 'Notification task received', {
                    event: data.event,
                    'order.id': String(data.orderId),
                    'user.id': String(data.userId),
                });

                // Simulate sending email or SMS notification
                setTimeout(() => {
                    otel.emitLog('INFO', 'Notification sent', {
                        'order.id': String(data.orderId),
                        email: data.email,
                    });
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
