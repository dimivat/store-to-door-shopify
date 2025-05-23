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
  
  // Load orders for a specific date
  async function loadOrdersForDate(date) {
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
        const staticOrders = STATIC_DATA.orders[date]?.orders || [];
        
        // Cache the results
        cachedDates[date] = staticOrders;
        
        // Display the orders
        displayOrdersForDate(date, staticOrders);
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
      }
    } finally {
      setLoading(false);
    }
  }
  
  // Load orders for a specific date
  async function loadOrdersForDate(date) {
    try {
      // Show loading state
      selectedDateHeading.textContent = `Loading orders for ${formatDateForDisplay(date)}...`;
      selectedDateCount.textContent = '';
      selectedDateTotal.textContent = '$0.00';
      selectedDateAvg.textContent = '$0.00';
      selectedDateItems.textContent = '0';
      ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
      
      await fetchOrdersForDate(date);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      selectedDateHeading.textContent = `Error loading orders for ${formatDateForDisplay(date)}`;
      selectedDateCount.textContent = 'Please try again';
      ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  }
  
  // Display orders for the selected date
  function displayOrdersForDate(date, orders) {
    // Format the date for display
    const formattedDate = formatDateForDisplay(date);
    
    // Update the heading
    selectedDateHeading.textContent = formattedDate;
    
    // Calculate summary statistics
    const orderCount = orders.length;
    let totalValue = 0;
    let totalItems = 0;
    
    orders.forEach(order => {
      totalValue += parseFloat(order.totalPrice || 0);
      totalItems += order.lineItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    });
    
    const avgOrderValue = orderCount > 0 ? totalValue / orderCount : 0;
    
    // Update summary information
    document.getElementById('selected-date-count').textContent = orderCount;
    document.getElementById('selected-date-total').textContent = formatCurrency(totalValue, orders.length > 0 ? orders[0].currency : 'USD');
    document.getElementById('selected-date-avg').textContent = formatCurrency(avgOrderValue, orders.length > 0 ? orders[0].currency : 'USD');
    document.getElementById('selected-date-items').textContent = totalItems;
    
    // Clear the table body
    ordersTableBody.innerHTML = '';
    
    // If no orders, show a message
    if (orders.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" class="no-orders">No orders for this date</td>`;
      ordersTableBody.appendChild(row);
      return;
    }
    
    // Sort orders by created time (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Add each order to the table
    orders.forEach(order => {
      const row = document.createElement('tr');
      
      // Format the customer name
      const customer = order.customer || {};
      const customerName = customer.firstName && customer.lastName 
        ? `${customer.firstName} ${customer.lastName}`
        : 'Guest Customer';
      
      // Format the time
      const time = formatTime(order.createdAt);
      
      // Format the status badges
      const financialStatus = `<span class="status-badge status-${order.financialStatus}">${order.financialStatus || 'unknown'}</span>`;
      const fulfillmentStatus = `<span class="status-badge status-${order.fulfillmentStatus || 'unfulfilled'}">${order.fulfillmentStatus || 'unfulfilled'}</span>`;
      const status = `${financialStatus} ${fulfillmentStatus}`;
      
      // Set the row HTML
      row.innerHTML = `
        <td>${order.name}</td>
        <td>${time}</td>
        <td>${customerName}</td>
        <td>${status}</td>
        <td>${order.lineItems.length}</td>
        <td>${formatCurrency(order.totalPrice, order.currency)}</td>
        <td><button class="view-order-btn" data-order-id="${order.id}">View</button></td>
      `;
      
      // Add the row to the table
      ordersTableBody.appendChild(row);
      
      // Add event listener to the view button
      const viewBtn = row.querySelector('.view-order-btn');
      viewBtn.addEventListener('click', () => {
        openOrderDetails(order);
      });
    });
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
          viewRawJsonBtn.textContent = 'View Raw JSON';
        }
      });
    }
    
    // Show the drawer and overlay
    orderDetailsDrawer.classList.add('open');
    overlay.classList.add('active');
  }
  
  // Close order details drawer
  function closeOrderDetails() {
    orderDetailsDrawer.classList.remove('open');
    overlay.classList.remove('active');
  }
  
  // Generate HTML for order details
  function generateOrderDetailsHTML(order) {
    // Format dates
    const createdAt = formatDateTimeForDisplay(order.createdAt);
    const processedAt = order.processedAt ? formatDateTimeForDisplay(order.processedAt) : 'N/A';
    const updatedAt = order.updatedAt ? formatDateTimeForDisplay(order.updatedAt) : 'N/A';
    const cancelledAt = order.cancelledAt ? formatDateTimeForDisplay(order.cancelledAt) : 'N/A';
    
    // Format customer
    const customer = order.customer || {};
    const customerName = customer.firstName && customer.lastName 
      ? `${customer.firstName} ${customer.lastName}`
      : 'Guest Customer';
    
    // Format addresses
    const shippingAddress = formatAddress(order.shippingAddress);
    const billingAddress = formatAddress(order.billingAddress);
    
    // Format line items
    const lineItemsHTML = order.lineItems.map(item => `
      <li class="order-item">
        <div class="item-details">
          <div class="item-title">${item.title}</div>
          ${item.variant_title ? `<div class="item-variant">${item.variant_title}</div>` : ''}
          ${item.sku ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
          ${item.vendor ? `<div class="item-vendor">Vendor: ${item.vendor}</div>` : ''}
          ${item.product_id ? `<div class="item-product-id">Product ID: ${item.product_id}</div>` : ''}
          ${item.variant_id ? `<div class="item-variant-id">Variant ID: ${item.variant_id}</div>` : ''}
        </div>
        <div class="item-price">
          <div>${item.quantity} × ${formatCurrency(item.price, order.currency)}</div>
          <div><strong>${formatCurrency(item.price * item.quantity, order.currency)}</strong></div>
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
