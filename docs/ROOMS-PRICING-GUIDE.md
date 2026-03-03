# Hướng dẫn Rooms & Pricing trong dự án Node.js Booking

> Tài liệu mô tả cấu trúc bảng `rooms`, `room_prices`, luồng xử lý và cách quản lý phòng + giá.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc bảng](#2-cấu-trúc-bảng)
3. [Migration](#3-migration)
4. [Luồng xử lý](#4-luồng-xử-lý)
5. [Chi tiết từng thành phần](#5-chi-tiết-từng-thành-phần)

---

## 1. Tổng quan

- **Rooms**: Phòng có ảnh chính, ảnh phụ, tên, danh sách dịch vụ, số giường, trạng thái
- **Pricing**: Mỗi phòng có giá ngày thường (weekday) và giá cuối tuần (weekend)

```
┌─────────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC ROUTES                              │
├─────────────────────────────────────────────────────────────────┤
│  Rooms                                                           │
│  GET    /admin/rooms           → Danh sách phòng                 │
│  GET    /admin/rooms/create     → Form tạo phòng                  │
│  POST   /admin/rooms           → Tạo phòng                        │
│  GET    /admin/rooms/:id/edit  → Form sửa phòng                  │
│  PUT    /admin/rooms/:id       → Cập nhật phòng                  │
│                                                                  │
│  Pricing                                                         │
│  GET    /admin/pricing         → Bảng giá theo phòng             │
│  POST   /admin/pricing         → Cập nhật giá                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu trúc bảng

### 2.1 Bảng `rooms`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(200) | Tên phòng |
| main_image | VARCHAR(500) | URL ảnh chính |
| images | JSONB | Mảng URL ảnh phụ |
| amenities | TEXT | Dịch vụ (WiFi, TV, Minibar...) |
| beds | INT | Số giường |
| status | VARCHAR(20) | active / inactive |
| created_at | TIMESTAMP | Thời điểm tạo |
| updated_at | TIMESTAMP | Thời điểm cập nhật |

### 2.2 Bảng `room_prices`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| room_id | INT | PK, FK → rooms(id) |
| weekday | DECIMAL(10,2) | Giá ngày thường |
| weekend | DECIMAL(10,2) | Giá cuối tuần |
| updated_at | TIMESTAMP | Thời điểm cập nhật |

### 2.3 Quan hệ

- Một phòng có **một** bản ghi giá (1-1)
- `ON DELETE CASCADE`: Xóa phòng → xóa giá theo

---

## 3. Migration

### 3.1 Chạy migration

```bash
npm run db:migrate
```

### 3.2 File migration

`database/migrations/002_create_rooms_and_prices.sql`:

- Tạo bảng `rooms`, `room_prices`
- Index `idx_rooms_status` trên `rooms(status)`

---

## 4. Luồng xử lý

### 4.1 Tạo phòng (POST /admin/rooms)

```
Form submit → roomController.create
    ↓
INSERT INTO rooms (name, main_image, images, amenities, beds, status)
    ↓
INSERT INTO room_prices (room_id, weekday, weekend) VALUES (new_id, 0, 0)
    ↓
redirectWithToast → /admin/rooms
```

### 4.2 Cập nhật phòng (PUT /admin/rooms/:id)

```
Form submit → roomController.update
    ↓
UPDATE rooms SET ... WHERE id = :id
    ↓
redirectWithToast → /admin/rooms
```

### 4.3 Cập nhật giá (POST /admin/pricing)

```
Form submit → pricingController.update
    ↓
INSERT INTO room_prices ... ON CONFLICT (room_id) DO UPDATE SET weekday, weekend
    ↓
redirectWithToast → /admin/pricing
```

---

## 5. Chi tiết từng thành phần

### 5.1 `controllers/roomController.js`

| Hàm | Route | Mô tả |
|-----|-------|-------|
| index | GET /admin/rooms | JOIN rooms + room_prices, render danh sách |
| createForm | GET /admin/rooms/create | Form tạo phòng |
| create | POST /admin/rooms | INSERT room + room_prices (0,0) |
| editForm | GET /admin/rooms/:id/edit | Lấy room + pricing, render form |
| update | PUT /admin/rooms/:id | UPDATE room |

**Ảnh**: `main_image` (URL), `images` (comma-separated → JSONB array)

### 5.2 `controllers/pricingController.js`

| Hàm | Route | Mô tả |
|-----|-------|-------|
| index | GET /admin/pricing | JOIN rooms + room_prices, render bảng |
| update | POST /admin/pricing | UPSERT room_prices |

### 5.3 `views/admin/room-form.pug`

Form fields: name, main_image, images (comma-separated), amenities, beds, status

### 5.4 `views/admin/pricing.pug`

Bảng: room_name, weekday, weekend. Form cập nhật: chọn phòng (Edit) → nhập weekday, weekend → Save

---

## Tài liệu liên quan

- [Settings](/admin/docs/settings) – Cài đặt ứng dụng
- [Authentication](/admin/docs/authentication) – Bảo vệ route admin
