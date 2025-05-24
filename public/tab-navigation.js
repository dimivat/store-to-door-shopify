// Tab navigation functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Tab navigation script loaded');
  
  // Direct tab click handlers
  document.querySelector('.tab[data-tab="order-retrieval"]').addEventListener('click', function() {
    activateTab(this, 'retrieval-tab');
  });
  
  document.querySelector('.tab[data-tab="calendar-view"]').addEventListener('click', function() {
    activateTab(this, 'calendar-tab');
  });
  
  document.querySelector('.tab[data-tab="delivery-date"]').addEventListener('click', function() {
    activateTab(this, 'delivery-tab');
  });
  
  // Function to activate a tab
  function activateTab(tabElement, tabPaneId) {
    console.log(`Activating tab: ${tabElement.getAttribute('data-tab')}`);
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    tabElement.classList.add('active');
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    
    // Show the corresponding tab pane
    document.getElementById(tabPaneId).classList.add('active');
  }
  
  // Add debug info to the page
  const debugDiv = document.createElement('div');
  debugDiv.style.position = 'fixed';
  debugDiv.style.bottom = '10px';
  debugDiv.style.right = '10px';
  debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
  debugDiv.style.color = 'white';
  debugDiv.style.padding = '10px';
  debugDiv.style.borderRadius = '5px';
  debugDiv.style.zIndex = '9999';
  debugDiv.style.fontSize = '12px';
  debugDiv.style.maxWidth = '300px';
  debugDiv.style.maxHeight = '200px';
  debugDiv.style.overflow = 'auto';
  debugDiv.innerHTML = '<h3>Debug Panel</h3><div id="debug-content"></div>';
  document.body.appendChild(debugDiv);
  
  // Function to log debug info
  window.logDebug = function(message) {
    const debugContent = document.getElementById('debug-content');
    const timestamp = new Date().toLocaleTimeString();
    debugContent.innerHTML += `<p><strong>${timestamp}</strong>: ${message}</p>`;
    console.log(`[DEBUG] ${message}`);
    debugContent.scrollTop = debugContent.scrollHeight;
  };
  
  // Log initial state
  window.logDebug('Tab navigation initialized');
  window.logDebug(`Active tab: ${document.querySelector('.tab.active')?.getAttribute('data-tab') || 'None'}`);
});
