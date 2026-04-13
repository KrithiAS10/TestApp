require('ecommerce-otel').start({ serviceName: 'api-gateway' });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors());
app.use(morgan('dev'));

// Routing configuration (override with *_SERVICE_URL for Docker / k8s)
const routes = {
    '/users': process.env.USER_SERVICE_URL || 'http://localhost:3001',
    '/products': process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    '/inventory': process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    '/orders': process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    '/payment': process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005'
};

for (const [path, target] of Object.entries(routes)) {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            [`^${path}`]: '',
        },
    }));
}

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway listening on port ${PORT}`);
});
