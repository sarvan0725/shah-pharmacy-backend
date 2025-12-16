// Simple standalone server without dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Simple in-memory storage
let products = [
  { id: 1, name: "Rice", price: 60, stock: 50, category: "grocery", image: "" },
  { id: 2, name: "Sugar", price: 45, stock: 40, category: "grocery", image: "" },
  { id: 3, name: "Paracetamol", price: 25, stock: 100, category: "medicine", image: "" }
];

let users = [];
let orders = [];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'OK', message: 'Shah Pharmacy Backend Running' }));
    return;
  }

  // Get products
  if (pathname === '/api/products' && req.method === 'GET') {
    const page = parseInt(parsedUrl.query.page) || 1;
    const limit = parseInt(parsedUrl.query.limit) || 20;
    const search = parsedUrl.query.search || '';
    const category = parsedUrl.query.category || '';
    
    let filteredProducts = products;
    
    if (search) {
      filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.writeHead(200);
    res.end(JSON.stringify({
      products: paginatedProducts,
      pagination: {
        page: page,
        limit: limit,
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / limit)
      }
    }));
    return;
  }

  // Get categories
  if (pathname === '/api/products/categories' && req.method === 'GET') {
    const categories = [
      { id: 1, name: 'grocery' },
      { id: 2, name: 'medicine' },
      { id: 3, name: 'bulk' }
    ];
    res.writeHead(200);
    res.end(JSON.stringify(categories));
    return;
  }

  // Send OTP
  if (pathname === '/api/auth/send-otp' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      success: true, 
      message: 'OTP sent successfully',
      otp: '123456'
    }));
    return;
  }

  // Verify OTP
  if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { phone, otp } = JSON.parse(body);
      
      if (otp === '123456') {
        let user = users.find(u => u.phone === phone);
        if (!user) {
          user = {
            id: users.length + 1,
            phone: '+91 ' + phone,
            name: 'User',
            coins: 0,
            totalSpent: 0,
            totalOrders: 0
          };
          users.push(user);
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, user }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid OTP' }));
      }
    });
    return;
  }

  // Create order
  if (pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const orderData = JSON.parse(body);
      const orderNumber = 'SP' + Date.now();
      const coinsEarned = Math.floor(orderData.totalAmount / 100);
      
      const order = {
        id: orders.length + 1,
        orderNumber,
        ...orderData,
        coinsEarned,
        created_at: new Date().toISOString()
      };
      
      orders.push(order);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber,
        coinsEarned
      }));
    });
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Shah Pharmacy Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});