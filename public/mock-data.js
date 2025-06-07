// Static mock data for the application
const MOCK_DATA = {
  // Data for order dates
  orderDates: {
    "2025-05-23": {
      date: "2025-05-23",
      totalOrders: 2,
      orders: [
        {
          id: 123456789,
          name: "#1001",
          totalPrice: "150.00",
          currency: "AUD",
          createdAt: "2025-05-23T10:00:00+10:00",
          customer: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
          },
          lineItems: [
            {
              id: 11111,
              title: "Product 1",
              quantity: 2,
              price: "75.00",
              sku: "SKU001",
              vendor: "Vendor A"
            }
          ]
        },
        {
          id: 987654321,
          name: "#1002",
          totalPrice: "200.00",
          currency: "AUD",
          createdAt: "2025-05-23T14:30:00+10:00",
          customer: {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com"
          },
          lineItems: [
            {
              id: 22222,
              title: "Product 2",
              quantity: 1,
              price: "200.00",
              sku: "SKU002",
              vendor: "Vendor B"
            }
          ]
        }
      ]
    },
    "2025-05-22": {
      date: "2025-05-22",
      totalOrders: 1,
      orders: [
        {
          id: 55555,
          name: "#1003",
          totalPrice: "99.95",
          currency: "AUD",
          createdAt: "2025-05-22T09:15:00+10:00",
          customer: {
            firstName: "Bob",
            lastName: "Johnson",
            email: "bob.johnson@example.com"
          },
          lineItems: [
            {
              id: 33333,
              title: "Product 3",
              quantity: 1,
              price: "99.95",
              sku: "SKU003",
              vendor: "Vendor C"
            }
          ]
        }
      ]
    }
  },
  
  // Data for delivery dates
  deliveryDates: {
    "2025-05-23": {
      date: "2025-05-23",
      totalOrders: 1,
      orders: [
        {
          id: 123456789,
          name: "#1001",
          totalPrice: "150.00",
          currency: "AUD",
          createdAt: "2025-05-22T10:00:00+10:00",
          customer: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
          },
          lineItems: [
            {
              id: 11111,
              title: "Product 1",
              quantity: 2,
              price: "75.00",
              sku: "SKU001",
              vendor: "Vendor A"
            }
          ],
          note_attributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-23"
            }
          ]
        }
      ]
    },
    "2025-05-24": {
      date: "2025-05-24",
      totalOrders: 1,
      orders: [
        {
          id: 987654321,
          name: "#1002",
          totalPrice: "200.00",
          currency: "AUD",
          createdAt: "2025-05-23T14:30:00+10:00",
          customer: {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com"
          },
          lineItems: [
            {
              id: 22222,
              title: "Product 2",
              quantity: 1,
              price: "200.00",
              sku: "SKU002",
              vendor: "Vendor B"
            }
          ],
          note_attributes: [
            {
              name: "Delivery-Date",
              value: "2025-05-24"
            }
          ]
        }
      ]
    }
  }
};
