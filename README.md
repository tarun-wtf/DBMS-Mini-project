# FreshKart: Zepto Clone DBMS Mini Project

This is a simple grocery ordering application using HTML, CSS, vanilla JavaScript, Node.js, Express, mysql2 and MySQL through XAMPP.

## Run it locally

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`.
3. Open the **Import** tab, select `schema.sql`, and run it. This creates the `zepto_clone` database, exactly six tables, the stock trigger, and sample data.
4. In this project folder run:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

5. Visit `http://localhost:3000`.

The default XAMPP MySQL settings are already in `.env.example`: user `root`, blank password, port `3306`. Change `.env` if your XAMPP installation uses different credentials.

## Upgrade an existing database

If `zepto_clone` was created from the original version of this project, import `upgrade-auth-wallet.sql` in phpMyAdmin once, followed by `upgrade-role.sql`. If you already imported `upgrade-auth-wallet.sql` for the previous auth/wallet version, import only `upgrade-role.sql` now. These migrations preserve the six existing tables and data. Do not run `schema.sql` again unless you intentionally want to reset the database and seed data.

New installations should import the updated `schema.sql`.

## Demo flow

- Browse products using the category buttons and add products to the basket.
- Create an account or log in. Passwords are stored as bcrypt hashes in MySQL, never as plain text.
- Add fake money from the Account page or payment page, then use Zepto Money to pay.
- Adjust quantities, enter customer details, and continue to the separate payment page.
- After payment, view the separate order page containing order number, items, cost, status, payment method, address, and timestamp.
- View account details, wallet balance, and recent orders from the Account page.

## Admin access

The customer storefront does not contain product, stock, order-status, or report controls. Use the separate `admin.html` interface. The demo admin account is:

```text
Username: admin
Password: Admin@123
```

Admin APIs are protected by the account role. A normal customer account receives an authorization error if it tries to call them.
- Show the order in the Admin section and change its status through `Placed`, `Packed`, `Out for delivery`, and `Delivered`.
- Update stock or add a product from the Admin section.
- Show the best-selling and daily sales reports after placing an order.

Orders use a database transaction. The `reduce_stock_before_order_item` trigger is the only code that decrements stock. The application locks and validates product rows before inserting order items, and the unique `(order_id, product_id)` key prevents duplicate item rows in one order. Wallet deduction, order creation, order items, and trigger-based stock reduction succeed or roll back together.