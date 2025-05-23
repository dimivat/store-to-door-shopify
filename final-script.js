require('dotenv').config();
const axios = require('axios');

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

/**
 * Fetches today's orders from Shopify Admin API
 */
async function fetchTodaysOrders() {
  try {
    console.log('Shopify Order Fetcher');
    console.log('====================');
    console.log('Shop:', SHOP_NAME);
    
    // Get today's date in ISO format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    console.log('Date filter:', formattedDate);
    
    // Verify shop connection
    console.log('\nVerifying shop connection...');
    const shopResponse = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/shop.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Connected to shop:', shopResponse.data.shop.name);
    
    // Fetch orders
    console.log('\nFetching today\'s orders...');
    const ordersResponse = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: `${formattedDate}T00:00:00+10:00`,
        status: 'any',
        limit: 50
      }
    });
    
    // Display order summary
    const orders = ordersResponse.data.orders;
    console.log(`\n✅ Found ${orders.length} orders for today (${formattedDate})`);
    
    // Display order details
    displayOrderSummary(orders);
    
    return orders;
  } catch (error) {
    console.error('\n❌ Error occurred:');
    
    if (error.response) {
      console.error(`API Error (${error.response.status}): ${error.response.statusText}`);
      
      if (error.response.data && error.response.data.errors) {
        console.error('Details:', error.response.data.errors);
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return null;
  }
}

/**
 * Displays a summary of the orders
 * @param {Array} orders - The orders to display
 */
function displayOrderSummary(orders) {
  if (orders.length === 0) {
    console.log('No orders found for today.');
    return;
  }
  
  console.log('\nOrder Summary:');
  console.log('=============');
  
  orders.forEach((order, index) => {
    console.log(`\n----- Order ${index + 1} -----`);
    console.log(`Order #: ${order.name} (ID: ${order.id})`);
    console.log(`Created: ${new Date(order.created_at).toLocaleString()}`);
    console.log(`Status: ${order.financial_status} / ${order.fulfillment_status || 'unfulfilled'}`);
    console.log(`Total: ${order.total_price} ${order.currency}`);
    
    if (order.customer) {
      console.log(`Customer: ${order.customer.first_name} ${order.customer.last_name}`);
      console.log(`Contact: ${order.customer.email || 'N/A'} / ${order.customer.phone || 'N/A'}`);
    }
    
    if (order.shipping_address) {
      console.log('Shipping:');
      console.log(`  ${order.shipping_address.name}`);
      console.log(`  ${order.shipping_address.address1}`);
      if (order.shipping_address.address2) console.log(`  ${order.shipping_address.address2}`);
      console.log(`  ${order.shipping_address.city}, ${order.shipping_address.province} ${order.shipping_address.zip}`);
      console.log(`  ${order.shipping_address.country}`);
    }
    
    console.log('Items:');
    order.line_items.forEach(item => {
      console.log(`  - ${item.quantity}x ${item.name} (${item.vendor || 'Unknown vendor'})`);
      console.log(`    Price: ${item.price} ${order.currency}`);
    });
  });
}

// Execute the function
fetchTodaysOrders();
