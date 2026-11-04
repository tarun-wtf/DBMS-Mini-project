USE zepto_clone;

ALTER TABLE CUSTOMER
  ADD COLUMN email VARCHAR(150) NULL UNIQUE,
  ADD COLUMN username VARCHAR(60) NULL UNIQUE,
  ADD COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer',
  ADD COLUMN wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE ORDERS
  ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'Zepto Money',
  ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid',
  ADD COLUMN wallet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

UPDATE CUSTOMER
SET username = CONCAT('legacy_user_', customer_id),
    email = CONCAT('legacy_user_', customer_id, '@example.com'),
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username IS NULL OR email IS NULL OR password_hash IS NULL;

ALTER TABLE CUSTOMER
  MODIFY email VARCHAR(150) NOT NULL,
  MODIFY username VARCHAR(60) NOT NULL,
  MODIFY password_hash VARCHAR(255) NOT NULL;

INSERT IGNORE INTO CUSTOMER (customer_name, phone, address, email, username, password_hash, role, wallet_balance)
VALUES ('FreshKart Admin', '9000000000', 'Admin Office', 'admin@freshkart.local', 'admin', '$2b$12$VnsvLRUs1AeFCpyj0jy3dOsPh.gCRno.uH5kluMBp6W.sPjCZq9FG', 'admin', 0.00);