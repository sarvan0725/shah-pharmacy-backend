# Shah Pharmacy Backend API

Complete backend system for Shah Pharmacy & Mini Mart with 3000+ product support, order management, and admin features.

## Features

### 🔐 Authentication
- Phone-based OTP login
- User registration & profiles
- Session management

### 📦 Product Management
- 3000+ product support with pagination
- Category-based organization
- Search & filtering
- Bulk import/export
- Stock management
- Image upload system

### 🛒 Order Management
- Complete order lifecycle
- Order history & tracking
- Invoice generation
- Delivery management
- Coin reward system

### 👨‍💼 Admin Panel
- Real-time dashboard analytics
- Sales reports & insights
- User management
- Product management
- Settings configuration
- Data export (CSV)

### 📁 File Management
- Image upload & storage
- Multiple file support
- File deletion & management
- Organized folder structure

## Installation

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Start Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

3. **Server will run on:** `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP & login
- `GET /api/auth/profile/:userId` - Get user profile
- `PUT /api/auth/profile/:userId` - Update profile

### Products
- `GET /api/products` - Get products (with pagination & search)
- `GET /api/products/categories` - Get categories
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Add new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/bulk-import` - Bulk import products

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/user/:userId` - Get user orders
- `GET /api/orders/:orderId` - Get order details
- `PUT /api/orders/:orderId/status` - Update order status (Admin)
- `DELETE /api/orders/:orderId` - Delete order
- `GET /api/orders` - Get all orders (Admin)

### Admin Analytics
- `GET /api/admin/dashboard` - Dashboard analytics
- `GET /api/admin/analytics/sales` - Sales analytics
- `GET /api/admin/analytics/products` - Product analytics
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/export/:type` - Export data (orders/products/users)

### File Upload
- `POST /api/upload/:type` - Upload single image
- `POST /api/upload/:type/multiple` - Upload multiple images
- `DELETE /api/upload/:type/:filename` - Delete file
- `GET /api/upload/:type` - List uploaded files

## Database Schema

### Tables
- **users** - User accounts & profiles
- **categories** - Product categories
- **products** - Product catalog (3000+ items)
- **orders** - Order management
- **order_items** - Order line items
- **invoices** - Invoice records
- **settings** - System configuration

### Key Features
- SQLite database (easily scalable to MySQL/PostgreSQL)
- Automatic table creation
- Data integrity with foreign keys
- Optimized queries for large datasets

## File Structure
```
backend/
├── models/
│   └── database.js          # Database setup & schemas
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── products.js         # Product management
│   ├── orders.js           # Order management
│   ├── admin.js            # Admin analytics
│   └── upload.js           # File upload
├── uploads/
│   ├── products/           # Product images
│   └── invoices/           # Invoice PDFs
├── server.js               # Main server file
├── package.json            # Dependencies
└── README.md               # Documentation
```

## Configuration

### Default Settings
- Free delivery radius: 3km
- Delivery charge: ₹15 per km
- Max delivery distance: 25km
- Coin rate: ₹100 = 1 coin
- File upload limit: 5MB per file

### Environment Variables (Optional)
```env
PORT=3000
DB_PATH=./pharmacy.db
UPLOAD_LIMIT=5242880
```

## Integration with Frontend

Update your frontend `app.js` to use the backend API:

```javascript
const API_BASE = 'http://localhost:3000/api';

// Example API calls
async function loadProducts() {
  const response = await fetch(`${API_BASE}/products?page=1&limit=20`);
  const data = await response.json();
  return data.products;
}

async function createOrder(orderData) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return response.json();
}
```

## Production Deployment

1. **Database Migration**: Switch to MySQL/PostgreSQL for production
2. **File Storage**: Use cloud storage (AWS S3, Cloudinary)
3. **Authentication**: Implement JWT tokens
4. **Rate Limiting**: Add API rate limiting
5. **Logging**: Implement proper logging system
6. **SSL**: Enable HTTPS in production

## Support

For technical support or customization:
- **Developer**: Sarthak Srivastava
- **Email**: sarthakmahi345@gmail.com
- **Company**: LaxRani AI Labs (laxraniailabs07@gmail.com)
- **Phone**: +91 8081782267