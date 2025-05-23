// Static data for the Store To Door application
// This file provides mock data for demonstration purposes when the app is deployed as a static site

const STATIC_DATA = {
  // Sample orders for demonstration
  orders: {
    "2025-05-24": {
      date: "2025-05-24",
      totalOrders: 3,
      orders: [
        {
          id: 1001,
          name: "#1001",
          createdAt: "2025-05-24T09:30:00+10:00",
          customer: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+61 400 123 456"
          },
          lineItems: [
            {
              id: 10011,
              title: "Organic Apples",
              quantity: 5,
              price: "4.99",
              sku: "FRUIT-001",
              vendor: "Local Farms"
            },
            {
              id: 10012,
              title: "Whole Grain Bread",
              quantity: 2,
              price: "6.50",
              sku: "BAKERY-002",
              vendor: "Artisan Bakery"
            }
          ],
          totalPrice: "38.45",
          noteAttributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-24"
            }
          ]
        },
        {
          id: 1002,
          name: "#1002",
          createdAt: "2025-05-24T10:15:00+10:00",
          customer: {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com",
            phone: "+61 400 789 012"
          },
          lineItems: [
            {
              id: 10021,
              title: "Free-Range Eggs",
              quantity: 1,
              price: "7.99",
              sku: "DAIRY-001",
              vendor: "Happy Hens Farm"
            },
            {
              id: 10022,
              title: "Organic Milk",
              quantity: 2,
              price: "5.50",
              sku: "DAIRY-002",
              vendor: "Happy Hens Farm"
            }
          ],
          totalPrice: "18.99",
          noteAttributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-24"
            }
          ]
        },
        {
          id: 1003,
          name: "#1003",
          createdAt: "2025-05-24T11:45:00+10:00",
          customer: {
            firstName: "Robert",
            lastName: "Johnson",
            email: "robert.johnson@example.com",
            phone: "+61 400 345 678"
          },
          lineItems: [
            {
              id: 10031,
              title: "Chocolate Cake",
              quantity: 1,
              price: "32.00",
              sku: "BAKERY-010",
              vendor: "Sweet Treats Bakery"
            }
          ],
          totalPrice: "32.00",
          noteAttributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-25"
            },
            {
              name: "Special-Instructions",
              value: "Birthday cake - needs 2 days notice"
            }
          ]
        }
      ]
    },
    "2025-05-25": {
      date: "2025-05-25",
      totalOrders: 2,
      orders: [
        {
          id: 1004,
          name: "#1004",
          createdAt: "2025-05-24T14:20:00+10:00",
          customer: {
            firstName: "Michael",
            lastName: "Brown",
            email: "michael.brown@example.com",
            phone: "+61 400 567 890"
          },
          lineItems: [
            {
              id: 10041,
              title: "Fresh Salmon Fillet",
              quantity: 2,
              price: "15.99",
              sku: "SEAFOOD-001",
              vendor: "Ocean Fresh"
            }
          ],
          totalPrice: "31.98",
          noteAttributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-25"
            }
          ]
        },
        {
          id: 1005,
          name: "#1005",
          createdAt: "2025-05-24T16:05:00+10:00",
          customer: {
            firstName: "Sarah",
            lastName: "Wilson",
            email: "sarah.wilson@example.com",
            phone: "+61 400 901 234"
          },
          lineItems: [
            {
              id: 10051,
              title: "Organic Vegetables Box",
              quantity: 1,
              price: "24.99",
              sku: "VEG-001",
              vendor: "Local Farms"
            },
            {
              id: 10052,
              title: "Free-Range Chicken",
              quantity: 1,
              price: "18.50",
              sku: "MEAT-001",
              vendor: "Happy Farms"
            }
          ],
          totalPrice: "43.49",
          noteAttributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-25"
            }
          ]
        }
      ]
    }
  },
  
  // Orders to place data
  ordersToPlace: {
    regularOrders: [
      { 
        id: 1001, 
        name: '#1001', 
        deliveryDate: '2025-05-24', 
        customer: { firstName: 'John', lastName: 'Doe' },
        items: [
          { name: "Fresh Bread", sku: "BREAD-01", quantity: 2, vendor: "Local Bakery" }
        ]
      },
      { 
        id: 1002, 
        name: '#1002', 
        deliveryDate: '2025-05-24', 
        customer: { firstName: 'Jane', lastName: 'Smith' },
        items: [
          { name: "Milk", sku: "MILK-01", quantity: 1, vendor: "Dairy Farm" },
          { name: "Cheese", sku: "CHEESE-01", quantity: 1, vendor: "Dairy Farm" }
        ]
      }
    ],
    specialNoticeOrders: [
      { 
        id: 1003, 
        name: '#1003', 
        deliveryDate: '2025-05-25', 
        customer: { firstName: 'Robert', lastName: 'Johnson' },
        items: [
          { name: "Special Cake", sku: "CAKE-01", quantity: 1, vendor: "Sweet Treats Bakery" }
        ],
        specialInstructions: "Requires 2 days notice"
      }
    ]
  },
  
  // Cache info
  cacheInfo: {
    lastUpdated: "2025-05-24T00:00:00+10:00",
    daysCached: 2,
    cacheSize: 12345
  }
};
