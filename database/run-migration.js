#!/usr/bin/env node
/**
 * Chạy migration SQL
 * Sử dụng biến môi trường: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
 * Ví dụ: npm run db:migrate
 */
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "booking_user",
  password: process.env.DB_PASS || "booking_pass",
  database: process.env.DB_NAME || "booking_db",
});

const migrationsDir = path.join(__dirname, "migrations");
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

async function run() {
  for (const file of files) {
    const filepath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filepath, "utf8");
    console.log("Running:", file);
    await pool.query(sql);
    console.log("  OK");
  }
  await pool.end();
  console.log("Migrations done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
