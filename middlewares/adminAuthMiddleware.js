const jwt = require("jsonwebtoken");

/**
 * Protect admin routes: require valid JWT (from cookie or Authorization header).
 * Otherwise redirect to /admin/login.
 */
function adminAuth(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  console.log("[adminAuth] Token:", token ? "CÓ" : "KHÔNG");
  if (token) {
    console.log("[adminAuth] Nguồn:", req.cookies?.token ? "cookie" : "Authorization header");
  }

  if (!token) {
    console.log("[adminAuth] → Redirect /admin/login (không có token)");
    return res.redirect("/admin/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("[adminAuth] Token hợp lệ, user:", decoded);
    next();
  } catch (err) {
    console.log("[adminAuth] Token không hợp lệ:", err.message);
    console.log("[adminAuth] → Redirect /admin/login");
    return res.redirect("/admin/login");
  }
}

/**
 * If already logged in, redirect to dashboard (for login/register pages).
 */
function redirectIfAdmin(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) return next();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect("/admin");
  } catch (_) {}
  next();
}

module.exports = { adminAuth, redirectIfAdmin };
