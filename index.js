require('dotenv').config();
const axios = require('axios');

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP || 'store-to-door-au';
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-07';

async function fetchTodaysOrders() {
  try {
    // Calculate today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    console.log(`Fetching orders from ${startOfDay} to ${endOfDay}`);
    
    // Make the API request
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startOfDay,
        created_at_max: endOfDay,
        status: 'any',
        limit: 50
      }
    });
    
    const orders = response.data.orders;
    
    console.log(`✅ Successfully fetched ${orders.length} orders for today`);
    
    if (orders.length === 0) {
      console.log('No orders found for today.');
      return;
    }
    
    // Display order details
    orders.forEach(order => {
      console.log('\n-----------------------------------');
      console.log(`Order #${order.name} (ID: ${order.id})`);
      console.log(`Created at: ${order.created_at}`);
      console.log(`Financial Status: ${order.financial_status}`);
      console.log(`Fulfillment Status: ${order.fulfillment_status || 'unfulfilled'}`);
      console.log(`Total: ${order.total_price} ${order.currency}`);
      
      if (order.customer) {
        console.log('\nCustomer:');
        console.log(`Name: ${order.customer.first_name} ${order.customer.last_name}`);
        console.log(`Email: ${order.customer.email}`);
      }
      
      if (order.shipping_address) {
        console.log('\nShipping Address:');
        console.log(`${order.shipping_address.address1}`);
        if (order.shipping_address.address2) {
          console.log(`${order.shipping_address.address2}`);
        }
        console.log(`${order.shipping_address.city}, ${order.shipping_address.province} ${order.shipping_address.zip}`);
        console.log(`${order.shipping_address.country}`);
      }
      
      console.log('\nLine Items:');
      order.line_items.forEach(item => {
        console.log(`- ${item.quantity}x ${item.name} (${item.price} ${order.currency} each)`);
      });
      console.log('-----------------------------------');
    });
    
    return orders;
  } catch (error) {
    console.error('❌ Error fetching orders:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// Run the function
fetchTodaysOrders();
