const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} = require('docx');

const outputPath = path.join(__dirname, 'FreshKart-Presentation-Notes.docx');
const paragraphs = [];

function title(text) {
  paragraphs.push(new Paragraph({ text, heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
}

function heading(text) {
  paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 120 } }));
}

function subheading(text) {
  paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 } }));
}

function bullet(text, level = 0) {
  paragraphs.push(new Paragraph({ text, bullet: { level }, spacing: { after: 70 } }));
}

function note(text) {
  paragraphs.push(new Paragraph({ children: [new TextRun({ text })], spacing: { after: 100 } }));
}

function code(text) {
  paragraphs.push(new Paragraph({ children: [new TextRun({ text, font: 'Courier New', size: 20 })], shading: { fill: 'F1F5F2' }, spacing: { after: 100 } }));
}

title('FreshKart Grocery Website\nPresentation Notes');
paragraphs.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DBMS Mini Project | Zepto Clone', italics: true })], spacing: { after: 300 } }));

heading('1. Project Introduction');
note('FreshKart is a full-stack grocery ordering website inspired by Zepto. Customers can browse products, filter by category, search for groceries, add items to a cart, enter delivery details, and place an order. An admin can add products, update stock, change order status, and view sales reports.');

heading('2. Technology Stack');
subheading('Frontend');
bullet('HTML: Creates the page structure, product listing, cart, checkout form, admin section, and reports.');
bullet('CSS: Provides the green-and-white design, responsive layout, product cards, forms, buttons, mobile support, and hover effects.');
bullet('Vanilla JavaScript: Handles API calls, category filtering, product search, cart operations, checkout, admin actions, and report rendering.');
subheading('Backend');
bullet('Node.js: Runs JavaScript on the server.');
bullet('Express.js: Creates the web server and REST APIs.');
bullet('mysql2: Connects Node.js to MySQL and supports prepared statements and transactions.');
bullet('dotenv: Loads database credentials from the .env file.');
subheading('Database Tools');
bullet('XAMPP: Provides the local MySQL server.');
bullet('phpMyAdmin: Allows the database schema to be imported and inspected in a browser.');

heading('3. Database Tables');
bullet('CUSTOMER: Stores customer name, phone, address, and creation time.');
bullet('CATEGORY: Stores grocery categories such as Fruits & Vegetables, Snacks, and Beverages.');
bullet('PRODUCT: Stores product name, category, description, price, stock, and image URL.');
bullet('DELIVERY_PARTNER: Stores delivery partner information.');
bullet('ORDERS: Stores customer orders, total amount, delivery partner, status, and creation time.');
bullet('ORDER_ITEM: Stores the products and quantities belonging to each order.');
note('The project uses exactly six tables. Each table has a primary key, and related tables use foreign keys to maintain referential integrity.');

heading('4. Table Relationships');
code('CATEGORY 1 ---- many PRODUCT\nCUSTOMER 1 ---- many ORDERS\nDELIVERY_PARTNER 1 ---- many ORDERS\nORDERS 1 ---- many ORDER_ITEM\nPRODUCT 1 ---- many ORDER_ITEM');
bullet('One category can contain many products.');
bullet('One customer can place many orders.');
bullet('One order can contain many products.');
bullet('ORDER_ITEM resolves the many-to-many relationship between ORDERS and PRODUCT.');

heading('5. How the Website Works');
bullet('The browser opens http://localhost:3000. Express serves the files in the public folder.');
bullet('The frontend calls /api/categories and /api/products.');
bullet('Express runs parameterized SQL queries through mysql2.');
bullet('MySQL returns real product and category data.');
bullet('JavaScript displays the data as product cards.');
bullet('Users can filter by category or search by product name, description, or category.');
bullet('Cart quantities and subtotal are updated immediately in the browser.');

heading('6. OOP Concepts Used');
subheading('Cart Class');
bullet('Encapsulates cart data and operations such as add, change, clear, quantity, and subtotal.');
subheading('ApiClient Class');
bullet('Encapsulates frontend HTTP requests, JSON parsing, and API error handling.');
subheading('ProductService Class');
bullet('Encapsulates product and category SQL operations, including listing products, adding products, and updating stock.');
subheading('OOP Principles');
bullet('Encapsulation: Related data and operations are grouped into classes.');
bullet('Abstraction: The frontend calls APIs without knowing the SQL implementation.');
bullet('Separation of responsibility: HTML, CSS, JavaScript, Express, services, and MySQL each have their own role.');
bullet('Reusability: The classes can be reused and extended later.');

heading('7. Checkout and Order Flow');
bullet('The customer enters name, phone, and delivery address.');
bullet('The frontend sends the cart and customer details to POST /api/orders.');
bullet('The backend starts a MySQL transaction.');
bullet('A customer row is inserted.');
bullet('Product rows are locked with SELECT ... FOR UPDATE.');
bullet('The backend checks that requested stock is available.');
bullet('The order total is calculated.');
bullet('The order and order items are inserted.');
bullet('The transaction is committed.');
bullet('If any step fails, the transaction is rolled back.');

heading('8. Stock Trigger');
note('The reduce_stock_before_order_item trigger runs before an ORDER_ITEM row is inserted. It reduces the product stock automatically and raises an error if the product does not exist or there is insufficient stock.');
code('UPDATE PRODUCT\nSET stock = stock - NEW.quantity\nWHERE product_id = NEW.product_id\nAND stock >= NEW.quantity;');
bullet('The application validates and locks stock but does not reduce stock itself.');
bullet('The trigger is the only stock-decrementing logic.');
bullet('The unique (order_id, product_id) constraint prevents duplicate product rows within one order.');

heading('9. Admin Features');
bullet('Add a new product with category, price, stock, and description.');
bullet('Update inventory stock.');
bullet('View customer orders.');
bullet('Change order status between Placed, Packed, Out for delivery, and Delivered.');
note('Authentication is intentionally simple because this is a DBMS mini project demonstration and complicated authentication was outside the required scope.');

heading('10. Reports');
subheading('Best-Selling Products');
bullet('Uses JOIN between ORDER_ITEM and PRODUCT.');
bullet('Uses SUM(quantity) to calculate units sold.');
bullet('Uses GROUP BY to group sales by product.');
subheading('Daily Sales');
bullet('Uses DATE(created_at) to group orders by day.');
bullet('Uses COUNT(order_id) for order count.');
bullet('Uses SUM(total_amount) for total daily revenue.');

heading('11. Demonstration Flow');
bullet('Start MySQL in XAMPP.');
bullet('Open a terminal in the project folder and run npm start.');
bullet('Open http://localhost:3000.');
bullet('Show products loaded from MySQL.');
bullet('Filter by a category and search for a product.');
bullet('Add a product and adjust its quantity in the cart.');
bullet('Enter customer details and place an order.');
bullet('Show the new CUSTOMER, ORDERS, and ORDER_ITEM rows in phpMyAdmin.');
bullet('Show that product stock decreased through the trigger.');
bullet('Change the order status in the admin section.');
bullet('Update stock and show the reports.');

heading('12. Short Explanation for the Teacher');
note('This is a full-stack grocery ordering system built using HTML, CSS, vanilla JavaScript, Node.js, Express.js, MySQL, and mysql2. The frontend communicates with Express through REST APIs. Express uses parameterized SQL queries to communicate with MySQL. The database contains exactly six tables with primary keys and foreign keys. Customers, orders, and order items are stored permanently in MySQL. A MySQL trigger reduces stock when an order item is inserted and prevents negative inventory. The order operation uses a transaction, so if any step fails, the complete order is rolled back. The project also includes admin product management, stock updates, order status updates, best-selling reports, and daily sales reports using JOIN and GROUP BY queries. OOP is demonstrated through the Cart, ApiClient, and ProductService classes.');

heading('13. Common Viva Questions');
bullet('Why MySQL? It stores relational data and supports relationships, foreign keys, transactions, and triggers.');
bullet('Why ORDER_ITEM? One order can contain many products, so the relationship needs a separate table.');
bullet('Why a transaction? It ensures an order is completely saved or completely rolled back.');
bullet('Why a trigger? It automatically enforces inventory reduction at the database level.');
bullet('Why parameterized queries? They protect against SQL injection and safely handle input values.');
bullet('Why foreign keys? They prevent invalid relationships between tables.');
bullet('Why FOR UPDATE? It locks product rows during checkout and protects stock calculations.');
bullet('Why Express? It provides a simple way to create REST APIs and serve the frontend.');
bullet('Why vanilla JavaScript? The required stack excludes React and other frontend frameworks.');
bullet('Is authentication included? No. The admin section is intentionally simple for this mini project.');

const document = new Document({
  sections: [{
    properties: {},
    children: paragraphs
  }]
});

Packer.toBuffer(document).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});