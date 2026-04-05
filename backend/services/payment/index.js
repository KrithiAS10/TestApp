require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/process', (req, res) => {
    const { orderId, amount } = req.body;
    
    // Simulate random payment failure to test real-world scenarios (20% failure rate)
    const isSuccess = Math.random() > 0.2;
    
    setTimeout(() => {
        if (isSuccess) {
            console.log(`Payment processed successfully for order ${orderId}, amount: $${amount}`);
            res.json({ success: true, transactionId: `txn_${Math.floor(Math.random() * 1000000)}` });
        } else {
            console.error(`Payment failed for order ${orderId}, amount: $${amount}`);
            res.status(400).json({ success: false, error: 'Payment declined by processor' });
        }
    }, 1000); // simulate delay
});

app.get('/health', (req, res) => res.json({ status: 'Payment service running' }));

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Payment Service listening on port ${PORT}`));
