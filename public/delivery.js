document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const deliveryDatePicker = document.getElementById('delivery-date-picker');
  const deliveryDateHeading = document.getElementById('delivery-date-heading');
  const deliveryDateCount = document.getElementById('delivery-date-count');
  const deliveryDateTotal = document.getElementById('delivery-date-total');
  const deliveryDateVendors = document.getElementById('delivery-date-vendors');
  const deliveryDateItems = document.getElementById('delivery-date-items');
  const vendorItemsBody = document.getElementById('vendor-items-body');
  const deliveryOrdersBody = document.getElementById('delivery-orders-body');
  const orderDetailsDrawer = document.getElementById('order-details-drawer');
  const drawerOrderNumber = document.getElementById('drawer-order-number');
  const drawerContent = document.getElementById('drawer-content');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const overlay = document.getElementById('overlay');
  
  // State
  let cachedDates = {};
  let currentOrders = [];
  
  // Initialize Flatpickr calendar for delivery date
  const deliveryCalendar = flatpickr(deliveryDatePicker, {
    dateFormat: 'Y-m-d',
    maxDate: new Date().fp_incr(30), // Allow selecting dates up to 30 days in the future
    minDate: new Date().fp_incr(-30), // Allow selecting dates up to 30 days in the past
    disableMobile: true,
    // Set timezone to Sydney/Australia
    timezone: 'Australia/Sydney',
    // Force UTC+10 for Sydney timezone
    utc: true,
    // Disable Sunday selection since there are no orders on Sunday
    disable: [
      function(date) {
        // Return true to disable Sunday (0 is Sunday in JavaScript)
        return date.getDay() === 0;
      }
    ],
    onChange: function(selectedDates, dateStr) {
      if (selectedDates.length > 0) {
        // Ensure the date is in Sydney timezone
        console.log(`Selected delivery date in Sydney timezone: ${dateStr}`);
        // Make sure we're using the date string in YYYY-MM-DD format
        loadOrdersForDeliveryDate(dateStr);
      }
    }
  });
  
  // Tab navigation is handled in calendar.js
  
  // Load orders for a specific delivery date
  async function loadOrdersForDeliveryDate(date) {
    try {
      // Show loading state
      deliveryDateHeading.textContent = `Loading orders for delivery on ${formatDateForDisplay(date)}...`;
      deliveryDateCount.textContent = '0';
      deliveryDateTotal.textContent = '$0.00';
      deliveryDateVendors.textContent = '0';
      deliveryDateItems.textContent = '0';
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
      deliveryOrdersBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
      
      // Check if we already have this date cached
      if (cachedDates[date]) {
        displayOrdersForDeliveryDate(date, cachedDates[date]);
        return;
      }
      
      // Fetch orders from the server
      const response = await fetchData(formatApiUrl(`/api/orders/delivery-date/${date}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Server response:', data);
      
      // Cache the results
      if (data && data.orders) {
        cachedDates[date] = data.orders;
        
        // Display the orders
        displayOrdersForDeliveryDate(date, data.orders);
      } else {
        console.error('Invalid server response format:', data);
        throw new Error('Invalid server response format');
      }
      
    } catch (error) {
      console.error('Error loading delivery orders:', error);
      deliveryDateHeading.textContent = `Error loading orders for delivery on ${formatDateForDisplay(date)}`;
      vendorItemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
      deliveryOrdersBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  }
  
  // Display orders for the selected delivery date
  function displayOrdersForDeliveryDate(date, orders) {
    console.log(`Displaying orders for date: ${date}`);
    console.log(`Number of orders: ${orders ? orders.length : 0}`);
    console.log('Orders:', orders);
    
    // Format the date for display
    const formattedDate = formatDateForDisplay(date);
    
    // Update the heading
    deliveryDateHeading.textContent = formattedDate;
    
    // Check if we have orders
    if (!orders || orders.length === 0) {
      deliveryDateCount.textContent = '0';
      deliveryDateTotal.textContent = '$0.00';
      deliveryDateVendors.textContent = '0';
      deliveryDateItems.textContent = '0';
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center">No orders for delivery on this date</td></tr>';
      deliveryOrdersBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders for delivery on this date</td></tr>';
      return;
    }
    
    // Calculate summary statistics
    const orderCount = orders.length;
    let totalValue = 0;
    let totalItems = 0;
    
    // Group items by vendor
    const vendorItems = {};
    const itemOrderCounts = {};
    
    orders.forEach(order => {
      totalValue += parseFloat(order.totalPrice || 0);
      
      // Process line items
      order.lineItems.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        totalItems += quantity;
        
        const vendor = item.vendor || 'Unknown Vendor';
        const itemKey = `${vendor}|${item.title}|${item.sku || 'no-sku'}`;
        
        // Initialize vendor if not exists
        if (!vendorItems[vendor]) {
          vendorItems[vendor] = {};
        }
        
        // Initialize item if not exists
        if (!vendorItems[vendor][itemKey]) {
          vendorItems[vendor][itemKey] = {
            title: item.title,
            sku: item.sku || 'N/A',
            quantity: 0,
            orders: new Set()
          };
        }
        
        // Add quantity and order
        vendorItems[vendor][itemKey].quantity += quantity;
        vendorItems[vendor][itemKey].orders.add(order.name);
      });
    });
    
    // Count unique vendors
    const vendorCount = Object.keys(vendorItems).length;
    
    // Update summary information
    deliveryDateCount.textContent = orderCount;
    deliveryDateTotal.textContent = formatCurrency(totalValue, orders.length > 0 ? orders[0].currency : 'USD');
    deliveryDateVendors.textContent = vendorCount;
    deliveryDateItems.textContent = totalItems;
    
    // Generate vendor items table
    generateVendorItemsTable(vendorItems);
    
    // Clear the orders table body
    deliveryOrdersBody.innerHTML = '';
    
    // If no orders, show a message
    if (orders.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" class="no-orders">No orders for delivery on this date</td>`;
      deliveryOrdersBody.appendChild(row);
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
      
      // Format the delivery date
      const deliveryDateFormatted = formatDeliveryDate(order.deliveryDate);
      
      // Format the status badges
      const financialStatus = `<span class="status-badge status-${order.financialStatus}">${order.financialStatus || 'unknown'}</span>`;
      const fulfillmentStatus = `<span class="status-badge status-${order.fulfillmentStatus || 'unfulfilled'}">${order.fulfillmentStatus || 'unfulfilled'}</span>`;
      const status = `${financialStatus} ${fulfillmentStatus}`;
      
      // Set the row HTML
      row.innerHTML = `
        <td>${order.name}</td>
        <td>${customerName}</td>
        <td>${deliveryDateFormatted}</td>
        <td>${status}</td>
        <td>${order.lineItems.length}</td>
        <td>${formatCurrency(order.totalPrice, order.currency)}</td>
        <td><button class="view-order-btn" data-order-id="${order.id}">View</button></td>
      `;
      
      // Add the row to the table
      deliveryOrdersBody.appendChild(row);
      
      // Add event listener to the view button
      const viewBtn = row.querySelector('.view-order-btn');
      viewBtn.addEventListener('click', () => {
        openOrderDetails(order);
      });
    });
  }
  
  // Generate vendor items table
  function generateVendorItemsTable(vendorItems) {
    // Clear the table
    vendorItemsBody.innerHTML = '';
    
    // If no vendors, show a message
    if (Object.keys(vendorItems).length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5" class="text-center">No items found</td>`;
      vendorItemsBody.appendChild(row);
      return;
    }
    
    // Sort vendors alphabetically
    const sortedVendors = Object.keys(vendorItems).sort();
    
    // Add each vendor and their items
    sortedVendors.forEach(vendor => {
      // Add vendor header row
      const vendorRow = document.createElement('tr');
      vendorRow.classList.add('vendor-header');
      vendorRow.innerHTML = `
        <td colspan="5"><strong>${vendor}</strong></td>
      `;
      vendorItemsBody.appendChild(vendorRow);
      
      // Get all items for this vendor
      const items = vendorItems[vendor];
      const itemKeys = Object.keys(items).sort();
      
      // Add each item
      itemKeys.forEach(itemKey => {
        const item = items[itemKey];
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td></td>
          <td>${item.title}</td>
          <td>${item.sku}</td>
          <td class="quantity-cell">${item.quantity}</td>
          <td class="orders-cell">${item.orders.size}</td>
        `;
        
        vendorItemsBody.appendChild(row);
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
    const deliveryDate = formatDeliveryDate(order.deliveryDate);
    
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
          <div class="order-info-item">
            <div class="order-info-label">Delivery Date</div>
            <div class="order-info-value">${deliveryDate}</div>
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
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }
  
  // Helper function to format date for display using Sydney timezone
  function formatDateForDisplay(dateString) {
    // Create date in Sydney timezone
    const sydneyDate = new Date(dateString + 'T00:00:00+10:00');
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    };
    
    return sydneyDate.toLocaleDateString('en-AU', options);
  }
  
  // Helper function to format date and time for display using Sydney timezone
  function formatDateTimeForDisplay(dateString) {
    // If the dateString doesn't have a time component, add one
    let fullDateString = dateString;
    if (!dateString.includes('T') && !dateString.includes(' ')) {
      fullDateString = dateString + 'T00:00:00+10:00';
    }
    
    const sydneyDate = new Date(fullDateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    };
    
    return sydneyDate.toLocaleString('en-AU', options);
  }
  
  // Helper function to format delivery date
  function formatDeliveryDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      // If it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return formatDateForDisplay(dateString);
      }
      
      // If it's in YYYY/MM/DD format
      if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateString)) {
        const parts = dateString.split('/');
        const formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return formatDateForDisplay(formattedDate);
      }
      
      // If it's in DD/MM/YYYY format
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        const parts = dateString.split('/');
        const formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return formatDateForDisplay(formattedDate);
      }
      
      // If it's a full date string, convert to YYYY-MM-DD in Sydney timezone
      const sydneyDate = new Date(dateString + (dateString.includes('T') ? '' : 'T00:00:00+10:00'));
      if (!isNaN(sydneyDate.getTime())) {
        // Format to YYYY-MM-DD in Sydney timezone
        const year = sydneyDate.toLocaleString('en-AU', { year: 'numeric', timeZone: 'Australia/Sydney' });
        const month = sydneyDate.toLocaleString('en-AU', { month: '2-digit', timeZone: 'Australia/Sydney' });
        const day = sydneyDate.toLocaleString('en-AU', { day: '2-digit', timeZone: 'Australia/Sydney' });
        const formattedDate = `${year}-${month}-${day}`;
        return formatDateForDisplay(formattedDate);
      }
      
      // If all else fails, return the original string
      return dateString;
    } catch (e) {
      console.error(`Error formatting delivery date: ${dateString}`, e);
      return dateString || 'N/A';
    }
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
