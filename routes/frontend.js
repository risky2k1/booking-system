var express = require('express');
var router = express.Router();
var frontendRooms = require('../services/frontendRooms');

var TESTIMONIALS = [
  { name: 'Sarah Mitchell', text: 'An unforgettable experience. The ocean view room exceeded all expectations.', rating: 5 },
  { name: 'James Chen', text: 'Best hotel stay we\'ve ever had. Impeccable service and stunning rooms.', rating: 5 },
  { name: 'Emma Rodriguez', text: 'The garden villa was pure paradise. We\'ll definitely be back.', rating: 5 }
];

var FEATURES = [
  { title: '24/7 Concierge', desc: 'Round-the-clock personalized service for all your needs.' },
  { title: 'World-Class Spa', desc: 'Rejuvenate with our award-winning spa treatments.' },
  { title: 'Fine Dining', desc: 'Michelin-starred cuisine with ocean views.' }
];

/* GET / - Home */
router.get('/', function (req, res, next) {
  frontendRooms.getRooms()
    .then(function (rooms) {
      res.render('frontend/home', {
        title: 'Home',
        rooms: rooms.slice(0, 3),
        testimonials: TESTIMONIALS,
        features: FEATURES
      });
    })
    .catch(next);
});

/* GET /rooms - Room list */
router.get('/rooms', function (req, res, next) {
  frontendRooms.getRooms()
    .then(function (rooms) {
      res.render('frontend/rooms', { title: 'Rooms', rooms: rooms });
    })
    .catch(next);
});

/* GET /rooms/:slug - Room detail */
router.get('/rooms/:slug', function (req, res, next) {
  frontendRooms.findRoomBySlug(req.params.slug)
    .then(function (room) {
      if (!room) return res.status(404).render('error', { message: 'Room not found', error: { status: 404, stack: '' } });
      res.render('frontend/room-detail', { title: room.name, room: room });
    })
    .catch(next);
});

/* GET /booking/:slug - Booking form */
router.get('/booking/:slug', function (req, res, next) {
  frontendRooms.findRoomBySlug(req.params.slug)
    .then(function (room) {
      if (!room) return res.status(404).render('error', { message: 'Room not found', error: { status: 404, stack: '' } });
      res.render('frontend/booking', { title: 'Book ' + room.name, room: room });
    })
    .catch(next);
});

/* POST /booking/:slug - Submit booking */
router.post('/booking/:slug', function (req, res, next) {
  frontendRooms.findRoomBySlug(req.params.slug)
    .then(function (room) {
      if (!room) return res.status(404).render('error', { message: 'Room not found', error: { status: 404, stack: '' } });
      var checkIn = req.body.checkIn || '';
      var checkOut = req.body.checkOut || '';
      var adults = parseInt(req.body.adults, 10) || 1;
      var children = parseInt(req.body.children, 10) || 0;
      var nights = 1;
      if (checkIn && checkOut) {
        var d1 = new Date(checkIn);
        var d2 = new Date(checkOut);
        nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
      }
      var total = room.price * nights;
      res.redirect('/booking-success?ref=' + Date.now() + '&total=' + total + '&room=' + encodeURIComponent(room.name));
    })
    .catch(next);
});

/* GET /booking-success */
router.get('/booking-success', function (req, res) {
  res.render('frontend/booking-success', {
    title: 'Booking Confirmed',
    ref: req.query.ref || 'N/A',
    total: req.query.total || '0',
    room: req.query.room ? decodeURIComponent(req.query.room) : 'Room'
  });
});

/* GET /about */
router.get('/about', function (req, res) {
  res.render('frontend/about', { title: 'About Us' });
});

/* GET /contact */
router.get('/contact', function (req, res) {
  res.render('frontend/contact', { title: 'Contact' });
});

module.exports = router;
