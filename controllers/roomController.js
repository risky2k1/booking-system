const pool = require("../config/db");
const redirectWithToast = require("../utils/redirectWithToast");

function parseImages(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
    return arr;
  }
  return [];
}

function stringifyImages(arr) {
  return Array.isArray(arr) ? JSON.stringify(arr) : "[]";
}

/**
 * GET /admin/rooms
 */
exports.index = async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, COALESCE(p.weekday, 0) as weekday, COALESCE(p.weekend, 0) as weekend
       FROM rooms r
       LEFT JOIN room_prices p ON r.id = p.room_id
       ORDER BY r.id`
    );
    res.render("admin/rooms", {
      title: "Rooms",
      path: "rooms",
      rooms: result.rows,
    });
  } catch (err) {
    console.error("roomController.index:", err);
    res.status(500).send("Failed to load rooms");
  }
};

/**
 * GET /admin/rooms/create
 */
exports.createForm = function (req, res) {
  res.render("admin/room-form", {
    title: "Create Room",
    path: "rooms",
    room: null,
  });
};

/**
 * POST /admin/rooms
 */
exports.create = async function (req, res) {
  try {
    const { name, main_image, images, amenities, beds, status } = req.body;
    const imagesArr = parseImages(images);
    const result = await pool.query(
      `INSERT INTO rooms (name, main_image, images, amenities, beds, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        name || "Unnamed",
        main_image || "",
        stringifyImages(imagesArr),
        amenities || "",
        parseInt(beds, 10) || 1,
        status || "active",
      ]
    );
    const roomId = result.rows[0].id;
    await pool.query(
      `INSERT INTO room_prices (room_id, weekday, weekend) VALUES ($1, 0, 0)`,
      [roomId]
    );
    redirectWithToast(res, "/admin/rooms", "success", "Room created");
  } catch (err) {
    console.error("roomController.create:", err);
    redirectWithToast(res, "/admin/rooms/create", "error", "Failed to create room");
  }
};

/**
 * GET /admin/rooms/:id/edit
 */
exports.editForm = async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, COALESCE(p.weekday, 0) as weekday, COALESCE(p.weekend, 0) as weekend
       FROM rooms r
       LEFT JOIN room_prices p ON r.id = p.room_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const room = result.rows[0];
    if (!room) return res.status(404).send("Room not found");
    room.images = Array.isArray(room.images) ? room.images : (room.images ? JSON.parse(room.images) : []);
    res.render("admin/room-form", {
      title: "Edit Room",
      path: "rooms",
      room,
    });
  } catch (err) {
    console.error("roomController.editForm:", err);
    res.status(500).send("Failed to load room");
  }
};

/**
 * PUT /admin/rooms/:id
 */
exports.update = async function (req, res) {
  try {
    const { name, main_image, images, amenities, beds, status } = req.body;
    const imagesArr = parseImages(images);
    await pool.query(
      `UPDATE rooms SET
        name = $1, main_image = $2, images = $3, amenities = $4, beds = $5, status = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        name || "Unnamed",
        main_image || "",
        stringifyImages(imagesArr),
        amenities || "",
        parseInt(beds, 10) || 1,
        status || "active",
        req.params.id,
      ]
    );
    redirectWithToast(res, "/admin/rooms", "success", "Room updated");
  } catch (err) {
    console.error("roomController.update:", err);
    redirectWithToast(res, "/admin/rooms/" + req.params.id + "/edit", "error", "Failed to update room");
  }
};
