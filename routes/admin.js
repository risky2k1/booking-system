/**
 * ADMIN ROUTE MAP
 * GET     /admin
 * GET     /admin/bookings
 * GET     /admin/bookings/:id
 * PATCH   /admin/bookings/:id
 * GET     /admin/rooms
 * GET     /admin/rooms/create
 * POST    /admin/rooms
 * GET     /admin/rooms/:id/edit
 * PUT     /admin/rooms/:id
 * GET     /admin/pricing
 * POST    /admin/pricing
 * GET     /admin/settings
 * POST    /admin/settings
 */

var express = require('express');
var router = express.Router();
var adminAuth = require('../middlewares/adminAuthMiddleware').adminAuth;
var redirectIfAdmin = require('../middlewares/adminAuthMiddleware').redirectIfAdmin;
var docsController = require('../controllers/docsController');
var settingsController = require('../controllers/settingsController');
var roomController = require('../controllers/roomController');
var pricingController = require('../controllers/pricingController');
var redirectWithToast = require('../utils/redirectWithToast');
var pool = require('../config/db');

// ----- Public (no auth) -----
// GET /admin/login
router.get('/login', redirectIfAdmin, function (req, res) {
  res.render('admin/login', { title: 'Login', error: null });
});

// GET /admin/register
router.get('/register', redirectIfAdmin, function (req, res) {
  res.render('admin/register', { title: 'Register', error: null });
});

// GET /admin/logout
router.get('/logout', function (req, res) {
  res.clearCookie('token');
  redirectWithToast(res, '/admin/login', 'success', 'Logged out successfully');
});

// ----- Protected (admin auth required) -----
router.use(adminAuth);
router.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
});

// In-memory store for demo (replace with DB later)
var bookingsStore = [
  { id: '1', guestName: 'John Doe', roomId: 'r1', roomName: 'Deluxe Suite', checkIn: '2025-03-05', checkOut: '2025-03-08', status: 'confirmed', total: 450 },
  { id: '2', guestName: 'Jane Smith', roomId: 'r2', roomName: 'Standard Room', checkIn: '2025-03-10', checkOut: '2025-03-12', status: 'pending', total: 220 },
  { id: '3', guestName: 'Bob Wilson', roomId: 'r1', roomName: 'Deluxe Suite', checkIn: '2025-03-15', checkOut: '2025-03-18', status: 'cancelled', total: 0 }
];
// GET /admin
router.get('/', function (req, res) {
  res.redirect('/admin/dashboard');
});

// GET /admin/docs
router.get('/docs', docsController.index);
router.get('/docs/:slug', docsController.show);

// GET /admin/dashboard
router.get('/dashboard', function (req, res, next) {
  var stats = {
    totalBookings: bookingsStore.length,
    confirmedBookings: bookingsStore.filter(function (b) { return b.status === 'confirmed'; }).length,
    totalRooms: 0,
    revenue: bookingsStore.filter(function (b) { return b.status === 'confirmed'; }).reduce(function (s, b) { return s + (b.total || 0); }, 0)
  };
  pool.query('SELECT COUNT(*)::int as c FROM rooms').then(function (r) {
    stats.totalRooms = r.rows[0] ? r.rows[0].c : 0;
    res.render('admin/dashboard', { title: 'Dashboard', path: 'dashboard', stats: stats });
  }).catch(next);
});

// GET /admin/bookings
router.get('/bookings', function (req, res) {
  res.render('admin/bookings', { title: 'Bookings', path: 'bookings', bookings: bookingsStore });
});

// GET /admin/bookings/:id
router.get('/bookings/:id', function (req, res) {
  var booking = bookingsStore.find(function (b) { return b.id === req.params.id; });
  if (!booking) return res.status(404).send('Booking not found');
  res.render('admin/booking-detail', { title: 'Booking #' + booking.id, path: 'bookings', booking: booking });
});

// PATCH /admin/bookings/:id
router.patch('/bookings/:id', express.json(), function (req, res) {
  var idx = bookingsStore.findIndex(function (b) { return b.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
  if (req.body.status) bookingsStore[idx].status = req.body.status;
  res.json(bookingsStore[idx]);
});

// GET /admin/rooms
router.get('/rooms', roomController.index);

// GET /admin/rooms/create
router.get('/rooms/create', roomController.createForm);

// POST /admin/rooms
router.post('/rooms', roomController.create);

// GET /admin/rooms/:id/edit
router.get('/rooms/:id/edit', roomController.editForm);

// PUT /admin/rooms/:id
router.put('/rooms/:id', roomController.update);

// GET /admin/pricing
router.get('/pricing', pricingController.index);

// POST /admin/pricing
router.post('/pricing', express.urlencoded({ extended: true }), pricingController.update);

// GET /admin/settings
router.get('/settings', settingsController.index);

// POST /admin/settings
router.post('/settings', settingsController.update);

module.exports = router;
