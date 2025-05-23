const axios = require('axios');
require('dotenv').config();

// Use environment variables for credentials
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

// List of possible shop domains to try
const possibleDomains = [
  'storetodoorau',
  'store-to-door-au',
  'store-to-door',
  'storetodoor'
];

async function checkDomain() {
  console.log('Checking for valid Shopify domain...');
  
  for (const domain of possibleDomains) {
    try {
      const response = await axios({
        url: `https://${domain}.myshopify.com/admin/api/2023-07/shop.json`,
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ Successfully connected to: ${domain}.myshopify.com`);
        console.log(`Shop name: ${response.data.shop.name}`);
        console.log(`Shop ID: ${response.data.shop.id}`);
        return domain;
      }
    } catch (error) {
      console.log(`❌ Failed to connect to: ${domain}.myshopify.com`);
    }
  }
  
  console.log('❌ Could not find a valid Shopify domain. Please check your access token.');
  return null;
}

// Run the check
checkDomain();
