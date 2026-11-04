CREATE DATABASE IF NOT EXISTS zepto_clone;
USE zepto_clone;

DROP TABLE IF EXISTS ORDER_ITEM;
DROP TABLE IF EXISTS ORDERS;
DROP TABLE IF EXISTS DELIVERY_PARTNER;
DROP TABLE IF EXISTS PRODUCT;
DROP TABLE IF EXISTS CATEGORY;
DROP TABLE IF EXISTS CUSTOMER;

CREATE TABLE CUSTOMER (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CATEGORY (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE PRODUCT (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(500),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
  CONSTRAINT chk_product_price CHECK (price >= 0),
  CONSTRAINT chk_product_stock CHECK (stock >= 0)
);

CREATE TABLE DELIVERY_PARTNER (
  delivery_partner_id INT AUTO_INCREMENT PRIMARY KEY,
  partner_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL
);

CREATE TABLE ORDERS (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  delivery_partner_id INT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Placed',
  payment_method VARCHAR(40) NOT NULL DEFAULT 'Zepto Money',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid',
  wallet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id),
  CONSTRAINT fk_order_partner FOREIGN KEY (delivery_partner_id) REFERENCES DELIVERY_PARTNER(delivery_partner_id),
  CONSTRAINT chk_order_status CHECK (status IN ('Placed', 'Packed', 'Out for delivery', 'Delivered')),
  CONSTRAINT chk_order_total CHECK (total_amount >= 0)
);

CREATE TABLE ORDER_ITEM (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id),
  CONSTRAINT uq_order_product UNIQUE (order_id, product_id),
  CONSTRAINT chk_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_item_price CHECK (unit_price >= 0)
);

DELIMITER //
CREATE TRIGGER reduce_stock_before_order_item
BEFORE INSERT ON ORDER_ITEM
FOR EACH ROW
BEGIN
  UPDATE PRODUCT
  SET stock = stock - NEW.quantity
  WHERE product_id = NEW.product_id AND stock >= NEW.quantity;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock or product does not exist';
  END IF;
END//
DELIMITER ;

INSERT INTO CATEGORY (category_name) VALUES
  ('Fruits & Vegetables'), ('Dairy & Breakfast'), ('Snacks'), ('Beverages');

INSERT INTO DELIVERY_PARTNER (partner_name, phone) VALUES ('QuickDrop Partner', '9999999999');

INSERT INTO CUSTOMER (customer_name, phone, address, email, username, password_hash, role, wallet_balance)
VALUES ('FreshKart Admin', '9000000000', 'Admin Office', 'admin@freshkart.local', 'admin', '$2b$12$VnsvLRUs1AeFCpyj0jy3dOsPh.gCRno.uH5kluMBp6W.sPjCZq9FG', 'admin', 0.00);

INSERT INTO PRODUCT (category_id, product_name, description, price, stock, image_url) VALUES
  (1, 'Fresh Bananas', 'Naturally sweet 1 kg pack', 55.00, 40, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500'),
  (1, 'Red Apples', 'Crisp Shimla apples 1 kg', 140.00, 25, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500'),
  (2, 'Farm Fresh Milk', 'Full cream milk 1 litre', 68.00, 30, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'),
  (2, 'Brown Bread', 'Soft whole wheat loaf', 45.00, 20, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500'),
  (3, 'Potato Chips', 'Classic salted chips 100 g', 35.00, 50, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500'),
  (3, 'Chocolate Cookies', 'Crunchy chocolate chip cookies', 80.00, 35, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500'),
  (4, 'Orange Juice', 'Refreshing fruit juice 1 litre', 110.00, 18, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500'),
  (4, 'Mineral Water', 'Packaged drinking water 1 litre', 20.00, 60, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500');