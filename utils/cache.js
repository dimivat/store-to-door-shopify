const fs = require('fs');
const path = require('path');

// Path to the cache directory
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const ORDER_CACHE_FILE = path.join(CACHE_DIR, 'orders-cache.json');

// Ensure cache directory exists
function ensureCacheDirectory() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Initialize the cache file if it doesn't exist
function initializeCache() {
  ensureCacheDirectory();
  
  if (!fs.existsSync(ORDER_CACHE_FILE)) {
    fs.writeFileSync(ORDER_CACHE_FILE, JSON.stringify({
      lastUpdated: null,
      orders: {}
    }));
  }
}

// Get cached orders
function getCachedOrders() {
  try {
    initializeCache();
    const cacheData = fs.readFileSync(ORDER_CACHE_FILE, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    console.error('Error reading cache:', error);
    return { lastUpdated: null, orders: {} };
  }
}

// Get cached orders for a specific date
function getCachedOrdersForDate(date) {
  const cache = getCachedOrders();
  return cache.orders[date] || null;
}

// Save orders to cache
function saveOrdersToCache(date, ordersData) {
  try {
    initializeCache();
    
    // Read existing cache
    const cache = getCachedOrders();
    
    // Update cache with new data
    cache.orders[date] = ordersData;
    cache.lastUpdated = new Date().toISOString();
    
    // Write updated cache back to file
    fs.writeFileSync(ORDER_CACHE_FILE, JSON.stringify(cache, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
}

// Clear the entire cache
function clearCache() {
  try {
    initializeCache();
    fs.writeFileSync(ORDER_CACHE_FILE, JSON.stringify({
      lastUpdated: null,
      orders: {}
    }));
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

// Get cache metadata (last updated time, number of days cached)
function getCacheMetadata() {
  const cache = getCachedOrders();
  const daysCached = Object.keys(cache.orders).length;
  
  return {
    lastUpdated: cache.lastUpdated,
    daysCached,
    cacheSize: JSON.stringify(cache).length
  };
}

module.exports = {
  getCachedOrders,
  getCachedOrdersForDate,
  saveOrdersToCache,
  clearCache,
  getCacheMetadata
};
