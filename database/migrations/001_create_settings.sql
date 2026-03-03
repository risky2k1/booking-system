-- Migration: Create settings table
-- Bảng key-value lưu cấu hình ứng dụng (site name, currency, timezone...)
-- Chạy: psql -U booking_user -d booking_db -f database/migrations/001_create_settings.sql

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index cho tìm kiếm nhanh (key đã là PK)
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Seed giá trị mặc định
INSERT INTO settings (key, value) VALUES
  ('siteName', 'Booking Hub'),
  ('currency', 'USD'),
  ('timezone', 'UTC')
ON CONFLICT (key) DO NOTHING;
