# Product Catalog API

A RESTful API for a product catalog system that powers an e-commerce platform. This project allows businesses to manage their product offerings with features like product management, categorization, inventory tracking, and reporting.

## Features

- 📦 **Product Management**: Complete CRUD operations for products
- 🏷️ **Categorization**: Organize products into hierarchical categories
- 🔎 **Search & Filtering**: Find products by name, description, or other attributes
- 🔄 **Product Variants**: Support for different variants of products (sizes, colors, etc.)
- 📊 **Inventory Tracking**: Monitor stock levels for products and variants
- 💰 **Pricing & Discounts**: Support for base pricing and discount types
- 📈 **Reporting**: Generate insights about inventory status and product distribution

## Tech Stack

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MySQL** - Relational database
- **Sequelize** - ORM for MySQL
- **Swagger** - API documentation
- **JWT** - Authentication mechanism

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gihozoinnocente/product-catalog-api.git
   cd product-catalog-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables by creating a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials and other settings.

5. Set up the database:
   ```bash
   # Create a database in MySQL
   mysql -u root -p -e "CREATE DATABASE product_catalog;"
   
   # The application will automatically create the tables when started in development mode
   ```

6. Start the server:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

7. Access the Swagger API documentation:
   ```
   http://localhost:3000/api-docs
   ```

## Database Schema

The application uses the following main data models:

- **Categories**: Hierarchical organization of products
- **Products**: Core product information
- **Variants**: Variations of products (sizes, colors, etc.)
- **Inventory**: Stock management for products and variants

## API Endpoints

### Products

| Method | Endpoint                           | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | /api/products                     | Get all products                  |
| GET    | /api/products/:id                 | Get product by ID                 |
| POST   | /api/products                     | Create a new product              |
| PUT    | /api/products/:id                 | Update a product                  |
| DELETE | /api/products/:id                 | Delete a product                  |
| GET    | /api/products/search              | Search products                   |
| GET    | /api/products/:id/variants        | Get variants of a product         |
| POST   | /api/products/:id/variants        | Create a variant for a product    |
| PUT    | /api/products/:id/variants/:id    | Update a product variant          |
| DELETE | /api/products/:id/variants/:id    | Delete a product variant          |

### Categories

| Method | Endpoint                   | Description                  |
|--------|---------------------------|------------------------------|
| GET    | /api/categories           | Get all categories           |
| GET    | /api/categories/:id       | Get category by ID           |
| GET    | /api/categories/tree      | Get category hierarchy tree  |
| POST   | /api/categories           | Create a new category        |
| PUT    | /api/categories/:id       | Update a category            |
| DELETE | /api/categories/:id       | Delete a category            |

### Inventory

| Method | Endpoint                         | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | /api/inventory                  | Get all inventory items            |
| GET    | /api/inventory/:id              | Get inventory by ID                |
| PUT    | /api/inventory/:id              | Update inventory                   |
| GET    | /api/inventory/low-stock        | Get low stock items                |
| GET    | /api/inventory/out-of-stock     | Get out of stock items             |
| PATCH  | /api/inventory/update-quantity  | Batch update inventory quantities  |

### Reports

| Method | Endpoint                             | Description                         |
|--------|-------------------------------------|-------------------------------------|
| GET    | /api/reports/inventory-status       | Get inventory status report         |
| GET    | /api/reports/category-distribution  | Get product category distribution   |
| GET    | /api/reports/low-stock-alert        | Get low stock items by category     |

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

Error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific error for this field"
      }
    ]
  }
}
```

## Data Validation

Input validation is performed using express-validator. All endpoints that accept request bodies validate the input data and return appropriate error messages if validation fails.

## Testing

Run the automated tests:

```bash
npm test
```

You can also test the API manually using tools like:
- Postman
- cURL
- VS Code's REST Client extension

## Development

For development purposes, the server can be run in development mode, which enables:
- Automatic server restart on file changes (nodemon)
- Detailed logging
- Database schema synchronization

```bash
npm run dev
```

## Assumptions and Limitations

- The API assumes that product variants have their own inventory records.
- Categories can have a hierarchical structure, but deleting a category with subcategories is not allowed.
- The API doesn't include user authentication and authorization, which would be necessary in a production environment.
- The current implementation doesn't include webhooks or events for inventory changes.

## Future Enhancements

- User authentication and authorization
- Order management integration
- Webhook support for inventory changes
- Bulk import/export functionality
- Media management for product images
- Cache implementation for improved performance

## License

This project is licensed under the MIT License - see the LICENSE file for details.