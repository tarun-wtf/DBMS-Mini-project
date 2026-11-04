USE zepto_clone;

ALTER TABLE CUSTOMER ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer';

INSERT IGNORE INTO CUSTOMER (customer_name, phone, address, email, username, password_hash, role, wallet_balance)
VALUES ('FreshKart Admin', '9000000000', 'Admin Office', 'admin@freshkart.local', 'admin', '$2b$12$VnsvLRUs1AeFCpyj0jy3dOsPh.gCRno.uH5kluMBp6W.sPjCZq9FG', 'admin', 0.00);