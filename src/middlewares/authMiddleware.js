import jwt from "jsonwebtoken";
import getPool from "../config/db.js";

export const verifyJWT = async (req, res, next) => {
    // console.log("Request Headers: ", req.headers);

    // Check Authorization header first (common for API clients like Postman)
    let token = req.headers["authorization"]?.replace("Bearer ", "");
    
    // If not in header, check cookies (for web browsers)
    if (!token) {
        token = req.cookies?.accessToken;
    }
    
    // console.log("Extracted Token:", token);
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: "Access token required" 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists in database
        const pool = await getPool();
        try {
            const [users] = await pool.execute(
                'SELECT id, email, role, company FROM users WHERE id = ?',
                [decoded.id]
            );

            if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid token. User not found.' });
        }

        req.user = users[0];
        } catch (error) {
            console.error("Database query error:", error.message);
        }

        next();
    } catch (error) {
        console.log("Token verification error:", error.message);
        return res.status(401).json({ 
            success: false,
            message: "Invalid or expired token" 
        });
    }
};

export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: "User not authenticated" 
            });
        }
        
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: "Access denied. Insufficient permissions" 
            });
        }
        next();
    }
};