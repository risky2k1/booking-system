const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const DOCS_DIR = path.join(__dirname, "../docs");

const DOC_NAV = [
  { id: "intro", title: "Giới thiệu", href: "/admin/docs" },
  { id: "authentication", title: "Authentication", href: "/admin/docs/authentication" },
];

function getDoc(slug) {
  const fileMap = {
    authentication: "AUTHENTICATION-GUIDE.md",
  };
  const filename = fileMap[slug];
  if (!filename) return null;
  const filepath = path.join(DOCS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, "utf-8");
}

exports.index = function (req, res) {
  res.render("admin/docs/index", {
    title: "Documentation",
    path: "docs",
    docNav: DOC_NAV,
    currentDoc: "intro",
  });
};

exports.show = function (req, res) {
  const slug = req.params.slug;
  const content = getDoc(slug);
  if (!content) {
    return res.status(404).render("error", { message: "Document not found" });
  }
  const html = marked.parse(content, {
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false,
  });
  const titles = {
    authentication: "Authentication",
  };
  res.render("admin/docs/show", {
    title: titles[slug] || slug,
    path: "docs",
    docNav: DOC_NAV,
    currentDoc: slug,
    docContent: html,
  });
};
