require('dotenv').config();
const axios = require('axios');

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP || 'store-to-door-au';
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-07';

async function testConnection() {
  try {
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/shop.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Successfully connected to Shopify store!');
    console.log(`Shop name: ${response.data.shop.name}`);
    console.log(`Shop ID: ${response.data.shop.id}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Shopify store:');
    console.error(error.message);
    return false;
  }
}

// Run the test
testConnection();
