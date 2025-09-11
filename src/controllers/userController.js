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
};

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const pool = await getPool();
        // console.log("Request user id is: ", req.user.id);
        const [users] = await pool.execute(
            "SELECT id, name, email, role, company, created_on FROM users WHERE id = ?",
            [req.user.id]
        );

        // console.log("Users are: ", users)
        
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
    const { name, email, company, role } = req.body;
    const pool = await getPool();

    // Get the current logged-in user from DB
    const [users] = await pool.execute(
      "SELECT id, name, email, role, company FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const currentUser = users[0];

    // Make sure user is updating their own profile
    if (req.user.id !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile"
      });
    }

    // Restrict company and role updates
    const restrictions = {
      company: "You cannot change your company. Contact administrator.",
      role: "You cannot change your role. Contact administrator."
    };

    for (const field in restrictions) {
      if (req.body[field] && req.body[field] !== req.user[field]) {
        return res.status(403).json({
          success: false,
          message: restrictions[field]
        });
      }
    }

    // Only allow updating name and email
    if ((!name || name.trim() === "") || (!email || email.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Name and email cannot be empty"
      });
    }

    // Check if email is already taken by another user
    if (email !== currentUser.email) {
      const [existing] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, req.user.id]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "This email is already in use by another account"
        });
      }
    }

    // Update user profile
    await pool.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, req.user.id]
    );

    return res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};



// Get all users (for SuperAdmin and CompanyUser with company filtering)
export const getAllUsers = async (req, res) => {
    try {
        // console.log("User in getAllUsers is: ", req.user);
        const pool = await getPool();
        let query = "SELECT id, name, email, role, company, created_on FROM users";
        let params = [];
        
        // CompanyUser can only see users from their own company
        if (req.user.role === 'CompanyUser') {
            query += " WHERE company = ?";
            params.push(req.user.company);
        }
        // SuperAdmin can see all users
        // EndUser cannot access this route (handled by authorize middleware)

        const [users] = await pool.execute(query, params);

        // console.log("users are: ", users);

        res.json({
            success: true,
            message: "Users retrieved successfully",
            users: users,
            total: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// Get user by ID (SuperAdmin only or CompanyUser for same company)
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        let query = "SELECT id, name, email, role, company, created_on FROM users WHERE id = ?";
        let params = [id];
        
        // CompanyUser can only access users from their own company
        if (req.user.role === 'CompanyUser') {
            query += " AND company = ?";
            params.push(req.user.company);
        }

        const [users] = await pool.execute(query, params);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found or access denied"
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

// Update user (SuperAdmin only )
export const updateUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        // console.log("data is: ", req.body);
        const pool = await getPool();

        // first of all, we need to check if user with this id exists
        //2ndly, we check if this email is already taken or not
        try {
            const [ users ] = await pool.execute(
                "SELECT id, email, role, company FROM users WHERE id = ?",
                [id]
            );
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                })
            };
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "server error while checking the user existence in updateUserById"
            })
        };

        // check if email is already taken by another user
        try {
            if (email && email.trim() !== "") {
                const [ users ] = await pool.execute(
                    "SELECT id, email, role, company FROM users WHERE email = ?",
                    [email]
                );
                if (users.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "This email is already taken by another user."
                    })
                };
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "server error while checking the email availability in updateUserById"
            })
        };
        
        let query = "UPDATE users SET name = ?, email = ?";
        let updatingUserDetails = [name, email];
        
        // Only SuperAdmin can change roles
        if (req.user.role === 'SuperAdmin' && role) {
            query += ", role = ?";
            updatingUserDetails.push(role);
        }
        
        query += " WHERE id = ?";
        updatingUserDetails.push(id);

        // CompanyUser can only update users from their own company
        if (req.user.role === 'CompanyUser') {
            query += " AND company = ?";
            updatingUserDetails.push(req.user.company);
        }

        const [result] = await pool.execute(query, updatingUserDetails);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found or access denied"
            });
        }

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
};

// Delete user (SuperAdmin only)
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

// SuperAdmin dashboard
export const getSuperAdminDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        
        const [userStats] = await pool.execute(
            "SELECT role, COUNT(*) as count FROM users GROUP BY role"
        );

        const [recentUsers] = await pool.execute(
            "SELECT id, name, email, role, company, created_on FROM users ORDER BY created_on DESC LIMIT 5"
        );

        const [companyStats] = await pool.execute(
            "SELECT company, COUNT(*) as user_count FROM users GROUP BY company"
        );

        res.json({
            success: true,
            message: "SuperAdmin dashboard data",
            userStats: userStats,
            recentUsers: recentUsers,
            companyStats: companyStats,
            dashboardData: {
                totalUsers: userStats.reduce((acc, curr) => acc + curr.count, 0),
                totalCompanies: companyStats.length,
                welcomeMessage: `Welcome SuperAdmin ${req.user.name}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// CompanyUser dashboard
export const getCompanyUserDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        
        const [userStats] = await pool.execute(
            "SELECT role, COUNT(*) as count FROM users WHERE company = ? GROUP BY role",
            [req.user.company]
        );

        const [recentUsers] = await pool.execute(
            "SELECT id, name, email, role, created_on FROM users WHERE company = ? ORDER BY created_on DESC LIMIT 5",
            [req.user.company]
        );

        res.json({
            success: true,
            message: "CompanyUser dashboard data",
            userStats: userStats,
            recentUsers: recentUsers,
            dashboardData: {
                totalUsers: userStats.reduce((acc, curr) => acc + curr.count, 0),
                company: req.user.company,
                welcomeMessage: `Welcome CompanyUser ${req.user.name}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// EndUser dashboard
export const getEndUserDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        
        // Get user's tasks count 
        const [taskStats] = await pool.execute(
            "SELECT status, COUNT(*) as count FROM tasks WHERE id = ? GROUP BY status",
            [req.user.id]
        );

        res.json({
            success: true,
            message: "EndUser dashboard data",
            taskStats: taskStats,
            dashboardData: {
                totalTasks: taskStats.reduce((acc, curr) => acc + curr.count, 0),
                welcomeMessage: `Welcome ${req.user.name}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}