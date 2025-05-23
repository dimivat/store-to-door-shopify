// Special script for Netlify deployment
// This script overrides API calls with static data when deployed on Netlify

// Debug helper function to display information on the page
function debugInfo(message) {
  console.log(message);
  
  // Create or get debug div
  let debugDiv = document.getElementById('netlify-debug');
  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'netlify-debug';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugDiv.style.color = 'white';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '5px';
    debugDiv.style.maxWidth = '400px';
    debugDiv.style.maxHeight = '200px';
    debugDiv.style.overflow = 'auto';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.fontFamily = 'monospace';
    document.body.appendChild(debugDiv);
  }
  
  // Add message
  const msgElement = document.createElement('div');
  msgElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  debugDiv.appendChild(msgElement);
  
  // Scroll to bottom
  debugDiv.scrollTop = debugDiv.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('Netlify version script loaded');
  debugInfo('Netlify version script loaded');
  
  // Check if we're running on Netlify or other production environment
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  // Debug STATIC_DATA to make sure it's loaded
  if (typeof STATIC_DATA !== 'undefined') {
    debugInfo(`STATIC_DATA loaded with ${Object.keys(STATIC_DATA.orders).length} dates`);
    // List available dates
    const availableDates = Object.keys(STATIC_DATA.orders).join(', ');
    debugInfo(`Available dates: ${availableDates}`);
  } else {
    debugInfo('ERROR: STATIC_DATA is not defined!');
  }
  
  if (isProduction) {
    console.log('Running in production mode - using static data');
    debugInfo('Running in production mode - using static data');
    
    // Override the fetchData function to always use static data in production
    window.fetchData = async function(url, options = {}) {
      console.log('Static data fetch for:', url);
      debugInfo(`Static data fetch for: ${url}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Handle different API endpoints
      if (url.includes('/api/orders/date/')) {
        const date = url.split('/').pop();
        console.log('Fetching static orders for date:', date);
        
        // Get data from STATIC_DATA if available
        // Check if we have data for this date
        if (STATIC_DATA.orders[date]) {
          console.log('Found static data for date:', date);
          debugInfo(`Found static data for date: ${date}`);
          
          const orders = STATIC_DATA.orders[date].orders || [];
          
          // Log the orders for debugging
          console.log('Static orders:', orders);
          debugInfo(`Found ${orders.length} orders for date ${date}`);
          
          return {
            ok: true,
            status: 200,
            json: async () => ({
              date,
              totalOrders: orders.length,
              orders: orders
            })
          };
        } else {
          console.log('No static data found for date:', date);
          // Return empty array if no data found
          return {
            ok: true,
            status: 200,
            json: async () => ({
              date,
              totalOrders: 0,
              orders: []
            })
          };
        }
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
