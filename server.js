require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;

// Verify environment variables are loaded
if (!SHOP_NAME || !ACCESS_TOKEN || !API_VERSION) {
  console.error('Error: Required environment variables are missing.');
  console.error('Please make sure your .env file contains SHOPIFY_SHOP, SHOPIFY_ADMIN_ACCESS_TOKEN, and SHOPIFY_API_VERSION');
  process.exit(1);
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for orders - forwards requests to the isolated order service
app.get('/api/orders', async (req, res) => {
  try {
    // Forward the request to the order service
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
    const response = await axios({
      url: `${orderServiceUrl}/api/orders`,
      method: 'GET',
      params: req.query
    });
    
    // Return the response from the order service
    return res.json(response.data);
  } catch (error) {
    console.error('Error proxying to order service:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: `Order Service Error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to communicate with order service. Make sure the order service is running.'
    });
  }
});

// Proxy endpoint for cache info - forwards requests to the isolated order service
app.get('/api/cache/info', async (req, res) => {
  try {
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.get(`${orderServiceUrl}/api/cache/info`);
    res.json(response.data);
  } catch (error) {
    console.error('Error getting cache info from order service:', error);
    res.status(500).json({ error: 'Failed to get cache info from order service' });
  }
});

// Proxy endpoint for clearing cache - forwards requests to the isolated order service
app.post('/api/cache/clear', async (req, res) => {
  try {
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.post(`${orderServiceUrl}/api/cache/clear`);
    res.json(response.data);
  } catch (error) {
    console.error('Error clearing cache in order service:', error);
    res.status(500).json({ error: 'Failed to clear cache in order service' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'main-application' });
});

// Order service health check endpoint
app.get('/api/order-service/health', async (req, res) => {
  try {
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.get(`${orderServiceUrl}/health`);
    res.json({ status: 'ok', orderServiceStatus: response.data });
  } catch (error) {
    console.error('Order service health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      error: 'Order service is not available',
      message: 'Please make sure the order service is running on the configured URL'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Main Application running at http://localhost:${PORT}`);
  console.log(`Connected to Shopify store: ${SHOP_NAME}.myshopify.com`);
  console.log(`Using Order Service at: ${process.env.ORDER_SERVICE_URL || 'http://localhost:3002'}`);
});
