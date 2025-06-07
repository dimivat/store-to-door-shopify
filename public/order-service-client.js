/**
 * Order Service Client
 * 
 * This module provides a client interface to communicate with the isolated order service.
 * It handles all the communication details and provides a simple API for the main application.
 */

const ORDER_SERVICE_URL = 'http://localhost:3002';

/**
 * Fetch orders from the order service
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeChunk - Time chunk (full, first-half, second-half, etc.)
 * @param {boolean} forceRefresh - Whether to force refresh from Shopify API
 * @returns {Promise<Object>} - Orders data
 */
async function fetchOrders(date, timeChunk = 'full', forceRefresh = false) {
  try {
    const url = new URL(`${ORDER_SERVICE_URL}/api/orders`);
    url.searchParams.append('date', date);
    url.searchParams.append('timeChunk', timeChunk);
    
    if (forceRefresh) {
      url.searchParams.append('refresh', 'true');
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching orders from order service:', error);
    throw error;
  }
}

/**
 * Get cache metadata from the order service
 * @returns {Promise<Object>} - Cache metadata
 */
async function getCacheInfo() {
  try {
    const response = await fetch(`${ORDER_SERVICE_URL}/api/cache/info`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get cache info');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting cache info from order service:', error);
    throw error;
  }
}

/**
 * Clear the cache in the order service
 * @returns {Promise<Object>} - Result of the operation
 */
async function clearCache() {
  try {
    const response = await fetch(`${ORDER_SERVICE_URL}/api/cache/clear`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear cache');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error clearing cache in order service:', error);
    throw error;
  }
}

/**
 * Check if the order service is healthy
 * @returns {Promise<boolean>} - Whether the service is healthy
 */
async function isOrderServiceHealthy() {
  try {
    const response = await fetch(`${ORDER_SERVICE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Order service health check failed:', error);
    return false;
  }
}

// Export the client API
window.OrderService = {
  fetchOrders,
  getCacheInfo,
  clearCache,
  isOrderServiceHealthy
};
