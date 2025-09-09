import getPool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
    try {
        const { name, role, company, email, password } = req.body;

        // Validation
        if (!name || !role || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: name, role, email, password"
            });
        }

        // Validate role
        const validRoles = ['SuperAdmin', 'CompanyUser', 'EndUser'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Must be: SuperAdmin, CompanyUser, or EndUser"
            });
        }

        // Check if user already exists
        const pool = getPool(true);
        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ?", 
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (name, role, company, email, password) VALUES (?, ?, ?, ?, ?)",
            [name, role, company, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: result.insertId,
                name,
                role,
                company,
                email
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error during registration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const pool = getPool(true);
        
        // Find user
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?", 
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                company: user.company 
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    company: user.company
                }
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        
        res.status(500).json({
            success: false,
            message: "Internal server error during login",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};