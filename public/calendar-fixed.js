// Calendar page script
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const calendarContainer = document.getElementById('calendar-container');
  const selectedDateHeading = document.getElementById('selected-date-heading');
  const selectedDateCount = document.getElementById('selected-date-count');
  const selectedDateTotal = document.getElementById('selected-date-total');
  const selectedDateAvg = document.getElementById('selected-date-avg');
  const selectedDateItems = document.getElementById('selected-date-items');
  const ordersTableBody = document.getElementById('orders-table-body');
  const orderDetailsDrawer = document.getElementById('order-details-drawer');
  const orderDetailsTitle = document.getElementById('order-details-title');
  const orderDetailsInfo = document.getElementById('order-details-info');
  const orderDetailsItems = document.getElementById('order-details-items');
  const closeDetailsBtn = document.getElementById('close-details-btn');
  
  // Variables
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let selectedDate = formatDateForAPI(new Date());
  const cachedDates = {};
  
  // Initialize the calendar
  renderCalendar(currentMonth, currentYear);
  
  // Event listener for previous month button
  document.getElementById('prev-month').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });
  
  // Event listener for next month button
  document.getElementById('next-month').addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });
  
  // Event listener for close details button
  closeDetailsBtn.addEventListener('click', function() {
    orderDetailsDrawer.classList.remove('open');
  });
  
  // Function to set loading state
  function setLoading(isLoading) {
    if (isLoading) {
      // Show loading state
      selectedDateHeading.textContent = `Loading orders...`;
      selectedDateCount.textContent = '';
      selectedDateTotal.textContent = '$0.00';
      selectedDateAvg.textContent = '$0.00';
      selectedDateItems.textContent = '0';
      ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    }
  }
  
  // Function to fetch orders for a specific date
  async function fetchOrdersForDate(date) {
    try {
      setLoading(true);
      
      // Check if we already have this date in cache
      if (cachedDates[date]) {
        displayOrdersForDate(date, cachedDates[date]);
        return;
      }
      
      // Check if we're in production (Netlify)
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      
      if (isProduction) {
        // In production, use static data directly
        console.log('Using static data for date:', date);
        
        // Get orders from static data if available
        if (STATIC_DATA && STATIC_DATA.orders && STATIC_DATA.orders[date]) {
          const staticOrders = STATIC_DATA.orders[date].orders || [];
          console.log('Static orders found:', staticOrders);
          
          // Cache the results
          cachedDates[date] = staticOrders;
          
          // Display the orders
          displayOrdersForDate(date, staticOrders);
        } else {
          console.log('No static data found for date:', date);
          displayOrdersForDate(date, []);
        }
        return;
      }
      
      // In development, fetch from the server
      const response = await fetchData(formatApiUrl(`/api/orders/date/${date}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the results
      cachedDates[date] = data.orders;
      
      // Display the orders
      displayOrdersForDate(date, data.orders);
      
    } catch (error) {
      console.error(`Error fetching orders for ${date}:`, error);
      
      // Fallback to static data if available
      if (STATIC_DATA && STATIC_DATA.orders && STATIC_DATA.orders[date]) {
        console.log('Falling back to static data for date:', date);
        const staticOrders = STATIC_DATA.orders[date].orders || [];
        cachedDates[date] = staticOrders;
        displayOrdersForDate(date, staticOrders);
      } else {
        showAlert('error', `Error fetching orders: ${error.message}`);
        displayOrdersForDate(date, []);
      }
    } finally {
      setLoading(false);
    }
  }
  
  // Load orders for a specific date
  async function loadOrdersForDate(date) {
    try {
      // Show loading state
      setLoading(true);
      
      // Fetch the orders
      await fetchOrdersForDate(date);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      selectedDateHeading.textContent = `Error loading orders for ${formatDateForDisplay(date)}`;
      selectedDateCount.textContent = 'Please try again';
      ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  }
  
  // Function to display orders for a specific date
  function displayOrdersForDate(date, orders) {
    // Update the heading
    selectedDateHeading.textContent = `Orders for ${formatDateForDisplay(date)}`;
    
    // Make sure orders is an array
    const orderArray = Array.isArray(orders) ? orders : [];
    console.log('Displaying orders:', orderArray);
    
    // Calculate totals
    const totalOrders = orderArray.length;
    let totalAmount = 0;
    let totalItems = 0;
    
    orderArray.forEach(order => {
      // Make sure we have valid data
      if (order && order.total_price) {
        totalAmount += parseFloat(order.total_price);
      }
      
      // Make sure line_items exists and is an array
      if (order && order.line_items && Array.isArray(order.line_items)) {
        totalItems += order.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    // Update the summary
    selectedDateCount.textContent = totalOrders;
    selectedDateTotal.textContent = formatCurrency(totalAmount);
    selectedDateAvg.textContent = totalOrders > 0 ? formatCurrency(totalAmount / totalOrders) : '$0.00';
    selectedDateItems.textContent = totalItems;
    
    // Clear the table body
    ordersTableBody.innerHTML = '';
    
    // Add each order to the table
    if (!orderArray || orderArray.length === 0) {
      ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders for this date</td></tr>';
    } else {
      orderArray.forEach(order => {
        if (!order) return; // Skip if order is undefined
        
        const row = document.createElement('tr');
        
        // Calculate total items safely - handle both formats
        let itemCount = 0;
        // Check for Shopify API format (line_items)
        if (order.line_items && Array.isArray(order.line_items)) {
          itemCount = order.line_items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        } 
        // Check for static data format (lineItems)
        else if (order.lineItems && Array.isArray(order.lineItems)) {
          itemCount = order.lineItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        }
        
        // Get safe values with fallbacks - handle both Shopify API and static data formats
        const orderNumber = order.name || order.order_number || 'N/A';
        
        // Handle different customer field formats
        let customerName = 'Guest';
        if (order.customer) {
          if (order.customer.first_name) {
            customerName = `${order.customer.first_name} ${order.customer.last_name || ''}`;
          } else if (order.customer.firstName) {
            customerName = `${order.customer.firstName} ${order.customer.lastName || ''}`;
          }
        }
        
        // Handle different date field formats
        const createdAt = order.created_at || order.createdAt || new Date().toISOString();
        
        // Handle different price field formats
        const totalPrice = order.total_price || order.totalPrice || '0.00';
        
        const currency = order.currency || 'AUD';
        const status = order.fulfillment_status || order.fulfillmentStatus || 'Unfulfilled';
        const orderId = order.id || '0';
        
        // Format the order data
        row.innerHTML = `
          <td>${orderNumber}</td>
          <td>${customerName}</td>
          <td>${formatTime(createdAt)}</td>
          <td>${formatCurrency(totalPrice, currency)}</td>
          <td>${itemCount}</td>
          <td>${status}</td>
          <td>
            <button class="btn btn-sm btn-primary view-order-btn" data-order-id="${orderId}">View</button>
          </td>
        `;
        
        ordersTableBody.appendChild(row);
        
        // Add event listener to the view button
        const viewBtn = row.querySelector('.view-order-btn');
        viewBtn.addEventListener('click', () => {
          // Call the openOrderDetails function with the order data
          openOrderDetails(order);
        });
      });
    }
  }
  
  // Open order details drawer
  function openOrderDetails(order) {
    if (!order) {
      console.error('No order data provided to openOrderDetails');
      return;
    }
    
    console.log('Opening order details for:', order);
    
    // Get safe values with fallbacks - handle both formats
    const orderNumber = order.name || order.order_number || 'N/A';
    
    // Handle different customer field formats
    let customerName = 'Guest';
    if (order.customer) {
      if (order.customer.first_name) {
        customerName = `${order.customer.first_name} ${order.customer.last_name || ''}`;
      } else if (order.customer.firstName) {
        customerName = `${order.customer.firstName} ${order.customer.lastName || ''}`;
      }
    }
    
    // Handle different date field formats
    const createdAt = order.created_at || order.createdAt || new Date().toISOString();
    
    // Handle different price field formats
    const totalPrice = order.total_price || order.totalPrice || '0.00';
    
    const currency = order.currency || 'AUD';
    const financialStatus = order.financial_status || order.financialStatus || 'Unknown';
    const fulfillmentStatus = order.fulfillment_status || order.fulfillmentStatus || 'Unfulfilled';
    
    // Set the order title
    orderDetailsTitle.textContent = `Order ${orderNumber}`;
    
    // Format the order info
    orderDetailsInfo.innerHTML = `
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Date:</strong> ${formatDate(createdAt)}</p>
      <p><strong>Time:</strong> ${formatTime(createdAt)}</p>
      <p><strong>Total:</strong> ${formatCurrency(totalPrice, currency)}</p>
      <p><strong>Financial Status:</strong> ${financialStatus}</p>
      <p><strong>Fulfillment Status:</strong> ${fulfillmentStatus}</p>
    `;
    
    // Format the line items
    orderDetailsItems.innerHTML = '';
    
    // Get line items from either format
    const lineItems = order.line_items || order.lineItems;
    
    // Check if line items exist and are an array
    if (lineItems && Array.isArray(lineItems)) {
      lineItems.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'order-item';
        
        // Get safe values for item - handle both formats
        const title = item.title || item.name || 'Unknown Product';
        const variantTitle = item.variant_title || item.variantTitle || '';
        const quantity = item.quantity || 0;
        const price = item.price || '0.00';
        
        itemRow.innerHTML = `
          <div class="item-details">
            <h4>${title}</h4>
            <p class="item-variant">${variantTitle}</p>
          </div>
          <div class="item-quantity">${quantity}x</div>
          <div class="item-price">${formatCurrency(price, currency)}</div>
        `;
        
        orderDetailsItems.appendChild(itemRow);
      });
    } else {
      // No line items
      const noItemsRow = document.createElement('div');
      noItemsRow.className = 'order-item';
      noItemsRow.innerHTML = '<p>No items found for this order</p>';
      orderDetailsItems.appendChild(noItemsRow);
    }
    
    // Show the drawer
    orderDetailsDrawer.classList.add('open');
  }
  
  // Function to render the calendar
  function renderCalendar(month, year) {
    // Clear the calendar
    calendarContainer.innerHTML = '';
    
    // Set the month and year heading
    document.getElementById('current-month').textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1).getDay();
    
    // Get the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create calendar grid
    let date = 1;
    
    // Create weeks
    for (let i = 0; i < 6; i++) {
      // Create a week row
      const week = document.createElement('div');
      week.className = 'calendar-week';
      
      // Create days
      for (let j = 0; j < 7; j++) {
        // Create a day cell
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        if (i === 0 && j < firstDay) {
          // Empty cell before the first day of the month
          day.classList.add('empty');
        } else if (date > daysInMonth) {
          // Empty cell after the last day of the month
          day.classList.add('empty');
        } else {
          // Regular day cell
          const dayDate = new Date(year, month, date);
          const formattedDate = formatDateForAPI(dayDate);
          
          // Create day content
          day.innerHTML = `
            <div class="day-number">${date}</div>
            <div class="day-content" id="day-${formattedDate}">
              <div class="day-orders">Loading...</div>
            </div>
          `;
          
          // Add today class if it's today
          if (isToday(year, month, date)) {
            day.classList.add('today');
          }
          
          // Add selected class if it's the selected date
          if (formattedDate === selectedDate) {
            day.classList.add('selected');
          }
          
          // Add click event to select the date
          day.addEventListener('click', function() {
            // Remove selected class from all days
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            
            // Add selected class to this day
            this.classList.add('selected');
            
            // Update selected date
            selectedDate = formattedDate;
            
            // Load orders for this date
            loadOrdersForDate(formattedDate);
          });
          
          // Fetch order count for this date
          fetchOrderCountForDate(formattedDate);
          
          date++;
        }
        
        week.appendChild(day);
      }
      
      calendarContainer.appendChild(week);
      
      // Stop if we've reached the end of the month
      if (date > daysInMonth) {
        break;
      }
    }
  }
  
  // Function to fetch order count for a date
  async function fetchOrderCountForDate(date) {
    try {
      // Check if we have cached data
      if (cachedDates[date]) {
        updateDayContent(date, cachedDates[date].length);
        return;
      }
      
      // Check if we're in production
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      
      if (isProduction && STATIC_DATA && STATIC_DATA.orders) {
        // Use static data in production
        const orders = STATIC_DATA.orders[date]?.orders || [];
        updateDayContent(date, orders.length);
        return;
      }
      
      // Fetch from API in development
      const response = await fetchData(formatApiUrl(`/api/orders/count/${date}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order count: ${response.statusText}`);
      }
      
      const data = await response.json();
      updateDayContent(date, data.count);
      
    } catch (error) {
      console.error(`Error fetching order count for ${date}:`, error);
      updateDayContent(date, '?');
    }
  }
  
  // Function to update day content
  function updateDayContent(date, count) {
    const dayContent = document.getElementById(`day-${date}`);
    if (dayContent) {
      const dayOrders = dayContent.querySelector('.day-orders');
      if (dayOrders) {
        dayOrders.textContent = count > 0 ? `${count} orders` : 'No orders';
        dayOrders.className = `day-orders ${count > 0 ? 'has-orders' : 'no-orders'}`;
      }
    }
  }
  
  // Helper function to check if a date is today
  function isToday(year, month, day) {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  }
  
  // Helper function to format a date for API
  function formatDateForAPI(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Helper function to format a date for display
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  // Helper function to format a date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  // Helper function to format a time
  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  
  // Helper function to format currency
  function formatCurrency(amount, currency = 'USD') {
    const currencySymbol = currency === 'AUD' ? 'A$' : '$';
    return `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
  }
  
  // Helper function to show an alert
  function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => {
        alertContainer.removeChild(alert);
      }, 150);
    }, 5000);
  }
  
  // Load orders for the current date on page load
  loadOrdersForDate(selectedDate);
});
