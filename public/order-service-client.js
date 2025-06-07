/**
 * Order Service Client
 * 
 * This module provides a client interface to communicate with the isolated order service.
 * All dates are handled in Sydney timezone (Australia/Sydney).
 */

const ORDER_SERVICE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3002'
  : window.location.origin;

const TIMEZONE = 'Australia/Sydney';

/**
 * Format a date to Sydney timezone
 * @param {Date|string} date - Date to format
 * @returns {string} - Date formatted in Sydney timezone
 */
function formatDateToSydney(date) {
  return new Date(date).toLocaleDateString('en-AU', { timeZone: TIMEZONE });
}

/**
 * Get current date in Sydney timezone
 * @returns {string} - Current date in Sydney timezone
 */
function getCurrentSydneyDate() {
  return new Date().toLocaleDateString('en-AU', { timeZone: TIMEZONE });
}

/**
 * Client for interacting with the order service
 */
class OrderServiceClient {
  /**
   * Create a new OrderServiceClient instance
   */
  constructor() {
    this.baseUrl = ORDER_SERVICE_URL;
  }

  /**
   * Fetch orders from the order service
   * @param {string} date - Date in YYYY-MM-DD format (defaults to current Sydney date)
   * @param {string} timeChunk - Time chunk (full, first-half, second-half, etc.)
   * @param {boolean} forceRefresh - Whether to force refresh from Shopify API
   * @returns {Promise<Object>} - Orders data
   */
  async getOrders(date = getCurrentSydneyDate(), timeChunk = 'full', forceRefresh = false) {
    try {
      // Ensure date is in Sydney timezone
      const sydneyDate = formatDateToSydney(date);
      
      const url = new URL('/api/orders', this.baseUrl);
      url.searchParams.append('date', sydneyDate);
      url.searchParams.append('timeChunk', timeChunk);
      
      if (forceRefresh) {
        url.searchParams.append('refresh', 'true');
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }
      
      const data = await response.json();
      return {
        ...data,
        date: sydneyDate, // Ensure the returned date is in Sydney timezone
        fromCache: data.fromCache || false
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get cache metadata from the order service
   * @returns {Promise<Object>} - Cache metadata with Sydney timezone dates
   */
  async getCacheInfo() {
    try {
      const response = await fetch(new URL('/api/cache/info', this.baseUrl));
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get cache info');
      }
      
      const data = await response.json();
      return {
        ...data,
        lastUpdated: data.lastUpdated ? formatDateToSydney(data.lastUpdated) : null
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      throw error;
    }
  }

  /**
   * Clear the cache in the order service
   * @returns {Promise<Object>} - Result of the operation
   */
  async clearCache() {
    try {
      const response = await fetch(new URL('/api/cache/clear', this.baseUrl), {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cache');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Check if the order service is healthy
   * @returns {Promise<boolean>} - Whether the service is healthy
   */
  async isHealthy() {
    try {
      const response = await fetch(new URL('/health', this.baseUrl));
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
const orderService = new OrderServiceClient();
export default orderService;
