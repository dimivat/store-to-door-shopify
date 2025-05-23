require('dotenv').config();
const axios = require('axios');

// Shopify store configuration from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP || 'store-to-door-au';
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-07';

// GraphQL query for orders
const query = `
  query {
    orders(first: 10) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          shippingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                variant {
                  price
                  product {
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchOrdersWithGraphQL() {
  try {
    const response = await axios({
      url: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      data: { query }
    });
    
    const orders = response.data.data.orders.edges.map(edge => edge.node);
    
    console.log(`✅ Successfully fetched ${orders.length} orders using GraphQL`);
    console.log(JSON.stringify(orders, null, 2));
    
    return orders;
  } catch (error) {
    console.error('❌ Error fetching orders with GraphQL:');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// Run the query
fetchOrdersWithGraphQL();
