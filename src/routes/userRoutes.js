// routes/userRoutes.js
import express from "express";
import { 
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getManagerDashboard,
    getAdminDashboard
} from "../controllers/userController.js";
import { verifyJWT, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes (if any)
// router.route("/public").get(...);

// Protected routes - All authenticated users
router.route("/current-user").get(verifyJWT, authorize([]), getCurrentUser);
router.route("/profile").get(verifyJWT, authorize(['user', 'manager', 'admin']), getUserProfile);
router.route("/profile").patch(verifyJWT, authorize(['user', 'manager', 'admin']), updateUserProfile);

// User role specific routes
router.route("/dashboard").get(verifyJWT, authorize(['user']), (req, res) => {
    res.json({ message: "User dashboard data" });
});

// Manager role specific routes
router.route("/manager/dashboard").get(verifyJWT, authorize(['manager', 'admin']), getManagerDashboard);
router.route("/manager/users").get(verifyJWT, authorize(['manager', 'admin']), getAllUsers);

// Admin role specific routes
router.route("/admin/dashboard").get(verifyJWT, authorize(['admin']), getAdminDashboard);
router.route("/admin/users").get(verifyJWT, authorize(['admin']), getAllUsers);
router.route("/admin/users/:id")
    .get(verifyJWT, authorize(['admin']), getUserById)
    .patch(verifyJWT, authorize(['admin']), updateUser)
    .delete(verifyJWT, authorize(['admin']), deleteUser);

export default router;