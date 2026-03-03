# Hướng dẫn Authentication trong dự án Node.js Booking

> Tài liệu này giải thích từng phần nhỏ của hệ thống xác thực (Authentication) trong dự án, dành cho người mới bắt đầu.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Các thư viện sử dụng](#2-các-thư-viện-sử-dụng)
3. [Luồng Authentication](#3-luồng-authentication)
4. [Chi tiết từng thành phần](#4-chi-tiết-từng-thành-phần)
5. [JWT - Token là gì?](#5-jwt---token-là-gì)
6. [Cookie vs localStorage](#6-cookie-vs-localstorage)
7. [Middleware - Trái tim của bảo vệ route](#7-middleware---trái-tim-của-bảo-vệ-route)
8. [Sơ đồ luồng tổng thể](#8-sơ-đồ-luồng-tổng-thể)

---

## 1. Tổng quan kiến trúc

Trong dự án này, cấu trúc authentication được thiết kế như sau:

- **User thường (không đăng nhập)**: Chỉ truy cập trang chủ, đặt phòng công khai
- **User đăng nhập**: Có **full quyền** truy cập `/admin` (dashboard, bookings, rooms, settings...)

```
┌─────────────────────────────────────────────────────────────────┐
│                        KIẾN TRÚC ROUTE                           │
├─────────────────────────────────────────────────────────────────┤
│  /              → Trang chủ (public)                             │
│  /users         → Users (public)                                 │
│  /api/auth      → API đăng ký, đăng nhập (public)                │
│  /admin/login   → Form đăng nhập (public)                        │
│  /admin/register→ Form đăng ký (public)                          │
│  /admin/*       → Tất cả route còn lại (BẢO VỆ - cần đăng nhập)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Các thư viện sử dụng

| Thư viện | Mục đích |
|----------|----------|
| **bcrypt** | Mã hóa mật khẩu (hash) - không lưu password dạng plain text |
| **jsonwebtoken (JWT)** | Tạo và xác minh token sau khi đăng nhập thành công |
| **cookie-parser** | Đọc cookie từ request (để lấy token) |
| **pg** | Kết nối PostgreSQL - lưu user trong database |

---

## 3. Luồng Authentication

### 3.1 Đăng ký (Register)

```
User điền form → POST /api/auth/register → Lưu vào DB (password đã hash) → Chuyển đến /admin/login
```

### 3.2 Đăng nhập (Login)

```
User điền form → POST /api/auth/login → Kiểm tra email + password → Tạo JWT → Set cookie + trả token → Chuyển đến /admin
```

### 3.3 Truy cập trang bảo vệ (ví dụ /admin/dashboard)

```
Request đến /admin/dashboard → Middleware kiểm tra token → Hợp lệ? → Cho vào / Không? → Redirect /admin/login
```

### 3.4 Đăng xuất (Logout)

```
GET /admin/logout → Xóa cookie token → Redirect /admin/login
```

---

## 4. Chi tiết từng thành phần

### 4.1 `app.js` - Điểm vào ứng dụng

```javascript
app.use(cookieParser());        // Cho phép đọc req.cookies
app.use('/api/auth', authRouter);   // Route API đăng ký/đăng nhập
app.use('/admin', adminRouter);     // Route admin (có public + protected)
```

**Tại sao cần `cookieParser()`?**  
Khi user đăng nhập, server gửi cookie chứa token. Mỗi request sau đó, trình duyệt tự động gửi cookie kèm theo. `cookieParser()` giúp Express đọc và parse cookie thành `req.cookies`.

---

### 4.2 `routes/auth.js` - Route API Auth

```javascript
router.post("/register", authController.register);
router.post("/login", authController.login);
```

- **Đường dẫn thực tế**: `/api/auth/register` và `/api/auth/login` (vì mount tại `/api/auth`)
- Đây là API **stateless** - không session, chỉ dùng JWT

---

### 4.3 `controllers/authController.js` - Logic đăng ký & đăng nhập

#### 4.3.1 Register

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

**Tại sao hash password?**  
- Không bao giờ lưu mật khẩu dạng plain text
- `bcrypt.hash(password, 10)` = mã hóa 1 chiều, "10" là số vòng salt (càng cao càng an toàn nhưng chậm hơn)

```javascript
await pool.query("INSERT INTO users (name, email, password) VALUES ($1,$2,$3) ...", [name, email, hashedPassword]);
```

- Lưu user vào bảng `users` trong PostgreSQL

#### 4.3.2 Login

**Bước 1**: Tìm user theo email

```javascript
const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });
```

**Bước 2**: So sánh password

```javascript
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
```

- `bcrypt.compare(plainPassword, hashedPassword)` → `true` nếu khớp

**Bước 3**: Tạo JWT và gửi cho client

```javascript
const token = jwt.sign(
  { id: user.id },           // Payload - data lưu trong token
  process.env.JWT_SECRET,    // Secret key (phải bảo mật!)
  { expiresIn: "1h" }        // Token hết hạn sau 1 giờ
);
```

**Bước 4**: Set cookie và trả JSON

```javascript
res.cookie("token", token, {
  httpOnly: true,              // JS không đọc được → chống XSS
  maxAge: 60 * 60 * 1000,      // 1 giờ
  sameSite: "lax",             // Chống CSRF cơ bản
  secure: process.env.NODE_ENV === "production"  // Chỉ gửi qua HTTPS khi production
});
res.json({ token });
```

---

### 4.4 `routes/admin.js` - Route Admin

Cấu trúc quan trọng:

```javascript
// ----- Public (không cần đăng nhập) -----
router.get('/login', redirectIfAdmin, ...);    // Form đăng nhập
router.get('/register', redirectIfAdmin, ...); // Form đăng ký
router.get('/logout', ...);                    // Đăng xuất

// ----- Protected (bắt buộc đăng nhập) -----
router.use(adminAuth);   // Từ đây trở đi, MỌI route đều cần token hợp lệ

router.get('/', ...);
router.get('/dashboard', ...);
router.get('/bookings', ...);
// ... các route khác
```

**Thứ tự định nghĩa route rất quan trọng!**

- Các route `/login`, `/register`, `/logout` được định nghĩa **trước** `router.use(adminAuth)`
- `router.use(adminAuth)` áp dụng cho **tất cả route phía dưới**
- Nếu đặt `adminAuth` lên trước, cả `/login` cũng sẽ yêu cầu đăng nhập → vòng lặp vô hạn!

---

### 4.5 `middlewares/adminAuthMiddleware.js` - Bảo vệ route

#### 4.5.1 `adminAuth` - Kiểm tra đã đăng nhập chưa

```javascript
function adminAuth(req, res, next) {
  const token =
    req.cookies?.token ||                                    // Lấy từ cookie
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);  // Hoặc header Authorization: Bearer <token>

  if (!token) {
    return res.redirect("/admin/login");   // Chưa có token → về trang login
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Xác minh token
    req.user = decoded;   // Gắn thông tin user vào request (để dùng ở route handler)
    next();               // Cho phép đi tiếp
  } catch (err) {
    return res.redirect("/admin/login");   // Token sai/hết hạn → về login
  }
}
```

**Tại sao lấy token từ 2 nơi?**
- **Cookie**: Trình duyệt tự gửi khi load trang (phù hợp server-render)
- **Authorization header**: Dùng khi gọi API từ JavaScript (fetch, axios)

#### 4.5.2 `redirectIfAdmin` - Tránh user đã login vào lại trang login

```javascript
function redirectIfAdmin(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) return next();   // Chưa login → cho vào trang login/register

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect("/admin");   // Đã login rồi → đẩy về dashboard
  } catch (_) {}
  next();   // Token hết hạn → vẫn cho vào trang login
}
```

**Mục đích**: User đã đăng nhập mà vào `/admin/login` → redirect ngay về `/admin` (tránh thừa).

---

## 5. JWT - Token là gì?

**JWT (JSON Web Token)** = chuỗi mã hóa chứa thông tin (payload).

### Cấu trúc JWT

```
header.payload.signature
```

- **header**: Loại token, thuật toán
- **payload**: Data (ví dụ `{ id: 1 }`) - **không nên** để thông tin nhạy cảm vì có thể decode
- **signature**: Chữ ký dùng `JWT_SECRET` - đảm bảo token không bị sửa

### Tại sao dùng JWT?

- **Stateless**: Server không cần lưu session
- **Scalable**: Nhiều server có thể xác minh token độc lập (cùng JWT_SECRET)
- **Có thời hạn**: `expiresIn: "1h"` → token tự hết hạn

### Lưu ý bảo mật

- `JWT_SECRET` phải đặt trong `.env`, **không** commit lên Git
- Token hết hạn → user phải đăng nhập lại

---

## 6. Cookie vs localStorage

Trong dự án có cả hai:

| Cơ chế | Nơi lưu | Ai gửi? | Dùng khi nào? |
|--------|---------|---------|---------------|
| **Cookie** | Server set qua `res.cookie()` | Trình duyệt tự gửi mỗi request | Load trang admin (server-render) |
| **localStorage** | Client set qua `localStorage.setItem()` | Cần code JS gửi trong header | Gọi API từ fetch/axios (nếu cần) |

**Trong dự án hiện tại**: Admin dùng server-render (Pug), nên **cookie** là cơ chế chính. `localStorage` trong `login.pug` có thể dư thừa hoặc dùng cho các API call từ frontend sau này.

---

## 7. Middleware - Trái tim của bảo vệ route

### Middleware là gì?

Middleware = hàm chạy **giữa** request và response:

```
Request → Middleware 1 → Middleware 2 → ... → Route Handler → Response
```

### Luồng với `adminAuth`

```
User request /admin/dashboard
    ↓
adminAuth chạy
    ↓
Có token? → Verify JWT
    ↓
Hợp lệ? → next() → Route handler chạy → Render dashboard
Không?   → res.redirect("/admin/login")
```

### `next()` là gì?

- Gọi `next()` = "cho phép request đi tiếp đến middleware/route tiếp theo"
- Không gọi `next()` = dừng chuỗi (đã gửi response rồi, ví dụ `res.redirect`)

---

## 8. Sơ đồ luồng tổng thể

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           LUỒNG ĐĂNG NHẬP                                    │
└──────────────────────────────────────────────────────────────────────────────┘

  User                    Browser                    Server
    │                         │                          │
    │  Vào /admin/login       │                          │
    │───────────────────────>│  GET /admin/login        │
    │                         │─────────────────────────>│
    │                         │                          │ redirectIfAdmin
    │                         │                          │ (chưa login → next)
    │                         │  Trả form login          │
    │                         │<─────────────────────────│
    │  Điền email, password   │                          │
    │───────────────────────>│                          │
    │                         │  POST /api/auth/login    │
    │                         │  Body: {email, password} │
    │                         │─────────────────────────>│
    │                         │                          │ authController.login
    │                         │                          │ - Query DB
    │                         │                          │ - bcrypt.compare
    │                         │                          │ - jwt.sign
    │                         │  Set-Cookie: token       │
    │                         │  Body: { token }         │
    │                         │<─────────────────────────│
    │  Redirect /admin        │                          │
    │<───────────────────────│  GET /admin              │
    │                         │  Cookie: token           │
    │                         │─────────────────────────>│
    │                         │                          │ adminAuth
    │                         │                          │ - jwt.verify ✓
    │                         │  Trả dashboard          │
    │                         │<─────────────────────────│
    │  Thấy dashboard         │                          │
    │<───────────────────────│                          │

┌──────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG TRUY CẬP TRANG BẢO VỆ (đã login)                     │
└──────────────────────────────────────────────────────────────────────────────┘

  User                    Browser                    Server
    │                         │                          │
    │  Click /admin/bookings  │                          │
    │───────────────────────>│  GET /admin/bookings     │
    │                         │  Cookie: token           │
    │                         │─────────────────────────>│
    │                         │                          │ adminAuth
    │                         │                          │ - Có token ✓
    │                         │                          │ - jwt.verify ✓
    │                         │                          │ - req.user = decoded
    │                         │                          │ - next()
    │                         │  Trả trang bookings      │
    │                         │<─────────────────────────│
    │  Thấy danh sách         │                          │
    │<───────────────────────│                          │

┌──────────────────────────────────────────────────────────────────────────────┐
│              LUỒNG TRUY CẬP TRANG BẢO VỆ (chưa login / token hết hạn)         │
└──────────────────────────────────────────────────────────────────────────────┘

  User                    Browser                    Server
    │                         │                          │
    │  Vào /admin/bookings    │                          │
    │  (không có cookie)      │                          │
    │───────────────────────>│  GET /admin/bookings     │
    │                         │  (không có Cookie)       │
    │                         │─────────────────────────>│
    │                         │                          │ adminAuth
    │                         │                          │ - !token
    │                         │                          │ - redirect /admin/login
    │                         │  302 /admin/login        │
    │                         │<─────────────────────────│
    │  Thấy form login        │                          │
    │<───────────────────────│                          │
```

---

## Tóm tắt nhanh

| Thành phần | Vai trò |
|------------|---------|
| **authController** | Xử lý register/login, hash password, tạo JWT, set cookie |
| **adminAuth** | Bảo vệ route: có token hợp lệ mới cho vào |
| **redirectIfAdmin** | Đã login thì không cho vào trang login/register |
| **cookieParser** | Đọc cookie từ request |
| **JWT** | Token chứa thông tin user, có thời hạn |
| **bcrypt** | Mã hóa password, không lưu plain text |

---

*Tài liệu được tạo dựa trên cấu trúc dự án Booking. Cập nhật: 2025-03-03*
