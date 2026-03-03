# Hướng dẫn Settings trong dự án Node.js Booking

> Tài liệu này mô tả cấu trúc bảng `settings`, cách chạy migration và luồng xử lý cài đặt ứng dụng.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc bảng settings](#2-cấu-trúc-bảng-settings)
3. [Migration](#3-migration)
4. [Luồng xử lý](#4-luồng-xử-lý)
5. [Chi tiết từng thành phần](#5-chi-tiết-từng-thành-phần)
6. [Thêm setting mới](#6-thêm-setting-mới)

---

## 1. Tổng quan

Settings lưu cấu hình chung của ứng dụng (tên site, tiền tệ, múi giờ...). Dữ liệu được lưu trong PostgreSQL thay vì in-memory, đảm bảo:

- **Persistent**: Không mất khi restart server
- **Key-value**: Dễ mở rộng thêm setting mới
- **Mặc định**: Có giá trị fallback khi bảng trống hoặc lỗi

```
┌─────────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC SETTINGS                            │
├─────────────────────────────────────────────────────────────────┤
│  GET  /admin/settings  → Hiển thị form (đã đăng nhập)             │
│  POST /admin/settings  → Lưu cài đặt vào DB                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu trúc bảng settings

### 2.1 Schema

| Cột       | Kiểu        | Mô tả                          |
|-----------|-------------|--------------------------------|
| `key`     | VARCHAR(100)| Khóa duy nhất (PK)             |
| `value`   | TEXT        | Giá trị                        |
| `updated_at` | TIMESTAMP | Thời điểm cập nhật cuối       |

### 2.2 Các key mặc định

| Key       | Mô tả           | Giá trị mặc định |
|-----------|-----------------|------------------|
| `siteName`| Tên website     | `Booking Hub`    |
| `currency`| Đơn vị tiền tệ  | `USD`            |
| `timezone`| Múi giờ         | `UTC`            |

### 2.3 Ví dụ dữ liệu

```
 key      | value       | updated_at
----------+-------------+---------------------------
 siteName | Booking Hub | 2025-03-03 10:00:00+00
 currency | USD         | 2025-03-03 10:00:00+00
 timezone | UTC         | 2025-03-03 10:00:00+00
```

---

## 3. Migration

### 3.1 Chạy migration

```bash
# Đảm bảo .env có DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
npm run db:migrate
```

### 3.2 Chạy thủ công (psql)

```bash
psql -U booking_user -d booking_db -h localhost -p 5433 -f database/migrations/001_create_settings.sql
```

> **Lưu ý**: Docker expose Postgres ở port 5433, nên dùng `-p 5433` khi chạy local.

### 3.3 Nội dung migration

File `database/migrations/001_create_settings.sql`:

- Tạo bảng `settings` nếu chưa có
- Tạo index `idx_settings_updated_at`
- Seed giá trị mặc định (`ON CONFLICT DO NOTHING` để không ghi đè nếu đã có)

---

## 4. Luồng xử lý

### 4.1 GET /admin/settings (Xem form)

```
Request → adminAuth → settingsController.index
                            ↓
                    SELECT key, value FROM settings
                            ↓
                    Chuyển rows → object { siteName, currency, timezone }
                            ↓
                    res.render('admin/settings', { settings })
```

### 4.2 POST /admin/settings (Lưu)

```
Form submit → adminAuth → settingsController.update
                                ↓
                    req.body: { siteName, currency, timezone }
                                ↓
                    UPSERT từng key vào settings
                                ↓
                    res.redirect('/admin/settings')
```

---

## 5. Chi tiết từng thành phần

### 5.1 `controllers/settingsController.js`

#### `index(req, res)` – Hiển thị form

- Query `SELECT key, value FROM settings`
- Chuyển mảng rows thành object `{ siteName, currency, timezone }`
- Nếu lỗi DB → dùng `DEFAULTS`, vẫn render được form

#### `update(req, res)` – Lưu cài đặt

- Lấy `siteName`, `currency`, `timezone` từ `req.body`
- Dùng `INSERT ... ON CONFLICT (key) DO UPDATE` để upsert
- Redirect về `/admin/settings`

### 5.2 `routes/admin.js`

```javascript
router.get('/settings', settingsController.index);
router.post('/settings', settingsController.update);
```

Cả hai route nằm **sau** `router.use(adminAuth)` → cần đăng nhập mới truy cập.

### 5.3 `views/admin/settings.pug`

Form POST đến `/admin/settings` với các field:

- `siteName` (text, required)
- `currency` (select: USD, EUR, GBP)
- `timezone` (text, mặc định UTC)

---

## 6. Thêm setting mới

### Bước 1: Thêm vào migration (nếu cần seed)

```sql
INSERT INTO settings (key, value) VALUES ('newKey', 'defaultValue')
ON CONFLICT (key) DO NOTHING;
```

### Bước 2: Cập nhật `settingsController.js`

- Thêm key vào `DEFAULTS`
- Thêm vào mảng `updates` trong `update()`

### Bước 3: Cập nhật form trong `views/admin/settings.pug`

Thêm input/select tương ứng với key mới.

### Bước 4: Chạy lại migration (hoặc INSERT thủ công)

```bash
npm run db:migrate
```

---

## Tài liệu liên quan

- [AUTHENTICATION-GUIDE.md](./AUTHENTICATION-GUIDE.md) – Bảo vệ route admin
- [config/db.js](../config/db.js) – Kết nối PostgreSQL
