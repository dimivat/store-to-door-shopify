# Store to Door Order Service

This is an isolated microservice responsible for fetching and caching orders from Shopify. It has been separated from the main application to ensure that future changes to other parts of the project won't impact the order retrieval functionality.

## Architecture

The order service is designed as a standalone microservice with the following features:

- **Complete Isolation**: Runs as a separate process on its own port
- **Dedicated Caching**: Has its own cache directory and file system
- **Single Responsibility**: Only handles order retrieval and caching
- **Simple API**: Provides a clean REST API for the main application

## Endpoints

- `GET /api/orders` - Fetch orders for a specific date and time chunk
- `GET /api/cache/info` - Get cache metadata
- `POST /api/cache/clear` - Clear the cache
- `GET /health` - Health check endpoint

## Integration with Main Application

The main application communicates with this service through:

1. Server-side proxy endpoints (in server.js)
2. Client-side adapter (order-service-client.js)

## Running the Service

```bash
# Install dependencies
npm install

# Start the service
npm start

# For development with auto-restart
npm run dev
```

## Environment Variables

- `ORDER_SERVICE_PORT` - Port for the order service (default: 3002)
- `SHOPIFY_SHOP` - Shopify store name
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Shopify admin API access token
- `SHOPIFY_API_VERSION` - Shopify API version

## Benefits of This Approach

1. **Stability**: Changes to other parts of the application won't affect order retrieval
2. **Scalability**: The order service can be scaled independently
3. **Maintainability**: Clearer separation of concerns
4. **Resilience**: If the main application crashes, the order service remains unaffected
5. **Performance Isolation**: Resource-intensive operations in the main app won't impact order retrieval performance
