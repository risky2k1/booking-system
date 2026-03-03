var express = require('express');
var router = express.Router();

// Mock hotel data
var ROOMS = [
  { id: 1, slug: 'deluxe-ocean-view', name: 'Deluxe Ocean View', description: 'Wake up to stunning ocean views from your private balcony. Spacious room with premium amenities.', shortDesc: 'Stunning ocean views, private balcony, premium amenities.', price: 299, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'], amenities: ['King bed', 'Ocean view', 'Private balcony', 'Mini bar', 'Smart TV', 'Coffee machine'] },
  { id: 2, slug: 'executive-suite', name: 'Executive Suite', description: 'Luxurious suite with separate living area. Perfect for extended stays and business travelers.', shortDesc: 'Separate living area, ideal for extended stays.', price: 449, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'], amenities: ['King bed', 'Living room', 'Work desk', 'Jacuzzi', 'Mini bar', 'Room service'] },
  { id: 3, slug: 'garden-villa', name: 'Garden Villa', description: 'Private villa surrounded by tropical gardens. Ultimate privacy with pool access.', shortDesc: 'Private villa with tropical gardens and pool access.', price: 599, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'], amenities: ['King bed', 'Private pool', 'Garden view', 'Outdoor shower', 'Kitchenette', 'Butler service'] }
];

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

function findRoomBySlug(slug) {
  return ROOMS.find(function (r) { return r.slug === slug; });
}

/* GET / - Home */
router.get('/', function (req, res) {
  res.render('frontend/home', {
    title: 'Home',
    rooms: ROOMS.slice(0, 3),
    testimonials: TESTIMONIALS,
    features: FEATURES
  });
});

/* GET /rooms - Room list */
router.get('/rooms', function (req, res) {
  res.render('frontend/rooms', { title: 'Rooms', rooms: ROOMS });
});

/* GET /rooms/:slug - Room detail */
router.get('/rooms/:slug', function (req, res) {
  var room = findRoomBySlug(req.params.slug);
  if (!room) return res.status(404).render('error', { message: 'Room not found', error: { status: 404, stack: '' } });
  res.render('frontend/room-detail', { title: room.name, room: room });
});

/* GET /booking/:slug - Booking form */
router.get('/booking/:slug', function (req, res) {
  var room = findRoomBySlug(req.params.slug);
  if (!room) return res.status(404).render('error', { message: 'Room not found', error: { status: 404, stack: '' } });
  res.render('frontend/booking', { title: 'Book ' + room.name, room: room });
});

/* POST /booking/:slug - Submit booking */
router.post('/booking/:slug', function (req, res) {
  var room = findRoomBySlug(req.params.slug);
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
