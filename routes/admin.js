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
  res.redirect('/admin/login');
});

// ----- Protected (admin auth required) -----
router.use(adminAuth);

// In-memory store for demo (replace with DB later)
var bookingsStore = [
  { id: '1', guestName: 'John Doe', roomId: 'r1', roomName: 'Deluxe Suite', checkIn: '2025-03-05', checkOut: '2025-03-08', status: 'confirmed', total: 450 },
  { id: '2', guestName: 'Jane Smith', roomId: 'r2', roomName: 'Standard Room', checkIn: '2025-03-10', checkOut: '2025-03-12', status: 'pending', total: 220 },
  { id: '3', guestName: 'Bob Wilson', roomId: 'r1', roomName: 'Deluxe Suite', checkIn: '2025-03-15', checkOut: '2025-03-18', status: 'cancelled', total: 0 }
];
var roomsStore = [
  { id: 'r1', name: 'Deluxe Suite', capacity: 2, amenities: 'WiFi, TV, Minibar', status: 'active' },
  { id: 'r2', name: 'Standard Room', capacity: 2, amenities: 'WiFi, TV', status: 'active' },
  { id: 'r3', name: 'Family Room', capacity: 4, amenities: 'WiFi, TV, Sofa', status: 'active' }
];
var pricingStore = [
  { roomId: 'r1', roomName: 'Deluxe Suite', weekday: 150, weekend: 180 },
  { roomId: 'r2', roomName: 'Standard Room', weekday: 80, weekend: 100 },
  { roomId: 'r3', roomName: 'Family Room', weekday: 120, weekend: 150 }
];
var settingsStore = { siteName: 'Booking Hub', currency: 'USD', timezone: 'UTC' };

// GET /admin
router.get('/', function (req, res) {
  res.redirect('/admin/dashboard');
});

// GET /admin/docs
router.get('/docs', docsController.index);
router.get('/docs/:slug', docsController.show);

// GET /admin/dashboard
router.get('/dashboard', function (req, res) {
  var stats = {
    totalBookings: bookingsStore.length,
    confirmedBookings: bookingsStore.filter(function (b) { return b.status === 'confirmed'; }).length,
    totalRooms: roomsStore.length,
    revenue: bookingsStore.filter(function (b) { return b.status === 'confirmed'; }).reduce(function (s, b) { return s + (b.total || 0); }, 0)
  };
  res.render('admin/dashboard', { title: 'Dashboard', path: 'dashboard', stats: stats });
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
router.get('/rooms', function (req, res) {
  res.render('admin/rooms', { title: 'Rooms', path: 'rooms', rooms: roomsStore });
});

// GET /admin/rooms/create
router.get('/rooms/create', function (req, res) {
  res.render('admin/room-form', { title: 'Create Room', path: 'rooms', room: null });
});

// POST /admin/rooms
router.post('/rooms', function (req, res) {
  var nums = roomsStore.map(function (r) { return parseInt(r.id.replace(/\D/g, ''), 10) || 0; });
  var id = 'r' + (nums.length ? Math.max.apply(null, nums) + 1 : 1);
  var room = {
    id: id,
    name: req.body.name || 'Unnamed',
    capacity: parseInt(req.body.capacity, 10) || 2,
    amenities: req.body.amenities || '',
    status: req.body.status || 'active'
  };
  roomsStore.push(room);
  res.redirect('/admin/rooms');
});

// GET /admin/rooms/:id/edit
router.get('/rooms/:id/edit', function (req, res) {
  var room = roomsStore.find(function (r) { return r.id === req.params.id; });
  if (!room) return res.status(404).send('Room not found');
  res.render('admin/room-form', { title: 'Edit Room', path: 'rooms', room: room });
});

// PUT /admin/rooms/:id
router.put('/rooms/:id', function (req, res) {
  var idx = roomsStore.findIndex(function (r) { return r.id === req.params.id; });
  if (idx === -1) return res.status(404).send('Room not found');
  roomsStore[idx].name = req.body.name || roomsStore[idx].name;
  roomsStore[idx].capacity = parseInt(req.body.capacity, 10) || roomsStore[idx].capacity;
  roomsStore[idx].amenities = req.body.amenities || roomsStore[idx].amenities;
  roomsStore[idx].status = req.body.status || roomsStore[idx].status;
  res.redirect('/admin/rooms');
});

// GET /admin/pricing
router.get('/pricing', function (req, res) {
  res.render('admin/pricing', { title: 'Pricing', path: 'pricing', pricing: pricingStore });
});

// POST /admin/pricing
router.post('/pricing', express.urlencoded({ extended: true }), function (req, res) {
  var roomId = req.body.roomId;
  var idx = pricingStore.findIndex(function (p) { return p.roomId === roomId; });
  var row = idx >= 0 ? pricingStore[idx] : { roomId: roomId, roomName: req.body.roomName || roomId };
  row.weekday = parseFloat(req.body.weekday) || 0;
  row.weekend = parseFloat(req.body.weekend) || 0;
  if (idx < 0) pricingStore.push(row);
  res.redirect('/admin/pricing');
});

// GET /admin/settings
router.get('/settings', function (req, res) {
  res.render('admin/settings', { title: 'Settings', path: 'settings', settings: settingsStore });
});

// POST /admin/settings
router.post('/settings', function (req, res) {
  settingsStore.siteName = req.body.siteName || settingsStore.siteName;
  settingsStore.currency = req.body.currency || settingsStore.currency;
  settingsStore.timezone = req.body.timezone || settingsStore.timezone;
  res.redirect('/admin/settings');
});

module.exports = router;
