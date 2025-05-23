#!/bin/bash

# This script removes hardcoded tokens from files and replaces them with environment variable references

echo "Cleaning up sensitive tokens from files..."

# domain-check.js
if [ -f domain-check.js ]; then
  echo "Updating domain-check.js..."
  sed -i '' 's/const ACCESS_TOKEN = '\''shpat_[a-zA-Z0-9]*'\'';/const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;/' domain-check.js
fi

# new-credentials.js
if [ -f new-credentials.js ]; then
  echo "Updating new-credentials.js..."
  sed -i '' 's/const ACCESS_TOKEN = '\''shpat_[a-zA-Z0-9]*'\'';/const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;/' new-credentials.js
fi

# graphql-orders.js
if [ -f graphql-orders.js ]; then
  echo "Updating graphql-orders.js..."
  sed -i '' 's/const ACCESS_TOKEN = '\''shpat_[a-zA-Z0-9]*'\'';/const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;/' graphql-orders.js
fi

# index.js
if [ -f index.js ]; then
  echo "Updating index.js..."
  sed -i '' 's/const ACCESS_TOKEN = '\''shpat_[a-zA-Z0-9]*'\'';/const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;/' index.js
fi

echo "Cleanup complete!"
