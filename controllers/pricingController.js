const pool = require("../config/db");
const redirectWithToast = require("../utils/redirectWithToast");

/**
 * GET /admin/pricing
 */
exports.index = async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT r.id as room_id, r.name as room_name,
              COALESCE(p.weekday, 0) as weekday,
              COALESCE(p.weekend, 0) as weekend
       FROM rooms r
       LEFT JOIN room_prices p ON r.id = p.room_id
       ORDER BY r.name`
    );
    res.render("admin/pricing", {
      title: "Pricing",
      path: "pricing",
      pricing: result.rows,
    });
  } catch (err) {
    console.error("pricingController.index:", err);
    res.status(500).send("Failed to load pricing");
  }
};

/**
 * POST /admin/pricing
 */
exports.update = async function (req, res) {
  try {
    const { roomId, weekday, weekend } = req.body;
    const room_id = parseInt(roomId, 10);
    const wd = parseFloat(weekday) || 0;
    const we = parseFloat(weekend) || 0;

    await pool.query(
      `INSERT INTO room_prices (room_id, weekday, weekend, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (room_id) DO UPDATE SET
         weekday = $2, weekend = $3, updated_at = CURRENT_TIMESTAMP`,
      [room_id, wd, we]
    );
    redirectWithToast(res, "/admin/pricing", "success", "Pricing updated");
  } catch (err) {
    console.error("pricingController.update:", err);
    redirectWithToast(res, "/admin/pricing", "error", "Failed to update pricing");
  }
};
