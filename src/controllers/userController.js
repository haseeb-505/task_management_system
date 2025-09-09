// controllers/userController.js
import getPool from "../config/db.js";

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        res.json({ 
            success: true,
            message: "Current user retrieved successfully",
            user: req.user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message || "Server error" 
        });
    }
}

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const pool = await getPool();
        const [users] = await pool.execute(
            "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User profile retrieved successfully",
            user: users[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Update user profile
export const updateUserProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const pool = await getPool();
        
        await pool.execute(
            "UPDATE users SET username = ?, email = ? WHERE id = ?",
            [username, email, req.user.userId]
        );

        res.json({
            success: true,
            message: "Profile updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Get all users (for managers and admins)
export const getAllUsers = async (req, res) => {
    try {
        const pool = await getPool();
        const [users] = await pool.execute(
            "SELECT id, username, email, role, created_at FROM users"
        );

        res.json({
            success: true,
            message: "Users retrieved successfully",
            users: users,
            // Add role-based filtering if needed
            userRole: req.user.role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        const [users] = await pool.execute(
            "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User retrieved successfully",
            user: users[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Update user (admin only)
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role } = req.body;
        const pool = await getPool();
        
        await pool.execute(
            "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?",
            [username, email, role, id]
        );

        res.json({
            success: true,
            message: "User updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Delete user (admin only)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        await pool.execute("DELETE FROM users WHERE id = ?", [id]);

        res.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Manager dashboard
export const getManagerDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        
        // Example manager-specific data
        const [userStats] = await pool.execute(
            "SELECT role, COUNT(*) as count FROM users WHERE role IN ('user', 'manager') GROUP BY role"
        );

        res.json({
            success: true,
            message: "Manager dashboard data",
            userStats: userStats,
            managerData: {
                totalUsers: userStats.reduce((acc, curr) => acc + curr.count, 0),
                welcomeMessage: `Welcome Manager ${req.user.username}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Admin dashboard
export const getAdminDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        
        // Example admin-specific data
        const [userStats] = await pool.execute(
            "SELECT role, COUNT(*) as count FROM users GROUP BY role"
        );

        const [recentUsers] = await pool.execute(
            "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5"
        );

        res.json({
            success: true,
            message: "Admin dashboard data",
            userStats: userStats,
            recentUsers: recentUsers,
            adminData: {
                totalUsers: userStats.reduce((acc, curr) => acc + curr.count, 0),
                welcomeMessage: `Welcome Admin ${req.user.username}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}