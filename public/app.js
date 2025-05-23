document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const getOrdersBtn = document.getElementById('getOrdersBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const useCacheCheckbox = document.getElementById('useCache');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const totalOrdersEl = document.getElementById('totalOrders');
  const daysProcessedEl = document.getElementById('daysProcessed');
  const currentDayEl = document.getElementById('currentDay');
  const alertsPanelEl = document.getElementById('alertsPanel');
  const dailyCountsEl = document.getElementById('dailyCounts');
  const cacheLastUpdatedEl = document.getElementById('cacheLastUpdated');
  const cacheDaysCountEl = document.getElementById('cacheDaysCount');
  
  // State variables
  let isLoading = false;
  let isCancelled = false;
  let totalOrders = 0;
  let daysProcessed = 0;
  let daysWithMaxOrders = 0;
  const TOTAL_DAYS = 60;
  const MAX_ORDERS_PER_DAY = 50;
  const ordersByDate = {};
  
  // Event listeners
  getOrdersBtn.addEventListener('click', fetchOrders);
  cancelBtn.addEventListener('click', cancelFetch);
  clearCacheBtn.addEventListener('click', clearCache);
  
  // Load cache info when page loads
  loadCacheInfo();
  
  // Function to cancel the fetch process
  function cancelFetch() {
    if (!isLoading) return;
    
    isCancelled = true;
    addAlert('info', 'Cancelling order retrieval process... Please wait for the current request to complete.');
    cancelBtn.textContent = 'Cancelling...';
    cancelBtn.disabled = true;
  }
  
  // Main function to fetch orders for the last 60 days
  async function fetchOrders() {
    if (isLoading) return;
    
    // Reset UI and state
    resetUI();
    isCancelled = false;
    setLoading(true);
    cancelBtn.disabled = false;
    
    try {
      // Calculate date range (last 60 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - TOTAL_DAYS + 1);
      
      addAlert('info', `Starting to fetch orders from ${formatDate(startDate)} to ${formatDate(endDate)}...`);
      
      // Process each day one at a time
      for (let i = 0; i < TOTAL_DAYS; i++) {
        // Check if the operation was cancelled
        if (isCancelled) {
          addAlert('warning', 'Order retrieval cancelled by user.');
          console.log('Order retrieval cancelled by user.');
          break;
        }
        
        const currentDate = new Date(endDate);
        currentDate.setDate(endDate.getDate() - i);
        
        const formattedDate = formatDate(currentDate);
        updateCurrentDay(formattedDate);
        
        try {
          // Determine if we should use cache
          const useCache = useCacheCheckbox.checked;
          
          // First try to fetch the full day
          const fullDayOrders = await fetchOrdersForTimeChunk(formattedDate, 'full', useCache);
          let totalDayOrders = fullDayOrders.count;
          let dayHasMaxLimit = fullDayOrders.hasMaxLimit;
          let orders = fullDayOrders.orders;
          
          // If we hit the limit, use recursive time-chunking to get all orders
          if (fullDayOrders.hasMaxLimit) {
            addAlert('info', `${formattedDate}: Found ${fullDayOrders.count} orders (limit reached). Starting recursive time-chunking...`);
            
            // Use our recursive time-chunking strategy
            const { orders: recursiveOrders, totalCount, chunksWithMaxLimit } = await fetchOrdersWithRecursiveSplitting(formattedDate, useCache);
            
            // Update the total count
            totalDayOrders = totalCount;
            
            // Check if any chunks still hit the limit
            dayHasMaxLimit = chunksWithMaxLimit > 0;
            
            // Log the results
            console.log(`Combined total for ${formattedDate}: ${totalDayOrders} orders from recursive time-chunking`);
            
            // Add an alert showing the combined total
            addAlert('success', `${formattedDate}: Successfully retrieved ${totalDayOrders} orders using recursive time-chunking`);
            
            if (dayHasMaxLimit) {
              addAlert('warning', `${formattedDate}: Found ${chunksWithMaxLimit} time chunks that still hit the 50 order limit. Some orders may be missing.`);
            }
          }
          
          // Store order data
          ordersByDate[formattedDate] = {
            count: totalDayOrders,
            hasMaxLimit: dayHasMaxLimit
          };
          
          // Update counts
          totalOrders += totalDayOrders;
          daysProcessed++;
          
          if (dayHasMaxLimit) {
            daysWithMaxOrders++;
          }
          
          // Update UI
          updateStats(totalOrders, daysProcessed);
          addDayCard(formattedDate, totalDayOrders, dayHasMaxLimit, false, false);
          
          console.log(`Processed ${formattedDate}: ${totalDayOrders} orders`);
        } catch (dayError) {
          console.error(`Error fetching orders for ${formattedDate}:`, dayError);
          addAlert('danger', `Error fetching orders for ${formattedDate}: ${dayError.message}`);
          
          // Still count this day as processed
          daysProcessed++;
          updateStats(totalOrders, daysProcessed);
          addDayCard(formattedDate, 0, false, true);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Processing complete - success message will be shown in the finally block
      
    } catch (error) {
      console.error('Error in fetch process:', error);
      addAlert('danger', `Error: ${error.message}`);
    } finally {
      // Add a completion summary if not cancelled
      if (!isCancelled) {
        const summaryMessage = `Successfully retrieved ${totalOrders} orders from the last ${daysProcessed} days.`;
        const limitMessage = daysWithMaxOrders > 0 ? 
          ` Found ${daysWithMaxOrders} days that required splitting into time chunks.` : 
          '';
        
        addAlert('success', summaryMessage + limitMessage);
      } else {
        // Add a cancellation summary
        addAlert('info', `Retrieval cancelled after processing ${daysProcessed} days and retrieving ${totalOrders} orders.`);
      }
      
      // Reset loading state
      setLoading(false);
    }
  }
  
  // Recursive time-chunking function to handle days with more than 50 orders
  async function fetchOrdersWithRecursiveSplitting(date, useCache) {
    // Initial time chunks to try
    const initialChunks = [
      { name: 'morning', label: 'Morning (00:00-05:59)' },
      { name: 'business-hours', label: 'Business Hours (06:00-17:59)' },
      { name: 'evening', label: 'Evening (18:00-23:59)' }
    ];
    
    // Track unique order IDs to prevent double-counting
    const uniqueOrderIds = new Set();
    let totalCount = 0;
    let chunksWithMaxLimit = 0;
    
    // Process each initial time chunk
    for (const chunk of initialChunks) {
      if (isCancelled) break;
      
      // Fetch orders for this chunk
      const chunkResult = await fetchOrdersForTimeChunk(date, chunk.name, useCache);
      
      // Get the order IDs from this chunk
      const orderIds = chunkResult.orders.map(order => order.id);
      
      // Count unique orders in this chunk
      let uniqueOrdersInChunk = 0;
      for (const orderId of orderIds) {
        if (!uniqueOrderIds.has(orderId)) {
          uniqueOrderIds.add(orderId);
          uniqueOrdersInChunk++;
        }
      }
      
      // Only add to the UI if we're not going to split this chunk further
      if (!chunkResult.hasMaxLimit) {
        // Add to the UI with the unique count
        addDayCard(`${date} (${chunk.label})`, uniqueOrdersInChunk, chunkResult.hasMaxLimit, false, chunkResult.fromCache);
        totalCount += uniqueOrdersInChunk;
      }
      
      // If this chunk hit the limit, we need to split it further
      if (chunkResult.hasMaxLimit) {
        chunksWithMaxLimit++;
        
        // Determine the time range for this chunk
        let startHour, endHour;
        switch(chunk.name) {
          case 'morning':
            startHour = 0;
            endHour = 5;
            break;
          case 'business-hours':
            startHour = 6;
            endHour = 17;
            break;
          case 'evening':
            startHour = 18;
            endHour = 23;
            break;
        }
        
        // Split this chunk into hourly chunks
        addAlert('info', `${date}: ${chunk.label} has ${chunkResult.count} orders (limit reached). Splitting into hourly chunks...`);
        
        // Process each hour in this chunk
        for (let hour = startHour; hour <= endHour; hour++) {
          if (isCancelled) break;
          
          // Format the hour for display
          const hourFormatted = hour.toString().padStart(2, '0');
          
          // Create a custom time chunk for this hour
          const hourlyChunk = `${hourFormatted}:00-${hourFormatted}:59`;
          const hourlyResult = await fetchOrdersForTimeChunk(date, hourlyChunk, useCache);
          
          // Get the order IDs from this hour
          const hourlyOrderIds = hourlyResult.orders.map(order => order.id);
          
          // Count unique orders in this hour
          let uniqueOrdersInHour = 0;
          for (const orderId of hourlyOrderIds) {
            if (!uniqueOrderIds.has(orderId)) {
              uniqueOrderIds.add(orderId);
              uniqueOrdersInHour++;
            }
          }
          
          // Add to the UI with the unique count
          addDayCard(`${date} (${hourFormatted}:00-${hourFormatted}:59)`, uniqueOrdersInHour, hourlyResult.hasMaxLimit, false, hourlyResult.fromCache);
          
          // Update totals with unique orders only
          totalCount += uniqueOrdersInHour;
          
          // If we still hit the limit for an hour, we could split further into 15-minute chunks
          if (hourlyResult.hasMaxLimit) {
            chunksWithMaxLimit++;
            addAlert('warning', `${date} (${hourFormatted}:00-${hourFormatted}:59): Still hitting the order limit with ${hourlyResult.count} orders in this hour.`);
          }
        }
      }
    }
    
    return {
      orders: Array.from(uniqueOrderIds),
      totalCount,
      chunksWithMaxLimit
    };
  }
  
  // Helper function to fetch orders for a specific time chunk
  async function fetchOrdersForTimeChunk(date, timeChunk, useCache) {
    // Update UI to show which time chunk we're processing
    let chunkLabel = '';
    switch(timeChunk) {
      case 'first-half':
        chunkLabel = ' (00:00-11:59)';
        break;
      case 'second-half':
        chunkLabel = ' (12:00-23:59)';
        break;
      default:
        chunkLabel = ' (full day)';
    }
    
    updateCurrentDay(`${date}${chunkLabel}`);
    
    // Fetch orders for this time chunk
    const url = `/api/orders?date=${date}&timeChunk=${timeChunk}${useCache ? '' : '&refresh=true'}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error (${response.status}): ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    // If this is not the full day chunk, create a separate card for this chunk
    if (timeChunk !== 'full') {
      const chunkName = timeChunk === 'first-half' ? 'Morning' : 'Afternoon';
      addDayCard(`${date} (${chunkName})`, data.count, data.hasMaxLimit, false, data.fromCache);
      
      // Add an alert if we hit the limit for this chunk
      if (data.hasMaxLimit) {
        addAlert('warning', `${date} ${chunkName}: Found ${data.count} orders, which is the maximum limit. There might be more orders for this time period.`);
      }
    }
    
    // Log the results
    console.log(`Processed ${date} ${timeChunk}: ${data.count} orders${data.fromCache ? ' (from cache)' : ''}`);
    
    return data;
  }
  
  // Helper functions
  function resetUI() {
    totalOrders = 0;
    daysProcessed = 0;
    daysWithMaxOrders = 0;
    totalOrdersEl.textContent = '0';
    daysProcessedEl.textContent = `0 / ${TOTAL_DAYS}`;
    currentDayEl.textContent = '-';
    alertsPanelEl.innerHTML = '';
    dailyCountsEl.innerHTML = '';
  }
  
  function setLoading(loading) {
    isLoading = loading;
    getOrdersBtn.disabled = loading;
    cancelBtn.disabled = !loading; // Enable cancel button when loading, disable when not loading
    cancelBtn.textContent = 'Cancel'; // Reset cancel button text
    loadingIndicator.classList.toggle('active', loading);
  }
  
  function updateStats(total, days) {
    totalOrdersEl.textContent = total.toLocaleString();
    daysProcessedEl.textContent = `${days} / ${TOTAL_DAYS}`;
  }
  
  function updateCurrentDay(date) {
    currentDayEl.textContent = date;
  }
  
  function addDayCard(date, count, isMaxLimit = false, hasError = false, fromCache = false) {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    
    if (isMaxLimit) {
      dayCard.classList.add('max-limit');
    }
    
    if (hasError) {
      dayCard.classList.add('error');
    }
    
    if (fromCache) {
      dayCard.classList.add('from-cache');
    }
    
    // Format the date to be more readable
    const displayDate = new Date(date);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const readableDate = displayDate.toLocaleDateString('en-US', options);
    
    dayCard.innerHTML = `
      <div class="date">${readableDate}</div>
      <div class="count">${count}</div>
      <div class="full-date">${date}</div>
      ${fromCache ? '<div class="cache-badge">cached</div>' : ''}
    `;
    
    // Add to the beginning to show most recent dates first
    dailyCountsEl.insertBefore(dayCard, dailyCountsEl.firstChild);
  }
  
  function addAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Add to the beginning to show newest alerts first
    alertsPanelEl.insertBefore(alert, alertsPanelEl.firstChild);
    
    // Auto-scroll to the top of alerts panel
    if (alertsPanelEl.scrollTop !== 0) {
      alertsPanelEl.scrollTop = 0;
    }
  }
  
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Format a date string for display
  function formatDateForDisplay(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleString('en-US', options);
  }
  
  // Load cache information
  async function loadCacheInfo() {
    try {
      const response = await fetch('/api/cache/info');
      if (!response.ok) {
        throw new Error('Failed to fetch cache info');
      }
      
      const data = await response.json();
      
      // Update cache info in the UI
      cacheLastUpdatedEl.textContent = formatDateForDisplay(data.lastUpdated);
      cacheDaysCountEl.textContent = data.daysCached;
      
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  }
  
  // Clear the cache
  async function clearCache() {
    if (isLoading) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/cache/clear', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      
      const data = await response.json();
      addAlert('success', data.message);
      
      // Reload cache info
      await loadCacheInfo();
      
      // Reset UI
      resetUI();
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      addAlert('danger', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
});
