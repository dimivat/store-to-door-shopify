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
  
  // State
  let cachedDates = {};
  
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
  
  // Load orders for a specific delivery date
  async function loadOrdersForDeliveryDate(date) {
    try {
      // Show loading state
      deliveryDateHeading.textContent = `Loading orders for delivery on ${formatDateForDisplay(date)}...`;
      deliveryDateCount.textContent = '';
      deliveryDateTotal.textContent = '';
      deliveryDateVendors.textContent = '';
      deliveryDateItems.textContent = '';
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
      deliveryOrdersBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
      
      // Simulate network delay for testing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`Loading delivery orders for date: ${date}`);
      
      // Use mock data directly if available
      if (window.MOCK_DATA && window.MOCK_DATA.deliveryDates && window.MOCK_DATA.deliveryDates[date]) {
        console.log(`Found mock data for delivery date ${date}`);
        const mockData = window.MOCK_DATA.deliveryDates[date];
        displayOrdersForDeliveryDate(date, mockData.orders);
        return;
      }
      
      // If we don't have mock data for this date, create an empty response
      console.log(`No mock data for delivery date ${date}, returning empty array`);
      displayOrdersForDeliveryDate(date, []);
      
    } catch (error) {
      console.error('Error loading delivery orders:', error);
      deliveryDateHeading.textContent = `Error loading orders for delivery on ${formatDateForDisplay(date)}`;
      deliveryDateCount.textContent = '0';
      deliveryDateTotal.textContent = '$0.00';
      deliveryDateVendors.textContent = '0';
      deliveryDateItems.textContent = '0';
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
      deliveryOrdersBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
    }
  }
  
  // Display orders for the selected delivery date
  function displayOrdersForDeliveryDate(date, orders) {
    console.log('Orders for delivery date:', orders);
    
    // Format the date for display
    const formattedDate = formatDateForDisplay(date);
    
    // Update the heading
    deliveryDateHeading.textContent = formattedDate;
    
    // Validate orders data
    if (!orders || !Array.isArray(orders)) {
      console.error(`Invalid orders data for delivery date ${date}:`, orders);
      deliveryDateCount.textContent = '0';
      deliveryDateTotal.textContent = '$0.00';
      deliveryDateVendors.textContent = '0';
      deliveryDateItems.textContent = '0';
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading orders. Please try again.</td></tr>';
      deliveryOrdersBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading orders. Please try again.</td></tr>';
      return;
    }
    
    // Check if we have orders
    if (orders.length === 0) {
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
      // Handle different property names (camelCase or snake_case)
      totalValue += parseFloat(order.totalPrice || order.total_price || 0);
      
      // Process line items (handle different property names)
      const lineItems = order.lineItems || order.line_items || [];
      lineItems.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        totalItems += quantity;
        
        // Handle different property names
        const vendor = item.vendor || 'Unknown Vendor';
        const title = item.title || item.name || 'Unknown Item';
        const sku = item.sku || item.SKU || 'no-sku';
        const itemKey = `${vendor}|${title}|${sku}`;
        
        // Initialize vendor if not exists
        if (!vendorItems[vendor]) {
          vendorItems[vendor] = {};
        }
        
        // Initialize item if not exists
        if (!vendorItems[vendor][itemKey]) {
          vendorItems[vendor][itemKey] = {
            title: title,
            sku: sku || 'N/A',
            quantity: 0,
            orders: new Set()
          };
        }
        
        // Increment item quantity
        vendorItems[vendor][itemKey].quantity += quantity;
        // Add order to the set of orders for this item
        vendorItems[vendor][itemKey].orders.add(order.name || order.id);
      });
    });
    
    // Count unique vendors
    const uniqueVendors = Object.keys(vendorItems).length;
    
    // Update summary information
    deliveryDateCount.textContent = orderCount;
    deliveryDateTotal.textContent = formatCurrency(totalValue);
    deliveryDateVendors.textContent = uniqueVendors;
    deliveryDateItems.textContent = totalItems;
    
    // Display vendor items
    vendorItemsBody.innerHTML = '';
    
    if (uniqueVendors === 0) {
      vendorItemsBody.innerHTML = '<tr><td colspan="5" class="text-center">No vendor items found</td></tr>';
    } else {
      // Create a flat list of all vendor items
      const allVendorItems = [];
      
      for (const vendor in vendorItems) {
        for (const itemKey in vendorItems[vendor]) {
          const item = vendorItems[vendor][itemKey];
          allVendorItems.push({
            vendor: vendor,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            orderCount: item.orders.size
          });
        }
      }
      
      // Sort by vendor and then by title
      allVendorItems.sort((a, b) => {
        if (a.vendor !== b.vendor) {
          return a.vendor.localeCompare(b.vendor);
        }
        return a.title.localeCompare(b.title);
      });
      
      // Add each vendor item to the table
      allVendorItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="vendor-name">${item.vendor}</td>
          <td class="item-title">${item.title}</td>
          <td class="item-sku">${item.sku}</td>
          <td class="item-quantity">${item.quantity}</td>
          <td class="item-orders">${item.orderCount}</td>
        `;
        vendorItemsBody.appendChild(row);
      });
    }
    
    // Display delivery orders
    deliveryOrdersBody.innerHTML = '';
    
    // Sort orders by created time (newest first)
    orders.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    
    // Add each order to the table
    orders.forEach(order => {
      const row = document.createElement('tr');
      
      // Get customer name
      const customer = order.customer || {};
      const customerName = (customer.firstName || customer.first_name) && (customer.lastName || customer.last_name)
        ? `${customer.firstName || customer.first_name} ${customer.lastName || customer.last_name}`
        : 'No customer name';
      
      // Format the created at date/time
      const orderDate = new Date(order.createdAt || order.created_at);
      const formattedTime = orderDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = orderDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
      
      // Format price
      const price = formatCurrency(parseFloat(order.totalPrice || order.total_price || 0));
      
      // Get line items
      const lineItems = order.lineItems || order.line_items || [];
      const itemCount = lineItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      
      // Get delivery date note attribute
      const deliveryDateAttr = (order.note_attributes || []).find(attr => {
        const attrName = (attr.name || '').toLowerCase();
        return attrName === 'delivery-date' || attrName === 'delivery date' || attrName === 'delivery_date';
      });
      
      row.innerHTML = `
        <td class="order-number">${order.name}</td>
        <td class="order-date">${formattedDate} ${formattedTime}</td>
        <td class="customer-name">${customerName}</td>
        <td class="delivery-date">${deliveryDateAttr ? deliveryDateAttr.value : 'N/A'}</td>
        <td class="order-items">${itemCount}</td>
        <td class="order-price">${price}</td>
        <td class="order-status">${order.fulfillmentStatus || order.fulfillment_status || 'Unfulfilled'}</td>
      `;
      
      deliveryOrdersBody.appendChild(row);
    });
  }
  
  // Format currency for display
  function formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }
  
  // Format date for display
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Helper function to format API URLs
  function formatApiUrl(endpoint) {
    // In production, the API is served from Netlify functions
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return endpoint.startsWith('/') ? `/.netlify/functions/api${endpoint}` : `/.netlify/functions/api/${endpoint}`;
    }
    
    // In development, the API is served from the same origin
    return endpoint;
  }
  
  // Initial load - set to today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayFormatted = `${year}-${month}-${day}`;
  
  // Set calendar to today's date and load orders
  deliveryCalendar.setDate(todayFormatted);
  loadOrdersForDeliveryDate(todayFormatted);
});
