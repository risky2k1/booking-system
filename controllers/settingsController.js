const pool = require("../config/db");
const redirectWithToast = require("../utils/redirectWithToast");

const DEFAULTS = { siteName: "Booking Hub", currency: "USD", timezone: "UTC" };

/**
 * Chuyển rows [{key, value}] thành object { siteName: 'x', currency: 'y', ... }
 */
function rowsToObject(rows) {
  const obj = { ...DEFAULTS };
  if (Array.isArray(rows)) {
    rows.forEach((r) => {
      if (r && r.key) obj[r.key] = r.value || "";
    });
  }
  return obj;
}

/**
 * GET /admin/settings - Hiển thị form cài đặt
 */
exports.index = async function (req, res) {
  try {
    const result = await pool.query("SELECT key, value FROM settings");
    const settings = rowsToObject(result.rows);
    res.render("admin/settings", {
      title: "Settings",
      path: "settings",
      settings,
    });
  } catch (err) {
    console.error("settingsController.index:", err);
    res.render("admin/settings", {
      title: "Settings",
      path: "settings",
      settings: DEFAULTS,
    });
  }
};

/**
 * POST /admin/settings - Lưu cài đặt
 */
exports.update = async function (req, res) {
  try {
    const { siteName, currency, timezone } = req.body;
    const updates = [
      { key: "siteName", value: siteName || DEFAULTS.siteName },
      { key: "currency", value: currency || DEFAULTS.currency },
      { key: "timezone", value: timezone || DEFAULTS.timezone },
    ];

    for (const { key, value } of updates) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    redirectWithToast(res, "/admin/settings", "success", "Settings saved");
  } catch (err) {
    console.error("settingsController.update:", err);
    redirectWithToast(res, "/admin/settings", "error", "Failed to save settings");
  }
};
