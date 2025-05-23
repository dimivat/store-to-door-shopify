require('dotenv').config();
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// Initialize Express app
const app = express();

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;

// Verify environment variables are loaded
if (!SHOP_NAME || !ACCESS_TOKEN || !API_VERSION) {
  console.error('Error: Required environment variables are missing.');
  console.error('Please make sure your .env file contains SHOPIFY_SHOP, SHOPIFY_ADMIN_ACCESS_TOKEN, and SHOPIFY_API_VERSION');
}

// Simple in-memory cache
const cache = {
  orders: {},
  lastUpdated: null,
  
  getCachedOrders() {
    return this.orders;
  },
  
  getCachedOrdersForDate(date) {
    return this.orders[date] || null;
  },
  
  saveOrdersToCache(date, ordersData) {
    this.orders[date] = ordersData;
    this.lastUpdated = new Date().toISOString();
    return true;
  },
  
  clearCache() {
    this.orders = {};
    this.lastUpdated = null;
    return true;
  },
  
  getCacheMetadata() {
    const daysCached = Object.keys(this.orders).length;
    return {
      lastUpdated: this.lastUpdated,
      daysCached,
      cacheSize: JSON.stringify(this.orders).length
    };
  }
};

// API endpoint to fetch orders for a specific date
app.get('/api/orders', async (req, res) => {
  try {
    const date = req.query.date;
    const forceRefresh = req.query.refresh === 'true';
    const startHour = req.query.startHour || '00';
    const endHour = req.query.endHour || '23';
    
    // Check if we have cached data for this date and refresh is not forced
    if (!forceRefresh) {
      const cacheKey = `${date}_${startHour}_${endHour}`;
      const cachedData = cache.getCachedOrdersForDate(cacheKey);
      
      if (cachedData) {
        console.log(`Using cached orders for ${date} (${startHour}:00 - ${endHour}:59)`);
        return res.json(cachedData);
      }
    }
    
    console.log(`Fetching orders for ${date} (${startHour}:00 - ${endHour}:59) from Shopify API`);
    
    // Format date and time for Shopify API
    const formattedDate = date.replace(/-/g, '/');
    const startTime = `${formattedDate} ${startHour}:00:00`;
    const endTime = `${formattedDate} ${endHour}:59:59`;
    
    // Fetch orders from Shopify API
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
        limit: 250
      }
    });
    
    // Process orders
    const orders = response.data.orders.map(order => ({
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
      discountCodes: order.discount_codes || [],
      noteAttributes: order.note_attributes || [],
      note: order.note
    }));
    
    // Prepare response data
    const responseData = {
      date,
      startHour,
      endHour,
      totalOrders: orders.length,
      orders,
      fromCache: false
    };
    
    // Cache the results
    const cacheKey = `${date}_${startHour}_${endHour}`;
    cache.saveOrdersToCache(cacheKey, responseData);
    
    // Return the orders
    res.json(responseData);
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get orders by date range
app.get('/api/orders/range', async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const forceRefresh = req.query.refresh === 'true';
    
    // Check if we have cached data for this range and refresh is not forced
    if (!forceRefresh) {
      const cacheKey = `range_${startDate}_${endDate}`;
      const cachedData = cache.getCachedOrdersForDate(cacheKey);
      
      if (cachedData) {
        console.log(`Using cached orders for range ${startDate} to ${endDate}`);
        return res.json(cachedData);
      }
    }
    
    console.log(`Fetching orders for range ${startDate} to ${endDate} from Shopify API`);
    
    // Format dates for Shopify API
    const formattedStartDate = startDate.replace(/-/g, '/');
    const formattedEndDate = endDate.replace(/-/g, '/');
    const startTime = `${formattedStartDate} 00:00:00`;
    const endTime = `${formattedEndDate} 23:59:59`;
    
    // Fetch orders from Shopify API
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
        limit: 250
      }
    });
    
    // Process orders
    const orders = response.data.orders.map(order => ({
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
      discountCodes: order.discount_codes || [],
      noteAttributes: order.note_attributes || [],
      note: order.note
    }));
    
    // Group orders by date
    const ordersByDate = {};
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split('T')[0];
      
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = [];
      }
      
      ordersByDate[dateKey].push(order);
    });
    
    // Prepare response data
    const responseData = {
      startDate,
      endDate,
      totalOrders: orders.length,
      ordersByDate,
      fromCache: false
    };
    
    // Cache the results
    const cacheKey = `range_${startDate}_${endDate}`;
    cache.saveOrdersToCache(cacheKey, responseData);
    
    // Return the orders
    res.json(responseData);
    
  } catch (error) {
    console.error('Error fetching orders by range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get cache info
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
    
    console.log(`Fetching orders for delivery date: ${date}, useCache: ${useCache}`);
    
    // Check cache first if enabled
    const cacheKey = `delivery_${date}`;
    if (useCache) {
      const cachedData = cache.getCachedOrdersForDate(cacheKey);
      if (cachedData) {
        console.log(`Using cached orders for delivery date ${date}`);
        return res.json(cachedData);
      }
    }
    
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
    
    const deliveryOrders = allOrders.filter(order => {
      if (!order.note_attributes || !order.note_attributes.length) return false;
      
      // Look for Delivery-Date attribute
      const deliveryAttr = order.note_attributes.find(attr => 
        attr.name === 'Delivery-Date' || attr.name === 'Delivery Date' || 
        attr.name === 'delivery_date' || attr.name === 'delivery-date'
      );
      
      if (!deliveryAttr) return false;
      
      // Parse the delivery date value and check if it matches our target date
      let orderDeliveryDate = deliveryAttr.value;
      
      try {
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
            
            if (formattedOrderDate === date) {
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
            
            if (formattedOrderDate === date) {
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
                return true;
              }
            }
          }
        } else if (orderDeliveryDate.includes('-')) {
          // Handle YYYY-MM-DD format
          const isoDateString = `${orderDeliveryDate}T00:00:00+10:00`;
          sydneyDate = new Date(isoDateString);
          
          if (orderDeliveryDate === date) {
            return true;
          }
        } else {
          // Try to parse as a regular date string
          sydneyDate = new Date(orderDeliveryDate);
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
          
          // Compare year, month, and day
          return sydneyYear === targetYear && 
                 sydneyMonth === targetMonth && 
                 sydneyDay === targetDay;
        }
      } catch (error) {
        console.error(`Error comparing dates: ${orderDeliveryDate} with ${date}`, error);
      }
      
      return false;
    });
    
    console.log(`Found ${deliveryOrders.length} orders with delivery date: ${date}`);
    
    // Process and format the orders
    const orders = deliveryOrders.map(order => {
      const deliveryAttr = order.note_attributes.find(attr => 
        attr.name === 'Delivery-Date' || attr.name === 'Delivery Date' || 
        attr.name === 'delivery_date' || attr.name === 'delivery-date'
      );
      
      return {
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
        discountCodes: order.discount_codes || [],
        noteAttributes: order.note_attributes || [],
        deliveryDate: deliveryAttr ? deliveryAttr.value : null,
        note: order.note
      };
    });
    
    // Prepare response data
    const responseData = {
      date,
      totalOrders: orders.length,
      orders,
      fromCache: false
    };
    
    // Cache the results
    cache.saveOrdersToCache(cacheKey, responseData);
    
    // Return the orders
    res.json(responseData);
    
  } catch (error) {
    console.error('Error fetching orders by delivery date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for orders to place
app.get('/api/orders/to-place/:date', (req, res) => {
  // Mock data for orders to place
  const mockData = {
    regularOrders: [
      { id: 1001, name: '#1001', deliveryDate: '2025-05-24', customer: { firstName: 'John', lastName: 'Doe' } },
      { id: 1002, name: '#1002', deliveryDate: '2025-05-24', customer: { firstName: 'Jane', lastName: 'Smith' } }
    ],
    specialNoticeOrders: [
      { id: 1003, name: '#1003', deliveryDate: '2025-05-25', customer: { firstName: 'Robert', lastName: 'Johnson' } }
    ]
  };
  
  res.json(mockData);
});

// For Netlify Functions, we need to export a handler function
const handler = serverless(app);

exports.handler = async (event, context) => {
  // Log the request for debugging
  console.log('Request event:', event);
  
  // Return the response from the Express app
  return await handler(event, context);
};
