// routes/userRoutes.js
import express from "express";
import { 
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    getUserById,
    deleteUser,
    getSuperAdminDashboard,
    getCompanyUserDashboard,
    getEndUserDashboard,
    updateUserById
} from "../controllers/userController.js";
import { verifyJWT, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All authenticated users can access these
router.route("/current-user").get(verifyJWT, authorize([]), getCurrentUser);
router.route("/profile").get(verifyJWT, authorize([]), getUserProfile);
router.route("/profile").patch(verifyJWT, authorize([]), updateUserProfile);

// Role-specific dashboards
router.route("/superadmin/dashboard").get(verifyJWT, authorize(['SuperAdmin']), getSuperAdminDashboard);
router.route("/companyuser/dashboard").get(verifyJWT, authorize(['CompanyUser']), getCompanyUserDashboard);
router.route("/enduser/dashboard").get(verifyJWT, authorize(['EndUser']), getEndUserDashboard);

// User management routes
router.route("/get-all-users").get(verifyJWT, authorize(['SuperAdmin', 'CompanyUser']), getAllUsers);
router.route("/get-user/:id").get(verifyJWT, authorize(['SuperAdmin', 'CompanyUser']), getUserById)
router.route("/update-user/:id").patch(verifyJWT, authorize(['SuperAdmin', 'CompanyUser']), updateUserById)
router.route("/delete-user/:id").delete(verifyJWT, authorize(['SuperAdmin']), deleteUser); // Only SuperAdmin can delete

export default router;