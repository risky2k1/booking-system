const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// REGISTER (chỉ dùng seed admin ban đầu)
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id,email",
            [name, email, hashedPassword]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ message: "Invalid credentials" });

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user.id, name: user.name || "User" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};