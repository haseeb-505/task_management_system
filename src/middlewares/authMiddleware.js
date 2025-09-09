import jwt from "jsonwebtoken";

export const verifyJWT = (req, res, next) => {
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
        req.user = decoded;
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
                message: "Insufficient permissions" 
            });
        }
        next();
    };
};