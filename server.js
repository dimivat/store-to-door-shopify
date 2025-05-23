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
  try {
    const metadata = cache.getCacheMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error getting cache info:', error);
    res.status(500).json({ error: 'Failed to get cache info' });
  }
});

// API endpoint to clear the cache
app.post('/api/cache/clear', (req, res) => {
  try {
    const success = cache.clearCache();
    if (success) {
      res.json({ message: 'Cache cleared successfully' });
    } else {
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Connected to Shopify store: ${SHOP_NAME}.myshopify.com`);
});
