import getPool from "../config/db.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";


// create a new task
export const createTask = async (req, res) => {
    try {
        const { title, description, due_date } = req.body;
        const userId = req.user.id;

        const pool = await getPool();

        const [result] = await pool.query(
            "INSERT INTO tasks (title, description, due_date, created_by) VALUES (?, ?, ?, ?)",
            [title, description, due_date, userId]
        );

        const [tasks] = await pool.execute(
            "SELECT * FROM tasks WHERE id = ?",
            [result.insertId]
        );

        if (tasks.length === 0) {
            return res.status(500).json({ success: false, message: "Failed to retrieve created task" });
        }

        const { created_by } = tasks[0];

        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: {
                id: result.insertId,
                title,
                description,
                due_date,
                created_by,
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
        const { role, company, id } = req.user; 
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
            values.push(id);
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

// get all the tasks created by the logged in user
export const getMyCreatedTasks = async (req, res) => {
    try {
        const userId = req.user.id; 
        const pool = await getPool();

        const tasks = await pool.execute(
            "SELECT * FROM tasks WHERE created_by = ? ORDER BY created_on DESC",
            [userId]
        );
        if (tasks.length === 0) {
            return res.status(404).json({success: false, message: "No tasks created by you found"});
        };

        return res.status(200).json({
            success: true,
            message: "Tasks retrieved successfully",
            data: tasks[0],
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error While fetching your created tasks."
        });
    };
};

// Get single task
export const getTaskById = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { id: userId, role, company } = req.user;

    const pool = await getPool();

    // Base query to fetch task and user details
    let query = `
      SELECT t.*, 
             u1.name AS created_by_name,
             u2.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = ?
    `;
    const values = [taskId];

    // Role-based access control
    if (role === "EndUser") {
      query += " AND (t.created_by = ? OR t.assigned_to = ?)";
      values.push(userId, userId);
    } else if (role === "CompanyUser") {
      query += `
        AND (
          t.created_by IN (SELECT id FROM users WHERE company = ?) 
          OR t.assigned_to IN (SELECT id FROM users WHERE company = ?)
        )
      `;
      values.push(company, company);
    }

    // Fetch the task
    const [tasks] = await pool.query(query, values);

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    const task = tasks[0];

    // Fetch related files
    const [files] = await pool.query(
      "SELECT id, filename, file_path, uploaded_by, uploaded_at FROM task_files WHERE task_id = ? ORDER BY uploaded_at DESC",
      [taskId]
    );

    return res.status(200).json({
      success: true,
      message: "Task retrieved successfully",
      data: { ...task, files },
    });
  } catch (error) {
    console.error("Error getting task:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { title, description, due_date, status } = req.body;
    const { role, id: userId } = req.user;

    const pool = await getPool();

    // Check if the task exists
    const [taskRows] = await pool.query(
      "SELECT created_by, status, assigned_to FROM tasks WHERE id = ?",
      [taskId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const task = taskRows[0];

    // check if task is already completed, end user cannot update a completed task 
    if (role === "EndUser" && task.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a completed task",
      });
    }

    // if user did not create the task, he can't update it
    if (role === "EndUser") {
      if (task.created_by !== userId && task.assigned_to !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const updates = [];
      const values = [];

      if (title) {
        updates.push("title = ?");
        values.push(title);
      }
      if (description) {
        updates.push("description = ?");
        values.push(description);
      }
      if (due_date) {
        updates.push("due_date = ?");
        values.push(due_date);
      }

      if (updates.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No allowed fields to update" });
      }

      const query = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;
      values.push(taskId);

      await pool.query(query, values);
      return res
        .status(200)
        .json({ success: true, message: "Task updated successfully" });
    }

    if (role === "CompanyUser") {
      return res.status(403).json({
        success: false,
        message: "Company users cannot update tasks",
      });
    }

    if (role === "SuperAdmin") {
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Only status can be updated by SuperAdmin",
        });
      }

      // if updating to "InProgress" → must be assigned to someone
      if (status === "InProgress" && !task.assigned_to) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot set task to InProgress without assigning a user first",
        });
      }

      // if updating to "Completed" → must have at least one uploaded file
      if (status === "Completed") {
        const [files] = await pool.query(
          "SELECT id FROM task_files WHERE task_id = ? LIMIT 1",
          [taskId]
        );

        if (files.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot mark task with id ${taskId} as Completed: no files uploaded for this task`,
          });
        }
      }

      // update status + handle Pending/InProgress/Completed rules
      await pool.query(
        `UPDATE tasks 
         SET status = ?, 
             completed_on = CASE 
                                WHEN ? = 'Completed' THEN NOW() 
                                ELSE NULL 
                            END,
             assigned_to = CASE
                                WHEN ? = 'Pending' THEN NULL
                                ELSE assigned_to
                           END,
            assigned_on = CASE
                                WHEN ? = 'Pending' THEN NULL
                                ELSE assigned_on
                           END
         WHERE id = ?`,
        [status, status, status, status, taskId]
      );

      return res.status(200).json({
        success: true,
        message: `Task with id ${taskId} status updated successfully`,
        taskId,
      });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    console.error("Error updating task:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};



// Upload files to mark task as completed
export const uploadTaskFiles = async (req, res) => {
  try {
    const { id: taskId } = req.params; // task id
    const userId = req.user.id; // or req.user.userId depending on your JWT payload

    // if user is endUser, cann't upload the file for task completion
    if (req.user.role === "EndUser") {
        return res.status(403).json({ success: false, message: "End users cannot upload files to mark the task as compeleted."})
    }

    // check if task exists or not

    const pool = await getPool();

    const [task] = await pool.query("SELECT id FROM tasks WHERE id = ?", [taskId]);
    if (task.length === 0) {
        return res.status(404).json({ success: false, message: "Task not found" });
    }

    // we need to check if task is assigned to someone or not
    const [taskAssignedTo] = await pool.query("SELECT assigned_to FROM tasks WHERE id = ?", [taskId]);
    if (taskAssignedTo.length === 0 || taskAssignedTo[0].assigned_to === null) {
        return res.status(400).json({ success: false, message: "Task is not assigned to anyone yet. Cannot mark as completed."})
    }

    // check if task is already completed
    const [taskStatus] = await pool.query("SELECT status FROM tasks WHERE id = ?", [taskId]);
    // console.log("Task status is: ", taskStatus)
    if (taskStatus.length > 0 && taskStatus[0].status === 'Completed') {
        return res.status(400).json({ success: false, message: "Task is already marked as completed."})
        
    }
    

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = [];

    try {
        // Upload each file to Cloudinary and save record in DB
        for (const file of req.files) {
            // console.log("object file is: ", file);
            // console.log("\n\nfile path is: ", file.path);
          const response = await uploadToCloudinary(file.path); // uploads & deletes local file
          
        //   console.log("Response from Cloudinary:", response);
    
          if (response !== undefined && response !== null) {



            await pool.query(
              "INSERT INTO task_files (task_id, filename, file_path, uploaded_by) VALUES (?, ?, ?, ?)",
              [taskId, file.originalname, response.secure_url, userId]
            );

            // now update the task status to completed and completed_on values
            await pool.query(
                "UPDATE tasks SET status = 'Completed', completed_on = NOW() WHERE id = ?", [taskId]
            );
    
            uploadedFiles.push({
              filename: file.originalname,
              url: response.secure_url,
            });

            // console.log("Uploaded files are: ", uploadedFiles)

            return res.status(200).json({
                    success: true,
                    message: "Files uploaded to Cloudinary and task marked as completed",
                    files: uploadedFiles,
                });
          }
        }
    
    } catch (error) {
        console.log("Upload to Cloudinary failed: ", error);
        return res.status(500).json({
          success: false,
          message: error.message || "File upload failed",
        });
    }
  } catch (error) {
    console.error("Error uploading task files:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Delete task
export const deleteTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;           // Task ID from URL
    const { id: userId, role } = req.user;       // User info from JWT

    const pool = await getPool();

    // Check if the task exists
    const [tasks] = await pool.query(
      "SELECT created_by FROM tasks WHERE id = ?",
      [taskId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = tasks[0];

    // Permission check
    if (role !== "SuperAdmin" && task.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the task creator or SuperAdmin can delete tasks",
      });
    }

    // Delete task
    await pool.query("DELETE FROM tasks WHERE id = ?", [taskId]);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
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

// get all the pending tasks
export const getPendingTasks = async (req, res) => {
    try {
        const { role, id } = req.user;
        const pool = await getPool();

        if (role === 'SuperAdmin') {
            const [tasks] = await pool.execute(`
                SELECT t.*, u.name as created_by_name, u.company as created_by_company
                FROM tasks t
                JOIN users u ON t.created_by = u.id
                WHERE (t.status = 'Pending' OR t.status = 'InProgress')
                ORDER BY t.created_on DESC
            `);

            return res.json({
                success: true,
                message: "All pending or inprogress tasks fetched successfully",
                data: tasks,
                count: tasks.length
            });
        };

        const [tasks] = await pool.execute(`
                SELECT t.*, u.name as created_by_name, u.company as created_by_company
                FROM tasks t
                JOIN users u ON t.created_by = u.id
                WHERE (t.status = 'Pending' OR t.status ='InProgress') AND t.created_by = ?
                ORDER BY t.created_on DESC
            `, [id]);

        if (tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No pending tasks found for this user. Check if your tasks are assigned to someone or not."
            })
        }

        return res.json({
            success: true,
            message: "Pending or InProgress tasks by this user fetched successfully",
            data: tasks,
            count: tasks.length
        });
        
    } catch (error) {
        console.error('Error fetching pending tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// get all the completed tasks
export const getCompletedTasks = async (req, res) => {
    try {
        const { role, id } = req.user;
        const pool = await getPool();

        if (role === 'SuperAdmin') {
            const [tasks] = await pool.execute(`
                SELECT t.*, u.name as created_by_name, u.company as created_by_company
                FROM tasks t
                JOIN users u ON t.created_by = u.id
                WHERE t.status = 'Completed'
                ORDER BY t.created_on DESC
            `);

            return res.json({
                success: true,
                message: "All completed tasks fetched successfully",
                data: tasks,
                count: tasks.length
            });
        };

        const [tasks] = await pool.execute(`
                SELECT t.*, u.name as created_by_name, u.company as created_by_company
                FROM tasks t
                JOIN users u ON t.created_by = u.id
                WHERE (t.status = 'Completed') AND t.created_by = ?
                ORDER BY t.created_on DESC
            `, [id]);

        if (tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No completed tasks found for this user."
            })
        }

        return res.json({
            success: true,
            message: "Completed tasks by this user fetched successfully",
            data: tasks,
            count: tasks.length
        });
        
    } catch (error) {
        console.error('Error fetching completed tasks:', error);
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
    const { id: taskId } = req.params;
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
