require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors());
app.use(morgan('dev'));

// Routing configuration
const routes = {
    '/users': 'http://localhost:3001',
    '/products': 'http://localhost:3002',
    '/inventory': 'http://localhost:3003',
    '/orders': 'http://localhost:3004',
    '/payment': 'http://localhost:3005'
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
