import getPool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async ({ name, role, company, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = getPool(true);
    const [result] = await pool.query(
        "INSERT INTO users (name, role, company, email, password) VALUES (?, ?, ?, ?, ?)",
        [name, role, company, email, hashedPassword]
    );

    return { id: result.insertId, name, role, company, email };
};

// login user function
export const loginUser = async ({ email, password}) => {
    const pool = await getPool(true);
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) throw new Error("User not found");

    // user extraction and password check
    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    // token generation 
    const token = jwt.sign(
        { id: user.id, role: user.role, company: user.company},
        process.env.JWT_SECRET,
        { expiresIn: "1h"}
    );

    return { token, user: { id: user.id, name: user.name, role: user.role, email: user.email }};
}
