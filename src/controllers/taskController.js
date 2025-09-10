import getPool from "../config/db.js";

// create a new task
export const createTask = async (req, res) => {
    try {
        const { title, description, due_date } = req.body;
        const { userId } = req.user?.id;

        const pool = await getPool();

        const [result] = await pool.query(
            "INSERT INTO tasks (title, description, due_date, created_by) VALUES (?, ?, ?, ?)",
            [title, description, due_date, userId]
        );

        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: {
                id: result.insertId,
                title,
                description,
                due_date,
                created_by: userId
            }
        });
    } catch (error) {
        console.log("Error creating task: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// get all the tasks with role based access control
// end user can see only the tasks they created
// super admin can see all the tasks
// company user can see all the tasks associated with their company

export const getTasks = async (req, res) => {
    try {
        const { role, company, userId } = req.user; // Use userId instead of id
        const pool = await getPool();

        let query = `
            SELECT t.*, 
                   u1.name as created_by_name,
                   u2.name as assigned_to_name
            FROM tasks t
            LEFT JOIN users u1 ON t.created_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
        `;
        const values = [];

        // role based access control
        if (role === "EndUser") {
            query += " WHERE t.created_by = ?";
            values.push(userId);
        } else if (role === "CompanyUser") {
            query += " WHERE t.assigned_to IN (SELECT id FROM users WHERE company = ?)";
            values.push(company);
        }

        // SuperAdmin gets all tasks
        const [rows] = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No tasks found" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tasks retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.log("Error getting tasks: ", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};

// Get single task
export const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, company, userId } = req.user;

        const pool = await getPool();

        let query = `
            SELECT t.*, 
                   u1.name as created_by_name,
                   u2.name as assigned_to_name
            FROM tasks t
            LEFT JOIN users u1 ON t.created_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
            WHERE t.id = ?
        `;
        const values = [id];

        // Apply role-based access control in query
        if (role === "EndUser") {
            query += " AND (t.created_by = ? OR t.assigned_to = ?)";
            values.push(userId, userId);
        } else if (role === "CompanyUser") {
            query += " AND (t.created_by IN (SELECT id FROM users WHERE company = ?) OR t.assigned_to IN (SELECT id FROM users WHERE company = ?))";
            values.push(company, company);
        }

        const [rows] = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Task not found or access denied" });
        }

        // Get files for this task
        const [files] = await pool.query(
            "SELECT * FROM task_files WHERE task_id = ? ORDER BY uploaded_at DESC",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Task retrieved successfully",
            data: { ...rows[0], files }
        });

    } catch (error) {
        console.log("Error getting task: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Update task
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, due_date, status, assigned_to } = req.body;
        const { role, userId } = req.user;

        const pool = await getPool();

        // Check if user has permission to update this task
        let accessQuery = "SELECT created_by, assigned_to FROM tasks WHERE id = ?";
        const [task] = await pool.query(accessQuery, [id]);

        if (task.length === 0) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const taskData = task[0];
        
        // EndUser can only update their own tasks
        if (role === "EndUser" && taskData.created_by !== userId && taskData.assigned_to !== userId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Build update query dynamically
        let updateQuery = "UPDATE tasks SET ";
        const updateValues = [];
        const updates = [];

        if (title) { updates.push("title = ?"); updateValues.push(title); }
        if (description) { updates.push("description = ?"); updateValues.push(description); }
        if (due_date) { updates.push("due_date = ?"); updateValues.push(due_date); }
        if (status) { updates.push("status = ?"); updateValues.push(status); }
        if (assigned_to && (role === "SuperAdmin" || role === "CompanyUser")) { 
            updates.push("assigned_to = ?"); 
            updateValues.push(assigned_to); 
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: "No fields to update" });
        }

        updateQuery += updates.join(", ") + " WHERE id = ?";
        updateValues.push(id);

        await pool.query(updateQuery, updateValues);

        return res.status(200).json({
            success: true,
            message: "Task updated successfully"
        });

    } catch (error) {
        console.log("Error updating task: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Upload files to mark task as completed
export const uploadTaskFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        const pool = await getPool();

        // Update task status to completed when files are uploaded
        await pool.query(
            "UPDATE tasks SET status = 'Completed' WHERE id = ?",
            [id]
        );

        // Save file references to database
        const filePromises = req.files.map(file => {
            return pool.query(
                "INSERT INTO task_files (task_id, filename, file_path, uploaded_by) VALUES (?, ?, ?, ?)",
                [id, file.originalname, file.path, userId]
            );
        });

        await Promise.all(filePromises);

        return res.status(200).json({
            success: true,
            message: "Files uploaded successfully and task marked as completed",
            files: req.files.map(file => ({
                filename: file.originalname,
                path: file.path
            }))
        });

    } catch (error) {
        console.log("Error uploading files: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.user;

        const pool = await getPool();

        // Check permissions
        if (role !== "SuperAdmin") {
            const [task] = await pool.query("SELECT created_by FROM tasks WHERE id = ?", [id]);
            if (task.length === 0) {
                return res.status(404).json({ success: false, message: "Task not found" });
            }
            if (task[0].created_by !== userId) {
                return res.status(403).json({ success: false, message: "Only task creator or SuperAdmin can delete tasks" });
            }
        }

        await pool.query("DELETE FROM tasks WHERE id = ?", [id]);

        return res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });

    } catch (error) {
        console.log("Error deleting task: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// task assignment 
// Get all unassigned tasks
export const getUnassignedTasks = async (req, res) => {
    try {
        const pool = await getPool();
        
        const [tasks] = await pool.execute(`
            SELECT t.*, u.name as created_by_name, u.company as created_by_company
            FROM tasks t
            JOIN users u ON t.created_by = u.id
            WHERE t.assigned_to IS NULL
            ORDER BY t.created_on DESC
        `);

        res.json({
            success: true,
            data: tasks,
            count: tasks.length
        });
    } catch (error) {
        console.error('Error fetching unassigned tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get all company users for assignment
export const getCompanyUsers = async (req, res) => {
    try {
        const pool = await getPool();
        
        const [users] = await pool.execute(`
            SELECT id, name, email, company, role
            FROM users 
            WHERE role IN ('CompanyUser', 'SuperAdmin')
            ORDER BY company, name
        `);

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching company users:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Assign task to a company user
export const assignTask = async (req, res) => {
    const { taskId } = req.params;
    const { assigned_to, status = 'InProgress' } = req.body;
    const assigned_by = req.user.id; // Super Admin who is making the assignment

    try {
        const pool = await getPool();

        // Validate task exists and is unassigned
        const [existingTask] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND assigned_to IS NULL',
            [taskId]
        );

        if (existingTask.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found or already assigned'
            });
        }

        // Validate assigned user exists and is a CompanyUser or SuperAdmin
        const [assignedUser] = await pool.execute(
            'SELECT id, role FROM users WHERE id = ? AND role IN ("CompanyUser", "SuperAdmin")',
            [assigned_to]
        );

        if (assignedUser.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user for assignment. Must be CompanyUser or SuperAdmin'
            });
        }

        // Update the task assignment
        const [result] = await pool.execute(
            'UPDATE tasks SET assigned_to = ?, status = ?, assigned_on = NOW() WHERE id = ?',
            [assigned_to, status, taskId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to assign task'
            });
        }

        // Get updated task details
        const [updatedTask] = await pool.execute(`
            SELECT t.*, 
                   creator.name as created_by_name,
                   assignee.name as assigned_to_name,
                   assignee.email as assigned_to_email
            FROM tasks t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users assignee ON t.assigned_to = assignee.id
            WHERE t.id = ?
        `, [taskId]);

        res.json({
            success: true,
            message: 'Task assigned successfully',
            data: updatedTask[0]
        });

    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
