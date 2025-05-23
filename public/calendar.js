document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const calendarDatePicker = document.getElementById('calendar-date-picker');
  const selectedDateHeading = document.getElementById('selected-date-heading');
  const selectedDateCount = document.getElementById('selected-date-count');
  const selectedDateTotal = document.getElementById('selected-date-total');
  const selectedDateAvg = document.getElementById('selected-date-avg');
  const selectedDateItems = document.getElementById('selected-date-items');
  const ordersTableBody = document.getElementById('orders-table-body');
  const orderDetailsDrawer = document.getElementById('order-details-drawer');
  const drawerOrderNumber = document.getElementById('drawer-order-number');
  const drawerContent = document.getElementById('drawer-content');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const overlay = document.getElementById('overlay');
  
  // State
  let cachedDates = {};
  let currentOrders = [];
  
  // Initialize Flatpickr calendar
  const calendar = flatpickr(calendarDatePicker, {
    dateFormat: 'Y-m-d',
    maxDate: 'today',
    disableMobile: true,
    // Set timezone to Sydney/Australia
    timezone: 'Australia/Sydney',
    onChange: function(selectedDates, dateStr) {
      if (selectedDates.length > 0) {
        loadOrdersForDate(dateStr);
      }
    }
  });
  
  // Tab navigation
  document.addEventListener('click', (e) => {
    // Check if the clicked element is a tab
    if (e.target.classList.contains('tab')) {
      const tabName = e.target.getAttribute('data-tab');
      
      // Update active tab
      const tabs = document.querySelectorAll('.tab');
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update active tab pane
      const tabPanes = document.querySelectorAll('.tab-pane');
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Show the correct tab content
      if (tabName === 'order-retrieval') {
        document.getElementById('retrieval-tab').classList.add('active');
      } else if (tabName === 'calendar-view') {
        document.getElementById('calendar-tab').classList.add('active');
      } else if (tabName === 'delivery-date') {
        document.getElementById('delivery-tab').classList.add('active');
      }
    }
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
        
        // Calculate total items safely
        let itemCount = 0;
        if (order.line_items && Array.isArray(order.line_items)) {
          itemCount = order.line_items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        }
        
        // Get safe values with fallbacks
        const orderNumber = order.name || order.order_number || 'N/A';
        const customerName = order.customer && order.customer.first_name ? 
          `${order.customer.first_name} ${order.customer.last_name || ''}` : 'Guest';
        const createdAt = order.created_at || new Date().toISOString();
        const totalPrice = order.total_price || '0.00';
        const currency = order.currency || 'USD';
        const status = order.fulfillment_status || 'Unfulfilled';
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
    // Log the full order object to see all available data
    console.log('Full order object:', order);
    
    // Set the order number in the header
    drawerOrderNumber.textContent = `Order ${order.name}`;
    
    // Generate the order details HTML
    const detailsHTML = generateOrderDetailsHTML(order);
    
    // Set the drawer content
    drawerContent.innerHTML = detailsHTML;
    
    // Add event listener for the View Raw JSON button
    const viewRawJsonBtn = document.getElementById('view-raw-json-btn');
    const rawJsonContainer = document.getElementById('raw-json-container');
    
    if (viewRawJsonBtn && rawJsonContainer) {
      viewRawJsonBtn.addEventListener('click', () => {
        if (rawJsonContainer.style.display === 'none') {
          rawJsonContainer.style.display = 'block';
          viewRawJsonBtn.textContent = 'Hide Raw JSON';
        } else {
          rawJsonContainer.style.display = 'none';
    }
    
    console.log('Opening order details for:', order);
    
    const detailsDrawer = document.getElementById('order-details-drawer');
    const orderTitle = document.getElementById('order-details-title');
    const orderInfo = document.getElementById('order-details-info');
    const orderItems = document.getElementById('order-details-items');
    const closeBtn = document.getElementById('close-details-btn');
    
    // Get safe values with fallbacks
    const orderNumber = order.name || order.order_number || 'N/A';
    const customerName = order.customer && order.customer.first_name ? 
      `${order.customer.first_name} ${order.customer.last_name || ''}` : 'Guest';
    const createdAt = order.created_at || new Date().toISOString();
    const totalPrice = order.total_price || '0.00';
    const currency = order.currency || 'USD';
    const financialStatus = order.financial_status || 'Unknown';
    const fulfillmentStatus = order.fulfillment_status || 'Unfulfilled';
    
    // Set the order title
    orderTitle.textContent = `Order ${orderNumber}`;
          ${item.total_discount > 0 ? `<div class="item-discount">Discount: -${formatCurrency(item.total_discount, order.currency)}</div>` : ''}
        </div>
      </li>
    `).join('');
    
    // Format shipping lines
    const shippingLinesHTML = order.shippingLines && order.shippingLines.length > 0 ?
      order.shippingLines.map(shipping => `
        <div class="shipping-line">
          <div class="shipping-title">${shipping.title || 'Standard Shipping'}</div>
          <div class="shipping-price">${formatCurrency(shipping.price, order.currency)}</div>
        </div>
      `).join('') : '<div>No shipping information</div>';
    
    // Format discount codes
    const discountCodesHTML = order.discountCodes && order.discountCodes.length > 0 ?
      order.discountCodes.map(discount => `
        <div class="discount-code">
          <div class="discount-code-title">${discount.code || 'Discount'}</div>
          <div class="discount-amount">-${formatCurrency(discount.amount, order.currency)}</div>
          <div class="discount-type">${discount.type || 'fixed_amount'}</div>
        </div>
      `).join('') : '<div>No discount codes applied</div>';
    
    // Format note attributes
    const noteAttributesHTML = order.noteAttributes && order.noteAttributes.length > 0 ?
      order.noteAttributes.map(attr => `
        <div class="note-attribute">
          <div class="note-attribute-name">${attr.name}:</div>
          <div class="note-attribute-value">${attr.value}</div>
        </div>
      `).join('') : '<div>No note attributes</div>';
    
    return `
      <div class="order-section">
        <h3>Order Information</h3>
        <div class="order-info-grid">
          <div class="order-info-item">
            <div class="order-info-label">Order Number</div>
            <div class="order-info-value">${order.name}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Order ID</div>
            <div class="order-info-value">${order.id}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Date Created</div>
            <div class="order-info-value">${createdAt}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Date Processed</div>
            <div class="order-info-value">${processedAt}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Last Updated</div>
            <div class="order-info-value">${updatedAt}</div>
          </div>
          ${order.cancelledAt ? `
            <div class="order-info-item">
              <div class="order-info-label">Cancelled At</div>
              <div class="order-info-value">${cancelledAt}</div>
            </div>
            <div class="order-info-item">
              <div class="order-info-label">Cancel Reason</div>
              <div class="order-info-value">${order.cancelReason || 'Not specified'}</div>
            </div>
          ` : ''}
          <div class="order-info-item">
            <div class="order-info-label">Financial Status</div>
            <div class="order-info-value">
              <span class="status-badge status-${order.financialStatus}">${order.financialStatus || 'unknown'}</span>
            </div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Fulfillment Status</div>
            <div class="order-info-value">
              <span class="status-badge status-${order.fulfillmentStatus || 'unfulfilled'}">${order.fulfillmentStatus || 'unfulfilled'}</span>
            </div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Currency</div>
            <div class="order-info-value">${order.currency}</div>
          </div>
        </div>
      </div>
      
      <div class="order-section">
        <h3>Customer</h3>
        <div class="order-info-grid">
          <div class="order-info-item">
            <div class="order-info-label">Name</div>
            <div class="order-info-value">${customerName}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Email</div>
            <div class="order-info-value">${customer.email || 'N/A'}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Phone</div>
            <div class="order-info-value">${customer.phone || 'N/A'}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Customer ID</div>
            <div class="order-info-value">${customer.id || 'N/A'}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Orders Count</div>
            <div class="order-info-value">${customer.ordersCount || '1'}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Total Spent</div>
            <div class="order-info-value">${customer.totalSpent ? formatCurrency(customer.totalSpent, order.currency) : 'N/A'}</div>
          </div>
        </div>
      </div>
      
      <div class="order-section">
        <h3>Shipping Address</h3>
        <div class="address-block">
          ${shippingAddress}
        </div>
      </div>
      
      <div class="order-section">
        <h3>Billing Address</h3>
        <div class="address-block">
          ${billingAddress}
        </div>
      </div>
      
      <div class="order-section">
        <h3>Items (${order.lineItems.length})</h3>
        <ul class="order-items-list">
          ${lineItemsHTML}
        </ul>
      </div>
      
      <div class="order-section">
        <h3>Shipping</h3>
        <div class="shipping-lines-container">
          ${shippingLinesHTML}
        </div>
      </div>
      
      ${order.discountCodes && order.discountCodes.length > 0 ? `
        <div class="order-section">
          <h3>Discount Codes</h3>
          <div class="discount-codes-container">
            ${discountCodesHTML}
          </div>
        </div>
      ` : ''}
      
      <div class="order-section">
        <h3>Summary</h3>
        <div class="order-summary">
          <div class="order-info-item">
            <div class="order-info-label">Subtotal</div>
            <div class="order-info-value">${formatCurrency(order.subtotalPrice, order.currency)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Shipping</div>
            <div class="order-info-value">${formatCurrency(order.totalPrice - order.subtotalPrice - order.totalTax + order.totalDiscounts, order.currency)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Tax</div>
            <div class="order-info-value">${formatCurrency(order.totalTax, order.currency)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Discounts</div>
            <div class="order-info-value">-${formatCurrency(order.totalDiscounts, order.currency)}</div>
          </div>
          <div class="order-info-item" style="margin-top: 15px; border-top: 1px solid var(--medium-gray); padding-top: 15px;">
            <div class="order-info-label" style="font-size: 16px; font-weight: 700;">Total</div>
            <div class="order-info-value" style="font-size: 20px; font-weight: 700; color: var(--primary-color);">
              ${formatCurrency(order.totalPrice, order.currency)}
            </div>
          </div>
        </div>
      </div>
      
      ${order.noteAttributes && order.noteAttributes.length > 0 ? `
        <div class="order-section">
          <h3>Note Attributes</h3>
          <div class="note-attributes-container">
            ${noteAttributesHTML}
          </div>
        </div>
      ` : ''}
      
      ${order.note ? `
        <div class="order-section">
          <h3>Notes</h3>
          <div class="order-note">
            ${order.note}
          </div>
        </div>
      ` : ''}
      
      ${order.tags ? `
        <div class="order-section">
          <h3>Tags</h3>
          <div class="order-tags">
            ${order.tags}
          </div>
        </div>
      ` : ''}
      
      <div class="order-section">
        <h3>Technical Details</h3>
        <div class="technical-details">
          <button class="secondary-btn" id="view-raw-json-btn">View Raw JSON</button>
          <div class="raw-json-container" id="raw-json-container" style="display: none;">
            <pre class="raw-json">${JSON.stringify(order, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;
  }
  
  // Helper function to format address
  function formatAddress(address) {
    if (!address) return 'No address provided';
    
    let formattedAddress = '';
    
    if (address.name) formattedAddress += `${address.name}<br>`;
    if (address.company) formattedAddress += `${address.company}<br>`;
    if (address.address1) formattedAddress += `${address.address1}<br>`;
    if (address.address2) formattedAddress += `${address.address2}<br>`;
    
    let cityLine = '';
    if (address.city) cityLine += address.city;
    if (address.province) cityLine += cityLine ? `, ${address.province}` : address.province;
    if (address.zip) cityLine += cityLine ? ` ${address.zip}` : address.zip;
    
    if (cityLine) formattedAddress += `${cityLine}<br>`;
    if (address.country) formattedAddress += `${address.country}<br>`;
    if (address.phone) formattedAddress += `Phone: ${address.phone}`;
    
    return formattedAddress || 'No address provided';
  }
  
  // Helper function to format currency
  function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }
  
  // Helper function to format date for display using Sydney timezone
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    };
    
    return date.toLocaleDateString('en-AU', options);
  }
  
  // Helper function to format date and time for display using Sydney timezone
  function formatDateTimeForDisplay(dateString) {
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    };
    
    return date.toLocaleString('en-AU', options);
  }
  
  // Helper function to format time only using Sydney timezone
  function formatTime(dateString) {
    const date = new Date(dateString);
    const options = { 
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    };
    
    return date.toLocaleString('en-AU', options);
  }
  
  // Event listeners
  closeDrawerBtn.addEventListener('click', closeOrderDetails);
  overlay.addEventListener('click', closeOrderDetails);
  
  // Check for cached dates on page load
  async function loadCachedDates() {
    try {
      const response = await fetchData(formatApiUrl('/api/cache/info'));
      if (!response.ok) return;
      
      const data = await response.json();
      
      // If we have cached days, enable those dates in the calendar
      if (data.daysCached > 0) {
        // We'll implement this if needed
      }
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  }
  
  // Initialize
  loadCachedDates();
});
