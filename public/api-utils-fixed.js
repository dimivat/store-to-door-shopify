// Utility functions for API calls

// Check if we're running on Netlify (production)
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Function to get the correct API base URL based on the environment
function getApiBaseUrl() {
  if (isProduction) {
    return '/.netlify/functions/api';
  }
  
  // Local development
  return '';
}

// Function to format API URLs
function formatApiUrl(endpoint) {
  const baseUrl = getApiBaseUrl();
  
  // If the endpoint already starts with a slash, we need to handle it
  if (endpoint.startsWith('/')) {
    return `${baseUrl}${endpoint}`;
  }
  
  return `${baseUrl}/${endpoint}`;
}

// Function to fetch data - uses static data in production, real API in development
async function fetchData(url, options = {}) {
  // If we're in production (Netlify), use static data
  if (isProduction) {
    console.log('Using static data for:', url);
    return mockApiResponse(url);
  }
  
  // Otherwise, use the real API
  return fetch(url, options);
}

// Function to simulate API responses with static data
async function mockApiResponse(url) {
  // Wait a short time to simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Parse the URL to determine what data to return
  if (url.includes('/api/orders/date/')) {
    const date = url.split('/').pop();
    return createMockResponse({
      date,
      totalOrders: STATIC_DATA.orders[date]?.orders.length || 0,
      orders: STATIC_DATA.orders[date]?.orders || []
    });
  }
  
  if (url.includes('/api/orders/delivery-date/')) {
    const date = url.split('/').pop();
    return createMockResponse(STATIC_DATA.orders[date] || { date, totalOrders: 0, orders: [] });
  }
  
  if (url.includes('/api/orders/to-place/')) {
    return createMockResponse(STATIC_DATA.ordersToPlace);
  }
  
  if (url.includes('/api/cache/info')) {
    return createMockResponse(STATIC_DATA.cacheInfo);
  }
  
  // Default empty response
  return createMockResponse({ error: 'No mock data available for this endpoint' });
}

// Helper to create a mock Response object
function createMockResponse(data) {
  return {
    ok: true,
    status: 200,
    json: async () => data
  };
}
