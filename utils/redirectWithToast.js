/**
 * Redirect với query params để hiển thị toast trên trang đích
 * @param {object} res - Express response
 * @param {string} url - URL redirect (không có query)
 * @param {string} type - success | error | info
 * @param {string} message - Nội dung toast
 */
function redirectWithToast(res, url, type, message) {
  var sep = url.indexOf("?") >= 0 ? "&" : "?";
  var q = "toast=" + encodeURIComponent(type || "success") + "&message=" + encodeURIComponent(message || "Done");
  res.redirect(url + sep + q);
}

module.exports = redirectWithToast;
