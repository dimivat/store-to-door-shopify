# Store To Door Shopify Order Retriever

A web-based application that connects to the Store To Door Shopify store and retrieves orders from the last 60 days using the Shopify Admin REST API. The application includes advanced features for handling high-volume days and caching for improved performance.

## Features

- **Web Interface**: User-friendly UI to retrieve and view order statistics
- **60-Day History**: Fetches orders for the last 60 days
- **Advanced Time-Chunking**: Handles days with more than 50 orders by splitting into smaller time periods
- **Caching System**: Stores retrieved orders to reduce API calls and improve performance
- **Cancel Functionality**: Stop the order retrieval process at any time
- **Detailed Logging**: Comprehensive logging for debugging and monitoring

## Important Notes

- The correct Shopify domain is: `store-to-door-au.myshopify.com`
- This application uses the Shopify Admin REST API with an access token
- The Shopify API has a limit of 50 orders per request

## Setup

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file with your Shopify API credentials:
   ```
   SHOPIFY_SHOP=store-to-door-au
   SHOPIFY_ADMIN_ACCESS_TOKEN=your_access_token
   SHOPIFY_API_VERSION=2023-07
   ```

## Usage

Start the server with:

```bash
npm start
```

Then open your browser to `http://localhost:3001` and use the web interface to:

1. Click "Get Orders" to fetch orders for the last 60 days
2. Use the "Cancel" button to stop the process if needed
3. Toggle "Use Cache" to use previously retrieved data
4. View order statistics and counts by day
5. Clear the cache if needed

## Advanced Features

### Time-Chunking Strategy

For days with more than 50 orders, the application uses a recursive time-chunking approach:

1. First attempts to fetch all orders for the entire day
2. If the 50-order limit is reached, splits the day into three periods:
   - Morning (00:00-05:59)
   - Business Hours (06:00-17:59)
   - Evening (18:00-23:59)
3. If any period still has 50+ orders, further splits into individual hours

### Caching System

The application implements a caching system that:
- Stores retrieved orders by date and time chunk
- Reduces API calls to Shopify
- Provides faster access to previously retrieved data
- Can be cleared via the UI when needed

## Files

- `server.js` - Express server handling API requests to Shopify
- `public/` - Frontend files (HTML, CSS, JavaScript)
- `utils/cache.js` - Utility for caching order data
- `check-specific-date.js` - Utility script to check orders for a specific date

## Security Note

Keep your `.env` file secure and never commit it to version control. The access token provides direct access to your Shopify store.
