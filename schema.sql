-- Database Schema for Order Tracker (Single-User Self-Use)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Email Accounts Table
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'mock', -- 'mock', 'imap'
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., { "password": "xxx", "host": "imap.gmail.com", "port": 993 }
    status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'error', 'syncing'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration commands for existing databases:
-- CREATE TABLE IF NOT EXISTS raw_emails (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
--     subject TEXT NOT NULL,
--     from_address TEXT NOT NULL,
--     html_content TEXT,
--     date TIMESTAMP WITH TIME ZONE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping JSONB DEFAULT 'null'::jsonb;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS raw_email_ids UUID[] DEFAULT '{}'::uuid[];
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 1.5 Raw Emails Table (Audit Trail & Reprocessing)
CREATE TABLE IF NOT EXISTS raw_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    delivered_to TEXT,
    html_content TEXT,
    date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    retailer TEXT NOT NULL, -- Amazon, Best Buy, Nike, Target, Pokemon Center, EB Games, Walmart, etc.
    order_number TEXT NOT NULL,
    tracking_number TEXT,
    carrier TEXT, -- USPS, UPS, FedEx, DHL, mock, in_store_pickup, unknown
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, backordered, shipped, out_for_delivery, delivered, exception, cancelled, refunded
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, sku, quantity, unit_price, item_status }
    tracking_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { status, details, location, timestamp }
    shipping JSONB DEFAULT 'null'::jsonb, -- holds { carrier, tracking_number, tracking_url, estimated_delivery, shipped_date }
    currency TEXT DEFAULT 'USD',
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivered_to TEXT,
    original_recipient TEXT,
    raw_email_ids UUID[] DEFAULT '{}'::uuid[],
    delivery_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(retailer, order_number)
);

-- 3. Inventory / P&L Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(10, 2),
    shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_stock', -- 'in_stock', 'sold'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sync Logs Table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'failed'
    message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Global Settings Table (Key-Value)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Seed Initial Settings
INSERT INTO settings (key, value)
VALUES ('discord_webhook', '{"url": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed a default Mock Account if none exists (for easier onboarding)
INSERT INTO email_accounts (email, provider, credentials, status)
VALUES ('demo@ordertracker.local', 'mock', '{"speed": 1}'::jsonb, 'connected')
ON CONFLICT (email) DO NOTHING;

-- Trigger to automatically update the updated_at column on orders
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_modtime
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
