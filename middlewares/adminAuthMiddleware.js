const jwt = require("jsonwebtoken");

/**
 * Protect admin routes: require valid JWT (from cookie or Authorization header).
 * Otherwise redirect to /admin/login.
 */
function adminAuth(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.redirect("/admin/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
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
