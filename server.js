require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedStatuses = ['Placed', 'Packed', 'Out for delivery', 'Delivered'];
const authSecret = process.env.AUTH_SECRET || 'freshkart-local-demo-secret';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zepto_clone',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

class ProductService {
  constructor(database) {
    this.database = database;
  }

  async listCategories() {
    const [rows] = await this.database.query('SELECT category_id, category_name FROM CATEGORY ORDER BY category_name');
    return rows;
  }

  async listProducts(categoryId) {
    const params = [];
    let sql = `SELECT p.product_id, p.product_name, p.description, p.price, p.stock, p.image_url,
      c.category_id, c.category_name
      FROM PRODUCT p JOIN CATEGORY c ON c.category_id = p.category_id`;
    if (categoryId) {
      sql += ' WHERE p.category_id = ?';
      params.push(Number(categoryId));
    }
    sql += ' ORDER BY c.category_name, p.product_name';
    const [rows] = await this.database.query(sql, params);
    return rows;
  }

  async createProduct(product) {
    const [result] = await this.database.execute(
      'INSERT INTO PRODUCT (category_id, product_name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [product.categoryId, product.name, product.description, product.price, product.stock, product.imageUrl]
    );
    return result.insertId;
  }

  async updateStock(productId, stock) {
    const [result] = await this.database.execute('UPDATE PRODUCT SET stock = ? WHERE product_id = ?', [stock, productId]);
    return result.affectedRows > 0;
  }
}

const productService = new ProductService(pool);

function createAuthToken(customer) {
  const payload = Buffer.from(JSON.stringify({ customerId: customer.customer_id, role: customer.role || 'customer', expiresAt: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readAuthToken(request) {
  const header = request.headers.authorization || '';
  const [payload, signature] = header.replace('Bearer ', '').split('.');
  if (!payload || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return data.expiresAt > Date.now() ? data : null;
}

function requireAuth(request, response, next) {
  try {
    const token = readAuthToken(request);
    if (!token) return response.status(401).json({ error: 'Please log in to continue' });
    request.customerId = token.customerId;
    request.role = token.role;
    next();
  } catch (error) {
    response.status(401).json({ error: 'Invalid authentication token' });
  }
}

function requireAdmin(request, response, next) {
  requireAuth(request, response, () => {
    if (request.role !== 'admin') return response.status(403).json({ error: 'Admin access required' });
    next();
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Database is not connected' });
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  const { username, email, password, customerName, phone, address } = req.body;
  if (!username || !email || !password || !customerName || !phone || !address || String(password).length < 6) {
    return res.status(400).json({ error: 'Username, email, password of 6+ characters, name, phone, and address are required' });
  }
  try {
    const passwordHash = await bcrypt.hash(String(password), 12);
    const [result] = await pool.execute(
      `INSERT INTO CUSTOMER (customer_name, phone, address, email, username, password_hash, wallet_balance)
       VALUES (?, ?, ?, ?, ?, ?, 0.00)`,
      [String(customerName).trim(), String(phone).trim(), String(address).trim(), String(email).trim().toLowerCase(), String(username).trim(), passwordHash]
    );
    const customer = { customer_id: result.insertId, role: 'customer' };
    res.status(201).json({ token: createAuthToken(customer), customerId: result.insertId, username: String(username).trim(), role: 'customer' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email is already registered' });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  try {
    const [rows] = await pool.execute('SELECT customer_id, username, password_hash, role FROM CUSTOMER WHERE username = ?', [String(username).trim()]);
    if (rows.length === 0 || !(await bcrypt.compare(String(password), rows[0].password_hash))) return res.status(401).json({ error: 'Invalid username or password' });
    res.json({ token: createAuthToken(rows[0]), customerId: rows[0].customer_id, username: rows[0].username, role: rows[0].role });
  } catch (error) { next(error); }
});

app.get('/api/account', requireAuth, async (req, res, next) => {
  try {
    const [customers] = await pool.execute(
      `SELECT customer_id, customer_name, username, email, phone, address, role, wallet_balance
       FROM CUSTOMER WHERE customer_id = ?`, [req.customerId]
    );
    if (customers.length === 0) return res.status(404).json({ error: 'Account not found' });
    const [orders] = await pool.execute(
      `SELECT order_id, total_amount, status, payment_method, payment_status, created_at
       FROM ORDERS WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10`, [req.customerId]
    );
    res.json({ customer: customers[0], orders });
  } catch (error) { next(error); }
});

app.post('/api/wallet/deposit', requireAuth, async (req, res, next) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return res.status(400).json({ error: 'Enter a deposit between ₹1 and ₹100000' });
  try {
    await pool.execute('UPDATE CUSTOMER SET wallet_balance = wallet_balance + ? WHERE customer_id = ?', [amount.toFixed(2), req.customerId]);
    const [rows] = await pool.execute('SELECT wallet_balance FROM CUSTOMER WHERE customer_id = ?', [req.customerId]);
    res.json({ walletBalance: rows[0].wallet_balance });
  } catch (error) { next(error); }
});

app.get('/api/categories', async (req, res, next) => {
  try {
    res.json(await productService.listCategories());
  } catch (error) { next(error); }
});

app.get('/api/products', async (req, res, next) => {
  try {
    res.json(await productService.listProducts(req.query.category_id));
  } catch (error) { next(error); }
});

app.post('/api/orders', requireAuth, async (req, res, next) => {
  const { customerName, phone, address, items, paymentMethod = 'Zepto Money' } = req.body;
  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0 || paymentMethod !== 'Zepto Money') {
    return res.status(400).json({ error: 'Customer details, cart items, and Zepto Money payment are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [customers] = await connection.execute(
      'SELECT customer_id, wallet_balance FROM CUSTOMER WHERE customer_id = ? FOR UPDATE',
      [req.customerId]
    );
    if (customers.length === 0) throw Object.assign(new Error('Account not found'), { statusCode: 401 });
    await connection.execute(
      'UPDATE CUSTOMER SET customer_name = ?, phone = ?, address = ? WHERE customer_id = ?',
      [String(customerName).trim(), String(phone).trim(), String(address).trim(), req.customerId]
    );

    const normalizedItems = items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity)
    }));
    if (normalizedItems.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      throw Object.assign(new Error('Cart quantities must be positive whole numbers'), { statusCode: 400 });
    }

    const products = new Map();
    for (const item of normalizedItems) {
      if (products.has(item.productId)) {
        products.get(item.productId).quantity += item.quantity;
        continue;
      }
      const [rows] = await connection.execute(
        'SELECT product_id, product_name, price, stock FROM PRODUCT WHERE product_id = ? FOR UPDATE',
        [item.productId]
      );
      if (rows.length === 0) throw Object.assign(new Error('A product in the cart no longer exists'), { statusCode: 400 });
      if (rows[0].stock < item.quantity) throw Object.assign(new Error(`${rows[0].product_name} has only ${rows[0].stock} left`), { statusCode: 400 });
      products.set(item.productId, { ...rows[0], quantity: item.quantity });
    }

    let total = 0;
    for (const product of products.values()) total += product.price * product.quantity;
    if (Number(customers[0].wallet_balance) < total) {
      throw Object.assign(new Error('Insufficient Zepto Money balance. Deposit funds before paying.'), { statusCode: 400 });
    }
    await connection.execute('UPDATE CUSTOMER SET wallet_balance = wallet_balance - ? WHERE customer_id = ?', [total.toFixed(2), req.customerId]);
    const [orderResult] = await connection.execute(
      `INSERT INTO ORDERS (customer_id, delivery_partner_id, total_amount, status, payment_method, payment_status, wallet_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.customerId, 1, total.toFixed(2), 'Placed', paymentMethod, 'Paid', total.toFixed(2)]
    );
    for (const product of products.values()) {
      await connection.execute(
        'INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderResult.insertId, product.product_id, product.quantity, product.price]
      );
    }
    await connection.commit();
    res.status(201).json({ orderId: orderResult.insertId, total: Number(total.toFixed(2)), status: 'Placed', paymentMethod });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.get('/api/orders/:id', requireAuth, async (req, res, next) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.order_id, o.total_amount, o.status, o.payment_method, o.payment_status,
        o.wallet_amount, o.created_at, c.customer_name, c.phone, c.email, c.address
       FROM ORDERS o JOIN CUSTOMER c ON c.customer_id = o.customer_id
       WHERE o.order_id = ? AND o.customer_id = ?`, [Number(req.params.id), req.customerId]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.execute(
      `SELECT p.product_name, oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS line_total
       FROM ORDER_ITEM oi JOIN PRODUCT p ON p.product_id = oi.product_id
       WHERE oi.order_id = ? ORDER BY p.product_name`, [Number(req.params.id)]
    );
    res.json({ order: orders[0], items });
  } catch (error) { next(error); }
});

app.get('/api/admin/orders', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT o.order_id, o.total_amount, o.status, o.created_at,
      c.customer_name, c.phone, c.address
      FROM ORDERS o JOIN CUSTOMER c ON c.customer_id = o.customer_id ORDER BY o.created_at DESC`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  const { categoryId, name, description, price, stock, imageUrl } = req.body;
  if (!categoryId || !name || Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ error: 'Category, name, price and stock are required' });
  try {
    const productId = await productService.createProduct({ categoryId: Number(categoryId), name: String(name).trim(), description: description || '', price: Number(price), stock: Number(stock), imageUrl: imageUrl || '' });
    res.status(201).json({ productId });
  } catch (error) { next(error); }
});

app.patch('/api/admin/products/:id/stock', requireAdmin, async (req, res, next) => {
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'Stock must be a non-negative whole number' });
  try {
    if (!await productService.updateStock(Number(req.params.id), stock)) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Stock updated' });
  } catch (error) { next(error); }
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
  if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status' });
  try {
    const [result] = await pool.execute('UPDATE ORDERS SET status = ? WHERE order_id = ?', [req.body.status, Number(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated' });
  } catch (error) { next(error); }
});

app.get('/api/reports/best-selling', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT p.product_name, SUM(oi.quantity) AS units_sold,
      SUM(oi.quantity * oi.unit_price) AS sales
      FROM ORDER_ITEM oi JOIN PRODUCT p ON p.product_id = oi.product_id
      GROUP BY p.product_id, p.product_name ORDER BY units_sold DESC LIMIT 10`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/reports/daily-sales', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT DATE(created_at) AS sale_date,
      COUNT(order_id) AS order_count, SUM(total_amount) AS total_sales
      FROM ORDERS GROUP BY DATE(created_at) ORDER BY sale_date DESC LIMIT 30`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({ error: error.message || 'Something went wrong' });
});

app.listen(port, () => console.log(`Zepto Clone running at http://localhost:${port}`));