-- Migration: Create rooms and room_prices tables
-- Rooms: ảnh chính, ảnh phụ, tên, dịch vụ, số giường, trạng thái
-- Prices: giá thường (weekday), giá cuối tuần (weekend)

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  main_image VARCHAR(500) DEFAULT '',
  images JSONB DEFAULT '[]',
  amenities TEXT DEFAULT '',
  beds INT NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_prices (
  room_id INT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  weekday DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekend DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
