/**
 * Frontend room service - fetches rooms from DB and maps to frontend format
 */
var pool = require('../config/db');

function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseAmenities(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function parseImages(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    var parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

var PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800';

function mapDbRoomToFrontend(row) {
  var images = parseImages(row.images);
  var mainImg = row.main_image || images[0] || PLACEHOLDER_IMAGE;
  var amenities = parseAmenities(row.amenities);
  var price = parseFloat(row.weekday) || parseFloat(row.weekend) || 0;

  var allImages = mainImg ? [mainImg].concat(images.filter(function (u) { return u && u !== mainImg; })) : images;
  if (allImages.length === 0) allImages = [PLACEHOLDER_IMAGE];

  return {
    id: row.id,
    slug: slugify(row.name),
    name: row.name,
    description: row.amenities ? 'Comfortable room with ' + row.amenities + '.' : 'Comfortable room with premium amenities.',
    shortDesc: row.amenities || 'Premium amenities and comfortable stay.',
    price: Math.round(price),
    weekday: parseFloat(row.weekday) || 0,
    weekend: parseFloat(row.weekend) || 0,
    image: mainImg,
    images: allImages,
    amenities: amenities.length ? amenities : ['WiFi', 'TV', 'Air conditioning']
  };
}

/**
 * Get all active rooms for frontend
 */
function getRooms() {
  return pool.query(
    `SELECT r.*, COALESCE(p.weekday, 0) as weekday, COALESCE(p.weekend, 0) as weekend
     FROM rooms r
     LEFT JOIN room_prices p ON r.id = p.room_id
     WHERE r.status = 'active'
     ORDER BY r.id`
  ).then(function (result) {
    return result.rows.map(mapDbRoomToFrontend);
  });
}

/**
 * Find room by slug
 */
function findRoomBySlug(slug) {
  return getRooms().then(function (rooms) {
    return rooms.find(function (r) { return r.slug === slug; }) || null;
  });
}

module.exports = {
  getRooms: getRooms,
  findRoomBySlug: findRoomBySlug,
  mapDbRoomToFrontend: mapDbRoomToFrontend
};
