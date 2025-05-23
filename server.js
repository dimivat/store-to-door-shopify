require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cache = require('./utils/cache');

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

// API endpoint to fetch orders for a specific date
app.get('/api/orders', async (req, res) => {
  try {
    const date = req.query.date;
    const forceRefresh = req.query.refresh === 'true';
    const startHour = req.query.startHour || '00';
    const endHour = req.query.endHour || '23';
    const timeChunk = req.query.timeChunk || 'full'; // 'full', 'first-half', 'second-half'
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // Generate cache key based on date and time chunk
    const cacheKey = `${date}-${timeChunk}`;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = cache.getCachedOrdersForDate(cacheKey);
      if (cachedData) {
        console.log(`Returning cached orders for date: ${date} (${timeChunk})`);
        return res.json({
          date,
          timeChunk,
          count: cachedData.count,
          hasMaxLimit: cachedData.hasMaxLimit,
          orders: cachedData.orders,
          fromCache: true
        });
      }
    }
    
    // Parse time chunk information
    let startTime, endTime, chunkDescription;
    
    // Check if the timeChunk is a custom time range in format 'HH:MM-HH:MM'
    const customTimeRangeRegex = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;
    const customTimeMatch = timeChunk.match(customTimeRangeRegex);
    
    if (customTimeMatch) {
      // Custom time range in format 'HH:MM-HH:MM'
      const [_, startHour, startMinute, endHour, endMinute] = customTimeMatch;
      startTime = `${date}T${startHour}:${startMinute}:00+10:00`;
      endTime = `${date}T${endHour}:${endMinute}:59+10:00`;
      chunkDescription = `custom range (${startHour}:${startMinute}-${endHour}:${endMinute})`;
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else if (timeChunk === 'first-half') {
      startTime = `${date}T00:00:00+10:00`;
      endTime = `${date}T11:59:59+10:00`;
      chunkDescription = 'first half of day (00:00-11:59)';
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else if (timeChunk === 'second-half') {
      startTime = `${date}T12:00:00+10:00`;
      endTime = `${date}T23:59:59+10:00`;
      chunkDescription = 'second half of day (12:00-23:59)';
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else if (timeChunk === 'morning') {
      startTime = `${date}T00:00:00+10:00`;
      endTime = `${date}T05:59:59+10:00`;
      chunkDescription = 'morning (00:00-05:59)';
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else if (timeChunk === 'business-hours') {
      startTime = `${date}T06:00:00+10:00`;
      endTime = `${date}T17:59:59+10:00`;
      chunkDescription = 'business hours (06:00-17:59)';
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else if (timeChunk === 'evening') {
      startTime = `${date}T18:00:00+10:00`;
      endTime = `${date}T23:59:59+10:00`;
      chunkDescription = 'evening (18:00-23:59)';
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    } else {
      // Default to full day
      startTime = `${date}T${startHour}:00:00+10:00`;
      endTime = `${date}T${endHour}:59:59+10:00`;
      chunkDescription = `full day (${startHour}:00-${endHour}:59)`;
      console.log(`Fetching ${chunkDescription} orders from Shopify API for date: ${date}`);
    }
    
    console.log(`Time range: ${startTime} to ${endTime}`);
    
    // For debugging, log the API request details
    const requestParams = {
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startTime,
        created_at_max: endTime,
        status: 'any',
        limit: 50
      }
    };
    
    console.log('API Request:', JSON.stringify(requestParams, null, 2));
    
    // Fetch orders from Shopify
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startTime,
        created_at_max: endTime,
        status: 'any',
        limit: 50
      }
    });
    
    const orders = response.data.orders;
    console.log(`Found ${orders.length} orders for ${date} (${timeChunk})`);
    
    // Check if we hit the limit
    const hitLimit = orders.length >= 50;
    if (hitLimit) {
      console.log(`⚠️ WARNING: Hit the 50 order limit for ${date} (${timeChunk})`);
    }
    
    // Log order timestamps to verify time filtering is working
    if (orders.length > 0) {
      console.log('First order timestamp:', orders[0].created_at);
      console.log('Last order timestamp:', orders[orders.length - 1].created_at);
    }
    
    // Prepare response data
    const responseData = {
      date,
      timeChunk,
      count: orders.length,
      hasMaxLimit: orders.length >= 50,
      fromCache: false,
      orders: orders.map(order => ({
        id: order.id,
        name: order.name,
        createdAt: order.created_at,
        status: order.financial_status,
        total: order.total_price
      }))
    };
    
    // Log the response summary
    console.log(`Response summary for ${date} (${timeChunk}):`, {
      count: responseData.count,
      hasMaxLimit: responseData.hasMaxLimit,
      timeChunk: responseData.timeChunk
    });
    
    // Save to cache
    cache.saveOrdersToCache(cacheKey, {
      count: responseData.count,
      hasMaxLimit: responseData.hasMaxLimit,
      orders: responseData.orders,
      fetchedAt: new Date().toISOString()
    });
    
    return res.json(responseData);
    
  } catch (error) {
    console.error('API Error:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      return res.status(error.response.status).json({
        error: `Shopify API Error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get cache metadata
app.get('/api/cache/info', (req, res) => {
  const cacheInfo = cache.getCacheMetadata();
  res.json(cacheInfo);
});

// API endpoint to clear cache
app.post('/api/cache/clear', (req, res) => {
  const success = cache.clearCache();
  
  if (success) {
    res.json({ success: true, message: 'Cache cleared successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

// API endpoint to get orders by delivery date (from note attributes)
app.get('/api/orders/delivery-date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const useCache = req.query.refresh !== 'true';
    
    console.log(`Fetching orders with delivery date ${date}, useCache: ${useCache}`);
    
    // Check cache first if enabled
    const cacheKey = `delivery_${date}`;
    if (useCache) {
      const cachedData = cache.getCachedOrdersForDate(cacheKey);
      if (cachedData) {
        console.log(`Using cached delivery orders for ${date}`);
        return res.json({
          date,
          orders: cachedData.orders || [],
          fromCache: true
        });
      }
    }
    
    // We need to fetch all orders and filter by note attributes
    // First, get orders from the last 30 days to search through
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Use Sydney timezone for the date range
    const startTime = thirtyDaysAgo.toISOString();
    
    console.log(`Fetching orders from Shopify API since: ${startTime}`);
    
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startTime,
        status: 'any',
        limit: 250
      }
    });
    
    // Filter orders by delivery date in note attributes
    const allOrders = response.data.orders;
    console.log(`Filtering ${allOrders.length} orders for delivery date: ${date}`);
    
    // Log all delivery dates found in orders
    console.log('All delivery dates in orders:');
    allOrders.forEach(order => {
      if (order.note_attributes && order.note_attributes.length) {
        const deliveryAttr = order.note_attributes.find(attr => 
          attr.name === 'Delivery-Date' || attr.name === 'Delivery Date' || 
          attr.name === 'delivery_date' || attr.name === 'delivery-date'
        );
        if (deliveryAttr) {
          console.log(`Order ${order.name}: ${deliveryAttr.value}`);
        }
      }
    });
    
    const deliveryOrders = allOrders.filter(order => {
      if (!order.note_attributes || !order.note_attributes.length) return false;
      
      // Look for Delivery-Date attribute
      const deliveryAttr = order.note_attributes.find(attr => 
        attr.name === 'Delivery-Date' || attr.name === 'Delivery Date' || 
        attr.name === 'delivery_date' || attr.name === 'delivery-date'
      );
      
      if (!deliveryAttr) return false;
      
      // Log the delivery date for debugging
      console.log(`Checking order ${order.name} with delivery date: ${deliveryAttr.value} against target: ${date}`);
      
      // Parse the delivery date value and check if it matches our target date
      let orderDeliveryDate = deliveryAttr.value;
      
      // Try to standardize the date format
      try {
        // If it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(orderDeliveryDate)) {
          return orderDeliveryDate === date;
        }
        
        // If it's in DD/MM/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(orderDeliveryDate)) {
          const parts = orderDeliveryDate.split('/');
          const formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          return formattedDate === date;
        }
        
        // If it's a full date string, convert to YYYY-MM-DD in Sydney timezone
        try {
          // Create a date object with the Sydney timezone offset
          let sydneyDate;
          
          // Add logging for the specific order
          if (order.name === '#36908') {
            console.log(`Processing order #36908 with delivery date: ${orderDeliveryDate}`);
          }
          
          // Handle different date formats
          if (orderDeliveryDate.includes('/')) {
            const parts = orderDeliveryDate.split('/');
            
            // Check if it's YYYY/MM/DD format (first part has 4 digits)
            if (parts[0].length === 4) {
              // It's YYYY/MM/DD format
              const year = parts[0];
              const month = parts[1];
              const day = parts[2];
              
              // Create date string in ISO format: YYYY-MM-DDT00:00:00+10:00
              const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+10:00`;
              sydneyDate = new Date(isoDateString);
              
              // Also check if the delivery date matches the requested date directly
              const formattedOrderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              // Log the comparison for all dates
              console.log(`YYYY/MM/DD format: ${orderDeliveryDate} formatted to ${formattedOrderDate}, target: ${date}`);
              
              if (formattedOrderDate === date) {
                console.log(`Direct match for YYYY/MM/DD format: ${orderDeliveryDate} matches ${date}`);
                return true;
              }
              
              // Try to match the date components directly
              const targetParts = date.split('-');
              if (targetParts.length === 3) {
                const targetYear = targetParts[0];
                const targetMonth = targetParts[1];
                const targetDay = targetParts[2];
                
                if (year === targetYear && 
                    month.padStart(2, '0') === targetMonth && 
                    day.padStart(2, '0') === targetDay) {
                  console.log(`Component match for YYYY/MM/DD format: ${orderDeliveryDate} matches ${date}`);
                  return true;
                }
              }
            } else {
              // Assume DD/MM/YYYY format (Australian format)
              const day = parts[0];
              const month = parts[1];
              const year = parts[2];
              
              // Create date string in ISO format: YYYY-MM-DDT00:00:00+10:00
              const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+10:00`;
              sydneyDate = new Date(isoDateString);
              
              // Also check if the delivery date matches the requested date directly
              const formattedOrderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              // Log the comparison for all dates
              console.log(`DD/MM/YYYY format: ${orderDeliveryDate} formatted to ${formattedOrderDate}, target: ${date}`);
              
              if (formattedOrderDate === date) {
                console.log(`Direct match for DD/MM/YYYY format: ${orderDeliveryDate} matches ${date}`);
                return true;
              }
              
              // Try to match the date components directly
              const targetParts = date.split('-');
              if (targetParts.length === 3) {
                const targetYear = targetParts[0];
                const targetMonth = targetParts[1];
                const targetDay = targetParts[2];
                
                if (year === targetYear && 
                    month.padStart(2, '0') === targetMonth && 
                    day.padStart(2, '0') === targetDay) {
                  console.log(`Component match for DD/MM/YYYY format: ${orderDeliveryDate} matches ${date}`);
                  return true;
                }
              }
            }
            
            if (order.name === '#36908') {
              console.log(`Order #36908: Processing YYYY/MM/DD format`);
              console.log(`Order #36908: Delivery date: ${orderDeliveryDate}`);
              console.log(`Order #36908: Formatted date: ${formattedOrderDate}`);
              console.log(`Order #36908: Target date: ${date}`);
              console.log(`Order #36908: Direct match: ${formattedOrderDate === date}`);
              
              try {
                console.log(`Order #36908: Date object: ${sydneyDate.toISOString()}`);
              } catch (e) {
                console.log(`Order #36908: Invalid date object`);
              }
            }
          } else if (orderDeliveryDate.includes('-')) {
            // Handle YYYY-MM-DD format
            const isoDateString = `${orderDeliveryDate}T00:00:00+10:00`;
            sydneyDate = new Date(isoDateString);
            
            if (order.name === '#36908') {
              console.log(`Order #36908: Processing YYYY-MM-DD format`);
              console.log(`Order #36908: Delivery date: ${orderDeliveryDate}`);
              console.log(`Order #36908: ISO date: ${isoDateString}`);
            }
          } else {
            // Try to parse as a regular date string
            sydneyDate = new Date(orderDeliveryDate);
            
            if (order.name === '#36908') {
              console.log(`Order #36908: Processing regular date format`);
              console.log(`Order #36908: Delivery date: ${orderDeliveryDate}`);
            }
          }
          
          if (!isNaN(sydneyDate.getTime())) {
            // Convert the target date to a Date object in Sydney timezone
            const targetDate = new Date(`${date}T00:00:00+10:00`);
            
            // Compare the dates by setting both to midnight in Sydney time
            const sydneyYear = sydneyDate.getFullYear();
            const sydneyMonth = sydneyDate.getMonth();
            const sydneyDay = sydneyDate.getDate();
            
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            const targetDay = targetDate.getDate();
            
            // Add detailed logging for order #36908
            if (order.name === '#36908') {
              console.log(`Order #36908: Comparing dates:`);
              console.log(`  Order date: ${sydneyYear}-${sydneyMonth+1}-${sydneyDay}`);
              console.log(`  Target date: ${targetYear}-${targetMonth+1}-${targetDay}`);
              console.log(`  Searching for date: ${date}`);
              console.log(`  Match: ${sydneyYear === targetYear && sydneyMonth === targetMonth && sydneyDay === targetDay}`);
            }
            
            // Compare year, month, and day
            return sydneyYear === targetYear && 
                   sydneyMonth === targetMonth && 
                   sydneyDay === targetDay;
          }
        } catch (error) {
          console.error(`Error comparing dates: ${orderDeliveryDate} with ${date}`, error);
        }
      } catch (e) {
        console.error(`Error parsing delivery date: ${orderDeliveryDate}`, e);
      }
      
      return false;
    });
    
    console.log(`Found ${deliveryOrders.length} orders with delivery date: ${date}`);
    
    // Process and format the orders
    const orders = deliveryOrders.map(order => ({
      id: order.id,
      name: order.name,
      createdAt: order.created_at,
      processedAt: order.processed_at,
      updatedAt: order.updated_at,
      cancelledAt: order.cancelled_at,
      cancelReason: order.cancel_reason,
      currency: order.currency,
      totalPrice: order.total_price,
      subtotalPrice: order.subtotal_price,
      totalTax: order.total_tax,
      totalDiscounts: order.total_discounts,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      customer: order.customer ? {
        id: order.customer.id,
        email: order.customer.email,
        phone: order.customer.phone,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name,
        ordersCount: order.customer.orders_count,
        totalSpent: order.customer.total_spent
      } : null,
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address,
      lineItems: order.line_items.map(item => ({
        id: item.id,
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        vendor: item.vendor,
        product_id: item.product_id,
        variant_id: item.variant_id,
        total_discount: item.total_discount
      })),
      shippingLines: order.shipping_lines,
      discountCodes: order.discount_codes,
      noteAttributes: order.note_attributes,
      deliveryDate: order.note_attributes.find(attr => 
        attr.name === 'Delivery-Date' || attr.name === 'Delivery Date' || 
        attr.name === 'delivery_date' || attr.name === 'delivery-date'
      )?.value,
      note: order.note,
      tags: order.tags
    }));
    
    // Cache the results
    cache.saveOrdersToCache(cacheKey, { orders, count: orders.length, timestamp: new Date().toISOString() });
    
    // Return the orders
    res.json({
      date,
      orders,
      fromCache: false
    });
    
  } catch (error) {
    console.error('Error fetching delivery orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get detailed order information for a specific date
app.get('/api/orders/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const useCache = req.query.refresh !== 'true';
    
    console.log(`Fetching detailed orders for date: ${date}, useCache: ${useCache}`);
    
    // Check cache first if enabled
    if (useCache) {
      const cachedOrders = cache.getCachedOrdersForDate(`${date}_full`);
      if (cachedOrders) {
        console.log(`Using cached orders for ${date}`);
        return res.json({
          date,
          orders: cachedOrders.orders || [],
          fromCache: true
        });
      }
    }
    
    // If not in cache or cache disabled, fetch from Shopify API
    const startTime = `${date}T00:00:00+10:00`;
    const endTime = `${date}T23:59:59+10:00`;
    
    console.log(`Fetching orders from Shopify API for date: ${date}`);
    
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/orders.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        created_at_min: startTime,
        created_at_max: endTime,
        status: 'any',
        limit: 250 // Get as many orders as possible
      }
    });
    
    const orders = response.data.orders;
    
    // Format the order data to include all relevant information
    const formattedOrders = orders.map(order => ({
      id: order.id,
      name: order.name,
      createdAt: order.created_at,
      processedAt: order.processed_at,
      updatedAt: order.updated_at,
      cancelledAt: order.cancelled_at,
      cancelReason: order.cancel_reason,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      currency: order.currency,
      subtotalPrice: order.subtotal_price,
      totalDiscounts: order.total_discounts,
      totalTax: order.total_tax,
      totalPrice: order.total_price,
      totalItems: order.line_items.length,
      customer: order.customer ? {
        id: order.customer.id,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name,
        email: order.customer.email,
        phone: order.customer.phone,
        ordersCount: order.customer.orders_count,
        totalSpent: order.customer.total_spent
      } : null,
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address,
      lineItems: order.line_items.map(item => ({
        id: item.id,
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        vendor: item.vendor,
        product_id: item.product_id,
        variant_id: item.variant_id,
        taxable: item.taxable,
        total_discount: item.total_discount
      })),
      shippingLines: order.shipping_lines,
      tags: order.tags,
      note: order.note,
      noteAttributes: order.note_attributes,
      discountCodes: order.discount_codes
    }));
    
    // Save to cache for future use
    const cacheKey = `${date}_full`;
    cache.saveOrdersToCache(cacheKey, {
      count: formattedOrders.length,
      hasMaxLimit: formattedOrders.length >= 250,
      orders: formattedOrders,
      fetchedAt: new Date().toISOString()
    });
    
    return res.json({
      date,
      orders: formattedOrders,
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching detailed orders:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Connected to Shopify store: ${SHOP_NAME}.myshopify.com`);
});
