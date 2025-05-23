require('dotenv').config();
const axios = require('axios');

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP || 'store-to-door-au';
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-07';

// The specific date to check
const TARGET_DATE = '2025-04-11';

// Time chunks to check
const TIME_CHUNKS = [
  { name: 'Full Day', start: '00:00:00', end: '23:59:59' },
  { name: 'Morning (00:00-05:59)', start: '00:00:00', end: '05:59:59' },
  { name: 'Business Hours (06:00-17:59)', start: '06:00:00', end: '17:59:59' },
  { name: 'Evening (18:00-23:59)', start: '18:00:00', end: '23:59:59' }
];

// Hours for detailed hourly breakdown
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return {
    name: `Hour ${hour}:00-${hour}:59`,
    start: `${hour}:00:00`,
    end: `${hour}:59:59`
  };
});

// Main function to check orders for the specific date
async function checkOrdersForDate() {
  console.log(`\n=== Checking orders for ${TARGET_DATE} ===\n`);
  
  // Track unique order IDs to detect duplicates
  const uniqueOrderIds = new Set();
  const orderDetails = new Map(); // Map to store order details for duplicate analysis
  
  try {
    // First check the full day
    console.log('Checking full day...');
    const fullDayResult = await fetchOrdersForTimeRange(TARGET_DATE, '00:00:00', '23:59:59');
    
    // Store full day orders for reference
    const fullDayOrders = new Set(fullDayResult.orders.map(order => order.id));
    
    if (fullDayResult.hasMaxLimit) {
      console.log(`\n⚠️ Found ${fullDayResult.count} orders for the full day (hit the limit). Breaking down by time periods...\n`);
      
      // Check each time chunk
      let totalOrders = 0;
      let timeChunksWithMaxLimit = 0;
      let totalUniqueOrders = 0;
      
      // Check morning, business hours, and evening
      for (const chunk of TIME_CHUNKS.slice(1)) { // Skip the full day
        console.log(`\nChecking ${chunk.name}...`);
        const chunkResult = await fetchOrdersForTimeRange(TARGET_DATE, chunk.start, chunk.end);
        
        // Track unique orders in this chunk
        let chunkUniqueCount = 0;
        for (const order of chunkResult.orders) {
          if (!uniqueOrderIds.has(order.id)) {
            uniqueOrderIds.add(order.id);
            chunkUniqueCount++;
            totalUniqueOrders++;
            
            // Store order details
            orderDetails.set(order.id, {
              name: order.name,
              createdAt: order.createdAt,
              timeChunk: chunk.name
            });
          }
        }
        
        if (!chunkResult.hasMaxLimit) {
          totalOrders += chunkResult.count;
          console.log(`✅ ${chunk.name}: ${chunkResult.count} orders (${chunkUniqueCount} unique)`);
        } else {
          console.log(`⚠️ ${chunk.name}: ${chunkResult.count} orders (${chunkUniqueCount} unique) (hit the limit). Breaking down by hours...`);
          timeChunksWithMaxLimit++;
          
          // Determine which hours to check based on the time chunk
          const startHour = parseInt(chunk.start.split(':')[0]);
          const endHour = parseInt(chunk.end.split(':')[0]);
          
          // Check each hour in this time chunk
          for (let h = startHour; h <= endHour; h++) {
            const hour = HOURS[h];
            const hourResult = await fetchOrdersForTimeRange(TARGET_DATE, hour.start, hour.end);
            totalOrders += hourResult.count;
            
            // Track unique orders in this hour
            let hourUniqueCount = 0;
            for (const order of hourResult.orders) {
              if (!uniqueOrderIds.has(order.id)) {
                uniqueOrderIds.add(order.id);
                hourUniqueCount++;
                totalUniqueOrders++;
                
                // Store order details
                orderDetails.set(order.id, {
                  name: order.name,
                  createdAt: order.createdAt,
                  timeChunk: hour.name
                });
              }
            }
            
            if (hourResult.hasMaxLimit) {
              console.log(`  ⚠️ ${hour.name}: ${hourResult.count} orders (${hourUniqueCount} unique) (hit the limit)`);
            } else {
              console.log(`  ✅ ${hour.name}: ${hourResult.count} orders (${hourUniqueCount} unique)`);
            }
          }
        }
      }
      
      console.log(`\n=== Summary for ${TARGET_DATE} ===`);
      console.log(`Raw total (sum of all chunks): ${totalOrders}`);
      console.log(`Unique orders found: ${uniqueOrderIds.size}`);
      console.log(`Unique orders after deduplication: ${totalUniqueOrders}`);
      
      if (totalOrders !== totalUniqueOrders) {
        console.log(`\n⚠️ Detected ${totalOrders - totalUniqueOrders} duplicate orders in the count!`);
      }
      
      if (timeChunksWithMaxLimit > 0) {
        console.log(`⚠️ Warning: ${timeChunksWithMaxLimit} time chunks hit the 50 order limit.`);
      } else {
        console.log(`✅ All orders successfully retrieved!`);
      }
    } else {
      console.log(`✅ Found ${fullDayResult.count} orders for the full day (under the limit).`);
      console.log(`\n=== Summary for ${TARGET_DATE} ===`);
      console.log(`Total orders: ${fullDayResult.count}`);
      console.log(`Unique orders: ${fullDayResult.count}`);
    }
  } catch (error) {
    console.error('Error checking orders:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.statusText);
      console.error('Error details:', error.response.data);
    }
  }
}

// Function to fetch orders for a specific time range
async function fetchOrdersForTimeRange(date, startTime, endTime) {
  const startDateTime = `${date}T${startTime}+10:00`;
  const endDateTime = `${date}T${endTime}+10:00`;
  
  try {
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startDateTime,
        created_at_max: endDateTime,
        status: 'any',
        limit: 50
      }
    });
    
    const orders = response.data.orders;
    const hasMaxLimit = orders.length >= 50;
    
    return {
      count: orders.length,
      hasMaxLimit,
      orders: orders.map(order => ({
        id: order.id,
        name: order.name,
        createdAt: order.created_at,
        total: order.total_price
      }))
    };
  } catch (error) {
    console.error(`Error fetching orders for ${date} (${startTime}-${endTime}):`, error.message);
    throw error;
  }
}

// Run the check
checkOrdersForDate();
