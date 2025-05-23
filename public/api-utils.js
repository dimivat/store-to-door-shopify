// Utility functions for API calls

// Function to get the correct API base URL based on the environment
function getApiBaseUrl() {
  // Check if we're running on Netlify (production)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/.netlify/functions/api';
  }
  
  // Local development
  return '';
}

// Function to format API URLs
function formatApiUrl(endpoint) {
  const baseUrl = getApiBaseUrl();
  
  // If the endpoint already starts with a slash, we need to handle it
  if (endpoint.startsWith('/')) {
    return `${baseUrl}${endpoint}`;
  }
  
  return `${baseUrl}/${endpoint}`;
}
