// Special script for Netlify deployment
// This script overrides API calls with static data when deployed on Netlify

document.addEventListener('DOMContentLoaded', function() {
  console.log('Netlify version script loaded');
  
  // Check if we're running on Netlify or other production environment
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    console.log('Running in production mode - using static data');
    
    // Override the fetchData function to always use static data in production
    window.fetchData = async function(url, options = {}) {
      console.log('Static data fetch for:', url);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Handle different API endpoints
      if (url.includes('/api/orders/date/')) {
        const date = url.split('/').pop();
        console.log('Fetching static orders for date:', date);
        
        // Get data from STATIC_DATA if available
        const orders = STATIC_DATA.orders[date]?.orders || [];
        
        return {
          ok: true,
          status: 200,
          json: async () => ({
            date,
            totalOrders: orders.length,
            orders: orders
          })
        };
      }
      
      if (url.includes('/api/orders/delivery-date/')) {
        const date = url.split('/').pop();
        console.log('Fetching static delivery orders for date:', date);
        
        return {
          ok: true,
          status: 200,
          json: async () => STATIC_DATA.orders[date] || { date, totalOrders: 0, orders: [] }
        };
      }
      
      if (url.includes('/api/orders/to-place/')) {
        console.log('Fetching static orders to place');
        
        return {
          ok: true,
          status: 200,
          json: async () => STATIC_DATA.ordersToPlace
        };
      }
      
      if (url.includes('/api/cache/info')) {
        console.log('Fetching static cache info');
        
        return {
          ok: true,
          status: 200,
          json: async () => STATIC_DATA.cacheInfo
        };
      }
      
      if (url.includes('/api/cache/clear')) {
        console.log('Mock clearing cache');
        
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Cache cleared successfully' })
        };
      }
      
      // Default response for any other endpoints
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: 'Static data not available for this endpoint' })
      };
    };
    
    // Also override the regular fetch function as a fallback
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.includes('/api/')) {
        console.log('Intercepting fetch call to API:', url);
        return window.fetchData(url, options);
      }
      
      // Pass through non-API calls to the original fetch
      return originalFetch(url, options);
    };
  }
});
