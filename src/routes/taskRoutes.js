import express from "express";
import { 
    createTask, 
    getTasks,
    getMyCreatedTasks, 
    getTaskById, 
    updateTask, 
    deleteTask, 
    uploadTaskFiles,
    getUnassignedTasks,
    getPendingTasks,
    getCompletedTasks, 
    getCompanyUsers,
    assignTask
} from "../controllers/taskController.js";
import { verifyJWT, authorize } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multerMiddleware.js";

const router = express.Router();

// Task routes
router.post("/create-task", verifyJWT, authorize(['SuperAdmin', 'CompanyUser', 'EndUser']), createTask);
router.get("/get-tasks", verifyJWT, authorize([]), getTasks);
router.get("/get-my-created-tasks", verifyJWT, authorize([]), getMyCreatedTasks);
router.get("/get-task/:id", verifyJWT, authorize([]), getTaskById);
router.patch("/update-task/:id", verifyJWT, authorize([]), updateTask);
router.delete("/delete-task/:id", verifyJWT, authorize([]), deleteTask);

// File upload route - mark task as completed
router.post("/complete-task/:id/upload", 
    verifyJWT, 
    authorize([]), 
    upload.array('files', 5), // Max 5 files
    uploadTaskFiles
);

// Super Admin only routes for task assignment
router.get('/task-assignment/unassigned', verifyJWT, authorize(['SuperAdmin']), getUnassignedTasks);
router.get('/task-assignment/pending', verifyJWT, authorize([]), getPendingTasks);
router.get('/task-assignment/completed', verifyJWT, authorize([]), getCompletedTasks);
router.get('/task-assignment/company-users', verifyJWT, authorize(['SuperAdmin']), getCompanyUsers);
router.patch('/task-assignment/:taskId/assign', verifyJWT, authorize(['SuperAdmin']), assignTask);

export default router;