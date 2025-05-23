// Simple proxy to redirect to api.js
exports.handler = async (event, context) => {
  // Import the handler from api.js
  const apiHandler = require('./api').handler;
  
  // Forward the request to the api handler
  return await apiHandler(event, context);
};
