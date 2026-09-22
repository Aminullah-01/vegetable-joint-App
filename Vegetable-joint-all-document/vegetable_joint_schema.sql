-- =====================================================================
--  VEGETABLE JOINT — DATABASE SCHEMA
--  Target      : MySQL 8.0.16+ (InnoDB, utf8mb4). MariaDB 10.5+ compatible.
--  Derived from: Vegetable Joint SRS v1.0, Section 5 (Data Requirements)
--  Conventions : - All timestamps are stored in UTC (SRS DAT-06); the app
--                  displays them in Africa/Lagos.
--                - Money is DECIMAL(12,2) NGN (SRS DAT-02).
--                - Foreign keys are RESTRICT (never cascade) so referenced
--                  rows can't be silently deleted (SRS DAT-01).
--                - Products, users and orders are never hard-deleted;
--                  products use soft delete (SRS SEL-04, BR-10).
--
--  Contents
--    1. Database + session settings
--    2. Core tables : users, seller_profiles, categories, products
--    3. Order tables: orders, order_items, order_status_history,
--                     order_status_transitions
--    4. Admin tables: audit_logs, site_settings
--    5. Framework   : personal_access_tokens (Sanctum), password_reset_tokens
--    6. Integrity triggers
--    7. Views (public catalogue, low stock, sales, popularity)
--    8. Seed / reference data
--    9. Reference queries (commented) for the trickiest operations
--
--  Running it:
--    mysql -u root -p < vegetable_joint_schema.sql
--  Inside Laravel migrations, put the trigger bodies in DB::unprepared()
--  WITHOUT the DELIMITER lines (DELIMITER is a mysql-client command).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DATABASE + SESSION
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS vegetable_joint
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vegetable_joint;

SET time_zone = '+00:00';
SET NAMES utf8mb4;

-- DEVELOPMENT ONLY: uncomment to rebuild from scratch. NEVER run in production.
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP VIEW  IF EXISTS v_product_popularity_30d, v_seller_products_sold, v_seller_sales_daily, v_low_stock, v_public_products;
-- DROP TABLE IF EXISTS password_reset_tokens, personal_access_tokens, site_settings, audit_logs,
--                      order_status_history, order_status_transitions, order_items, orders,
--                      products, categories, seller_profiles, users;
-- SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 2. CORE TABLES
-- ---------------------------------------------------------------------

-- 2.1 users — every account (buyer, seller, admin). One role per account (A-01).
CREATE TABLE users (
  id                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120)     NOT NULL,
  email              VARCHAR(190)     NOT NULL,                       -- app stores lower-case; unique index is case-insensitive
  phone              VARCHAR(20)      NOT NULL,
  password           VARCHAR(255)     NOT NULL,                       -- bcrypt / Argon2 hash only (NFR-SEC-01)
  role               ENUM('buyer','seller','admin') NOT NULL,
  status             ENUM('active','suspended')     NOT NULL DEFAULT 'active',   -- AUTH-12
  email_verified_at  TIMESTAMP        NULL DEFAULT NULL,
  created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB COMMENT='All accounts; role decides permissions (RBAC).';

-- 2.2 seller_profiles — business details + approval workflow (AUTH-03, ADM-03).
CREATE TABLE seller_profiles (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  business_name     VARCHAR(150)    NOT NULL,
  description       TEXT            NULL,
  location          VARCHAR(150)    NOT NULL,                         -- town/area, state; used by location filter (SRCH-03)
  phone             VARCHAR(20)     NULL,
  approval_status   ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  rejection_reason  VARCHAR(500)    NULL,                             -- UC-05: reject with a reason
  reviewed_by       BIGINT UNSIGNED NULL,                             -- admin who last approved/rejected/suspended
  reviewed_at       TIMESTAMP       NULL DEFAULT NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seller_profiles_user (user_id),
  KEY idx_seller_profiles_status (approval_status),
  KEY idx_seller_profiles_location (location),
  KEY idx_seller_profiles_business_name (business_name),
  CONSTRAINT fk_seller_profiles_user     FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_seller_profiles_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='One row per seller user; holds business details and approval state.';

-- 2.3 categories — admin-extensible (MKT-09, ADM-05).
CREATE TABLE categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(80)     NOT NULL,
  description  TEXT            NULL,
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,                    -- deactivate instead of delete when in use (BR-09)
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  KEY idx_categories_active (is_active)
) ENGINE=InnoDB COMMENT='Product categories (Tomato, Pepper, Onion, ...).';

-- 2.4 products — a seller's listing.
CREATE TABLE products (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id            BIGINT UNSIGNED NOT NULL,                      -- -> seller_profiles.id (not users.id)
  category_id          BIGINT UNSIGNED NOT NULL,
  name                 VARCHAR(150)    NOT NULL,
  description          TEXT            NULL,
  price                DECIMAL(12,2)   NOT NULL,                      -- NGN per unit
  unit                 VARCHAR(30)     NOT NULL,                      -- kg | basket | bag | bunch | piece | crate (see seed notes)
  quantity             INT UNSIGNED    NOT NULL DEFAULT 0,            -- whole units only (A-10); UNSIGNED blocks negative stock
  low_stock_threshold  INT UNSIGNED    NOT NULL DEFAULT 5,            -- SEL-09 (configurable per product)
  image                VARCHAR(255)    NULL,                          -- path/URL; NULL -> placeholder (SEL-05)
  availability         TINYINT(1)      NOT NULL DEFAULT 1,            -- seller's manual on/off switch
  average_rating       DECIMAL(2,1)    NULL,                          -- populated when reviews arrive (REV-01)
  rating_count         INT UNSIGNED    NOT NULL DEFAULT 0,
  deleted_at           TIMESTAMP       NULL DEFAULT NULL,             -- soft delete (SEL-04, BR-10)
  created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_seller (seller_id, deleted_at),
  KEY idx_products_category (category_id, deleted_at),
  KEY idx_products_price (price),
  KEY idx_products_name (name),
  KEY idx_products_created (created_at),
  FULLTEXT KEY ft_products_name_desc (name, description),             -- word search; use with MATCH ... AGAINST
  CONSTRAINT fk_products_seller   FOREIGN KEY (seller_id)   REFERENCES seller_profiles (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)      ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_products_price   CHECK (price > 0),
  CONSTRAINT chk_products_rating  CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5))
) ENGINE=InnoDB COMMENT='Vegetable listings. Effective availability = availability=1 AND quantity>0 (BR-01).';

-- ---------------------------------------------------------------------
-- 3. ORDER TABLES
-- ---------------------------------------------------------------------

-- 3.1 orders — one order per seller per checkout (CHK-05, BR-06).
CREATE TABLE orders (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number     VARCHAR(20)     NOT NULL,                          -- human-readable, e.g. VJ-20261001-0042 (generated by app)
  checkout_ref     CHAR(36)        NOT NULL,                          -- client-generated UUID; groups per-seller orders of one checkout
  buyer_id         BIGINT UNSIGNED NOT NULL,
  seller_id        BIGINT UNSIGNED NOT NULL,
  total_amount     DECIMAL(12,2)   NOT NULL,                          -- = SUM(order_items.subtotal) (BR-02)
  status           ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  payment_method   ENUM('pay_on_delivery') NOT NULL DEFAULT 'pay_on_delivery',   -- extend when payments arrive (A-07)
  delivery_name    VARCHAR(120)    NOT NULL,
  delivery_phone   VARCHAR(20)     NOT NULL,
  delivery_address TEXT            NOT NULL,                          -- street/landmark, town/area, state
  notes            TEXT            NULL,
  cancel_reason    TEXT            NULL,                              -- required for seller/admin cancellations (ORD-07) — enforced in app
  completed_at     TIMESTAMP       NULL DEFAULT NULL,                 -- set by trigger on transition to 'completed'; drives sales reports (BR-12)
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number (order_number),
  UNIQUE KEY uq_orders_checkout_seller (checkout_ref, seller_id),     -- idempotent submission: a retry can't create duplicates (NFR-REL-04)
  KEY idx_orders_buyer (buyer_id, created_at),
  KEY idx_orders_seller_status (seller_id, status),
  KEY idx_orders_seller_completed (seller_id, completed_at),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_checkout (checkout_ref),
  CONSTRAINT fk_orders_buyer  FOREIGN KEY (buyer_id)  REFERENCES users (id)           ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES seller_profiles (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_orders_total CHECK (total_amount >= 0)
) ENGINE=InnoDB COMMENT='Purchase request from one buyer to one seller.';

-- 3.2 order_items — immutable snapshot of what was bought (BR-03).
CREATE TABLE order_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  product_name  VARCHAR(150)    NOT NULL,                             -- snapshot
  unit          VARCHAR(30)     NOT NULL,                             -- snapshot
  quantity      INT UNSIGNED    NOT NULL,
  price         DECIMAL(12,2)   NOT NULL,                             -- unit price at purchase time
  subtotal      DECIMAL(12,2)   GENERATED ALWAYS AS (price * quantity) STORED,   -- BR-02; never insert/update directly
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_order_items_qty    CHECK (quantity >= 1),
  CONSTRAINT chk_order_items_price  CHECK (price > 0)
) ENGINE=InnoDB COMMENT='Line items; name, unit and price are frozen at order time.';

-- 3.3 order_status_history — every status change (ORD-06).
CREATE TABLE order_status_history (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id     BIGINT UNSIGNED NOT NULL,
  from_status  ENUM('pending','confirmed','processing','ready','completed','cancelled') NULL,   -- NULL on the first entry
  to_status    ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL,
  changed_by   BIGINT UNSIGNED NOT NULL,                              -- actor (buyer, seller or admin)
  note         TEXT            NULL,                                  -- reason for cancellations / admin overrides
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id, created_at),
  KEY idx_osh_changed_by (changed_by),
  CONSTRAINT fk_osh_order      FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_osh_changed_by FOREIGN KEY (changed_by) REFERENCES users (id)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Append-only log of order status changes.';

-- 3.4 order_status_transitions — the lifecycle in SRS 3.6.2 as data (BR-07).
--     Checked by trg_orders_status_guard. Which ACTOR may perform a transition
--     (buyer/seller/admin) is enforced in the application layer.
CREATE TABLE order_status_transitions (
  from_status ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL,
  to_status   ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL,
  PRIMARY KEY (from_status, to_status)
) ENGINE=InnoDB COMMENT='Allowed order status transitions.';

-- ---------------------------------------------------------------------
-- 4. ADMIN TABLES
-- ---------------------------------------------------------------------

-- 4.1 audit_logs — security-relevant and admin events (ADM-09). Append-only.
CREATE TABLE audit_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NULL,                                  -- NULL for anonymous events (e.g. failed login)
  action       VARCHAR(80)     NOT NULL,                              -- e.g. login, login_failed, seller_approved, order_override
  entity_type  VARCHAR(60)     NULL,
  entity_id    BIGINT UNSIGNED NULL,
  ip_address   VARCHAR(45)     NULL,                                  -- fits IPv6
  metadata     JSON            NULL,                                  -- never store passwords, tokens or full personal data (NFR-OBS-01)
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user_date (user_id, created_at),
  KEY idx_audit_action_date (action, created_at),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Audit trail viewable by administrators.';

-- 4.2 site_settings — marketplace information (ADM-08). `key` is a reserved word, hence setting_key.
CREATE TABLE site_settings (
  setting_key    VARCHAR(80)  NOT NULL,
  setting_value  TEXT         NULL,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB COMMENT='Key/value marketplace information (site name, contacts, footer).';

-- ---------------------------------------------------------------------
-- 5. FRAMEWORK TABLES (Laravel Sanctum + password reset)
-- ---------------------------------------------------------------------
CREATE TABLE personal_access_tokens (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tokenable_type  VARCHAR(255)    NOT NULL,
  tokenable_id    BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(255)    NOT NULL,
  token           VARCHAR(64)     NOT NULL,
  abilities       TEXT            NULL,
  last_used_at    TIMESTAMP       NULL DEFAULT NULL,
  expires_at      TIMESTAMP       NULL DEFAULT NULL,                  -- tokens must expire (NFR-SEC-03)
  created_at      TIMESTAMP       NULL DEFAULT NULL,
  updated_at      TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY personal_access_tokens_token_unique (token),
  KEY personal_access_tokens_tokenable (tokenable_type, tokenable_id),
  KEY personal_access_tokens_expires_at (expires_at)
) ENGINE=InnoDB COMMENT='API tokens issued at login (Sanctum layout).';

CREATE TABLE password_reset_tokens (
  email       VARCHAR(190) NOT NULL,
  token       VARCHAR(255) NOT NULL,                                  -- hashed; single-use, time-limited (AUTH-06)
  created_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (email)
) ENGINE=InnoDB COMMENT='Password-reset requests.';

-- ---------------------------------------------------------------------
-- 6. INTEGRITY TRIGGERS
--    Belt-and-braces: the app enforces these rules too, but the database
--    should refuse bad data even if a bug or a manual query slips through.
-- ---------------------------------------------------------------------
DELIMITER $$

-- 6.1 seller_profiles.user_id must be a user whose role is 'seller'.
CREATE TRIGGER trg_seller_profiles_bi BEFORE INSERT ON seller_profiles
FOR EACH ROW
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'seller' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'seller_profiles.user_id must reference a user with role = seller';
  END IF;
END$$

CREATE TRIGGER trg_seller_profiles_bu BEFORE UPDATE ON seller_profiles
FOR EACH ROW
BEGIN
  IF NEW.user_id <> OLD.user_id AND (SELECT role FROM users WHERE id = NEW.user_id) <> 'seller' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'seller_profiles.user_id must reference a user with role = seller';
  END IF;
END$$

-- 6.2 orders.buyer_id must be a user whose role is 'buyer' (A-01: one role per account).
CREATE TRIGGER trg_orders_bi BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.buyer_id) <> 'buyer' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'orders.buyer_id must reference a user with role = buyer';
  END IF;
END$$

-- 6.3 Enforce the order lifecycle (BR-07) and stamp completed_at.
--     An administrator override (ADM-07) sets  SET @vj_admin_override = 1;
--     in the same connection/transaction before the UPDATE, then resets it to 0.
CREATE TRIGGER trg_orders_status_guard BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    IF COALESCE(@vj_admin_override, 0) <> 1 THEN
      IF NOT EXISTS (SELECT 1 FROM order_status_transitions t
                     WHERE t.from_status = OLD.status AND t.to_status = NEW.status) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid order status transition';
      END IF;
    END IF;
    IF NEW.status = 'completed' THEN
      SET NEW.completed_at = UTC_TIMESTAMP();
    ELSE
      SET NEW.completed_at = NULL;      -- e.g. admin correction away from 'completed'
    END IF;
  END IF;
END$$

-- 6.4 An order item's product must belong to the order's seller (per-seller orders, CHK-05).
CREATE TRIGGER trg_order_items_bi BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
  IF (SELECT seller_id FROM products WHERE id = NEW.product_id)
     <> (SELECT seller_id FROM orders WHERE id = NEW.order_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_items.product_id must belong to the same seller as the order';
  END IF;
END$$

-- 6.5 Snapshots are immutable: block edits to a placed order line (BR-03).
CREATE TRIGGER trg_order_items_bu BEFORE UPDATE ON order_items
FOR EACH ROW
BEGIN
  IF NEW.order_id <> OLD.order_id OR NEW.product_id <> OLD.product_id
     OR NEW.product_name <> OLD.product_name OR NEW.unit <> OLD.unit
     OR NEW.quantity <> OLD.quantity OR NEW.price <> OLD.price THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_items are immutable once created';
  END IF;
END$$

-- 6.6 Audit and status-history tables are append-only.
CREATE TRIGGER trg_osh_bu BEFORE UPDATE ON order_status_history
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_status_history is append-only';
END$$

CREATE TRIGGER trg_osh_bd BEFORE DELETE ON order_status_history
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'order_status_history is append-only';
END$$

CREATE TRIGGER trg_audit_bu BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 7. VIEWS
-- ---------------------------------------------------------------------

-- 7.1 Public catalogue (MKT-04, BR-01, BR-11): published, not deleted, seller approved
--     and active, category active. Out-of-stock items ARE listed (shown as "Out of Stock").
CREATE OR REPLACE VIEW v_public_products AS
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.unit,
  p.quantity,
  p.image,
  p.average_rating,
  p.rating_count,
  p.created_at,
  c.id            AS category_id,
  c.name          AS category_name,
  sp.id           AS seller_id,
  sp.business_name AS seller_name,
  sp.location     AS seller_location,
  CASE
    WHEN p.quantity = 0     THEN 'out_of_stock'
    WHEN p.availability = 0 THEN 'unavailable'
    ELSE 'available'
  END             AS availability_status,
  (p.availability = 1 AND p.quantity > 0) AS is_purchasable
FROM products p
JOIN categories      c  ON c.id  = p.category_id AND c.is_active = 1
JOIN seller_profiles sp ON sp.id = p.seller_id   AND sp.approval_status = 'approved'
JOIN users           u  ON u.id  = sp.user_id    AND u.status = 'active'
WHERE p.deleted_at IS NULL;

-- 7.2 Low-stock products for the seller inventory view (SEL-09).
CREATE OR REPLACE VIEW v_low_stock AS
SELECT p.id AS product_id, p.seller_id, p.name, p.unit, p.quantity, p.low_stock_threshold
FROM products p
WHERE p.deleted_at IS NULL
  AND p.quantity <= p.low_stock_threshold;

-- 7.3 Daily sales per seller — Completed orders only (SEL-12, BR-12). Dates are UTC;
--     convert to Africa/Lagos in the app if day boundaries matter.
CREATE OR REPLACE VIEW v_seller_sales_daily AS
SELECT
  o.seller_id,
  DATE(o.completed_at) AS sale_date,
  COUNT(*)             AS orders_count,
  SUM(o.total_amount)  AS total_sales
FROM orders o
WHERE o.status = 'completed'
GROUP BY o.seller_id, DATE(o.completed_at);

-- 7.4 Quantity and revenue sold per product (Completed orders) (SEL-12 "products sold").
CREATE OR REPLACE VIEW v_seller_products_sold AS
SELECT
  o.seller_id,
  oi.product_id,
  MAX(oi.product_name) AS product_name,
  SUM(oi.quantity)     AS quantity_sold,
  SUM(oi.subtotal)     AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
GROUP BY o.seller_id, oi.product_id;

-- 7.5 Popularity = quantity sold in Completed orders over the last 30 days (A-04, SRCH-05).
CREATE OR REPLACE VIEW v_product_popularity_30d AS
SELECT oi.product_id, SUM(oi.quantity) AS quantity_sold_30d
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
             AND o.status = 'completed'
             AND o.completed_at >= (UTC_TIMESTAMP() - INTERVAL 30 DAY)
GROUP BY oi.product_id;

-- ---------------------------------------------------------------------
-- 8. SEED / REFERENCE DATA
-- ---------------------------------------------------------------------

-- 8.1 Allowed order status transitions (SRS 3.6.2). Reversals only via admin override.
INSERT INTO order_status_transitions (from_status, to_status) VALUES
  ('pending',    'confirmed'),
  ('confirmed',  'processing'),
  ('processing', 'ready'),
  ('ready',      'completed'),
  ('pending',    'cancelled'),
  ('confirmed',  'cancelled'),
  ('processing', 'cancelled'),
  ('ready',      'cancelled');       -- app restricts this one to administrators

-- 8.2 Categories (source section 10). Admin can add more.
INSERT INTO categories (name, description) VALUES
  ('Tomato',           'Fresh tomatoes'),
  ('Pepper',           'Peppers (bell, chilli, scotch bonnet, etc.)'),
  ('Onion',            'Onions'),
  ('Carrot',           'Carrots'),
  ('Cabbage',          'Cabbage'),
  ('Spinach',          'Spinach and leafy greens'),
  ('Lettuce',          'Lettuce'),
  ('Cucumber',         'Cucumbers'),
  ('Potato',           'Potatoes'),
  ('Other vegetables', 'Vegetables not listed in another category');

-- 8.3 Marketplace information (ADM-08). Admin edits these in Settings.
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('site_name',     'Vegetable Joint'),
  ('contact_email', NULL),
  ('contact_phone', NULL),
  ('support_text',  'Need help? Contact us and we will get back to you.'),
  ('footer_text',   '© Vegetable Joint. All rights reserved.');

-- 8.4 Units of sale (A-... in SRS 5.5): kg, basket, bag, bunch, piece, crate.
--     products.unit is a free VARCHAR in the SRS; the app should validate against this list.

-- 8.5 First administrator. Do NOT store a real password here. Create the admin through a
--     Laravel seeder/artisan command so the password is hashed with bcrypt/Argon2 (AUTH-10).
-- INSERT INTO users (name, email, phone, password, role, status, email_verified_at)
-- VALUES ('Platform Admin', 'admin@example.com', '+2340000000000', '<BCRYPT_HASH_HERE>', 'admin', 'active', UTC_TIMESTAMP());

-- ---------------------------------------------------------------------
-- 9. REFERENCE QUERIES (commented; for the Laravel service layer)
-- ---------------------------------------------------------------------

-- 9.1 Place an order — must all happen in ONE transaction (CHK-07, NFR-REL-03).
--     For each cart line, lock and decrement stock atomically; abort with HTTP 409 if 0 rows updated:
--
--   START TRANSACTION;
--   UPDATE products
--      SET quantity = quantity - :qty
--    WHERE id = :product_id AND deleted_at IS NULL AND availability = 1 AND quantity >= :qty;
--   -- ROW_COUNT() = 0  ->  ROLLBACK; report insufficient stock
--   INSERT INTO orders (order_number, checkout_ref, buyer_id, seller_id, total_amount,
--                       delivery_name, delivery_phone, delivery_address, notes)
--   VALUES (:no, :uuid, :buyer, :seller, :total, :dname, :dphone, :daddr, :notes);
--   INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, price)  -- NOT subtotal
--   VALUES (:order_id, :product_id, :name, :unit, :qty, :price);
--   INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
--   VALUES (:order_id, NULL, 'pending', :buyer);
--   COMMIT;
--   -- A duplicate (checkout_ref, seller_id) raises error 1062 -> treat as an idempotent retry.

-- 9.2 Cancel an order and restore stock (ORD-03, BR-05):
--
--   START TRANSACTION;
--   UPDATE orders SET status = 'cancelled', cancel_reason = :reason WHERE id = :id;   -- trigger validates transition
--   UPDATE products p JOIN order_items oi ON oi.product_id = p.id
--      SET p.quantity = p.quantity + oi.quantity
--    WHERE oi.order_id = :id;
--   INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
--   VALUES (:id, :old_status, 'cancelled', :actor, :reason);
--   COMMIT;

-- 9.3 Admin status override (ADM-07):
--   SET @vj_admin_override = 1;
--   UPDATE orders SET status = :new_status WHERE id = :id;
--   SET @vj_admin_override = 0;
--   INSERT INTO order_status_history (...) VALUES (..., 'Admin override: <reason>');

-- 9.4 Reconciliation check — order totals must equal the sum of their items (should return 0 rows):
--   SELECT o.id, o.total_amount, SUM(oi.subtotal) AS items_total
--     FROM orders o JOIN order_items oi ON oi.order_id = o.id
--    GROUP BY o.id, o.total_amount
--   HAVING o.total_amount <> SUM(oi.subtotal);

-- 9.5 Search (SRCH-01): FULLTEXT for word matches, LIKE for partial matches (leading % cannot use an index):
--   SELECT * FROM v_public_products WHERE MATCH(name, description) AGAINST (:q IN NATURAL LANGUAGE MODE);   -- run on products
--   SELECT * FROM v_public_products WHERE name LIKE CONCAT('%', :q, '%') OR category_name LIKE CONCAT('%', :q, '%')
--                                      OR seller_name LIKE CONCAT('%', :q, '%');

-- ======================== END OF SCHEMA ========================
