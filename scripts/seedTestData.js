import getPool from "../src/config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const seedTestData = async () => {
    let pool;
    
    try {
        // First, get pool without database to check if database exists
        pool = await getPool(false);
        
        // Check if database exists, create if not
        try {
            await pool.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
            console.log(`Database '${process.env.DB_NAME}' ensured`);
        } catch (error) {
            console.error('Error creating database:', error.message);
            throw error;
        }

        // Now get pool with database
        pool = await getPool(true);

        // CAUTION: The following lines clear existing data. Remove them after the first run
        // to prevent accidental data loss in subsequent runs.
        try {
            await pool.execute('SET FOREIGN_KEY_CHECKS = 0;'); // Disable foreign key checks
            // NOTE: Comment these lines after first run
            // await pool.execute('TRUNCATE TABLE task_files;');
            // await pool.execute('TRUNCATE TABLE tasks;');
            // await pool.execute('TRUNCATE TABLE users;');
            await pool.execute('SET FOREIGN_KEY_CHECKS = 1;'); // Re-enable foreign key checks
            console.log('Existing data cleared successfully');
        } catch (error) {
            console.error('Error clearing existing data:', error.message);
            throw error;
        }

        // Check if users table exists, create if not
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    role ENUM('SuperAdmin','CompanyUser','EndUser') NOT NULL,
                    company VARCHAR(100),
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Users table ensured');
        } catch (error) {
            console.error('Error creating users table:', error.message);
            throw error;
        }

        // Check if tasks table exists, create if not
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    due_date DATE,
                    status ENUM('Pending','InProgress','Completed') DEFAULT 'Pending',
                    created_by INT,
                    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    assigned_to INT,
                    assigned_on TIMESTAMP NULL,
                    completed_on TIMESTAMP NULL,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('Tasks table ensured');
        } catch (error) {
            console.error('Error creating tasks table:', error.message);
            throw error;
        }

        // Check if task_files table exists, create if not
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS task_files (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    uploaded_by INT NOT NULL,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('Task files table ensured');
        } catch (error) {
            console.error('Error creating task_files table:', error.message);
            throw error;
        }

        // Test users with different roles and companies
        const testUsers = [
            // SuperAdmin users (complete system access)
            {
                name: "superadmin_john",
                email: "superadmin.john@techcorp.com",
                password: "admin123",
                role: "SuperAdmin",
                company: "TechCorp"
            },
            {
                name: "superadmin_sarah",
                email: "superadmin.sarah@innovatex.com",
                password: "admin123",
                role: "SuperAdmin",
                company: "InnovateX"
            },
            // CompanyUser users (company-specific access)
            {
                name: "companyuser_mike",
                email: "companyuser.mike@techcorp.com",
                password: "company123",
                role: "CompanyUser",
                company: "TechCorp"
            },
            {
                name: "companyuser_lisa",
                email: "companyuser.lisa@globex.com",
                password: "company123",
                role: "CompanyUser",
                company: "Globex"
            },
            {
                name: "companyuser_david",
                email: "companyuser.david@innovatex.com",
                password: "company123",
                role: "CompanyUser",
                company: "InnovateX"
            },
            // EndUser users (can create/update tasks)
            {
                name: "enduser_emma",
                email: "enduser.emma@techcorp.com",
                password: "user123",
                role: "EndUser",
                company: "TechCorp"
            },
            {
                name: "enduser_alex",
                email: "enduser.alex@techcorp.com",
                password: "user123",
                role: "EndUser",
                company: "TechCorp"
            },
            {
                name: "enduser_sophia",
                email: "enduser.sophia@globex.com",
                password: "user123",
                role: "EndUser",
                company: "Globex"
            },
            {
                name: "enduser_ryan",
                email: "enduser.ryan@innovatex.com",
                password: "user123",
                role: "EndUser",
                company: "InnovateX"
            },
            {
                name: "enduser_olivia",
                email: "enduser.olivia@innovatex.com",
                password: "user123",
                role: "EndUser",
                company: "InnovateX"
            }
        ];

        // Insert test users and store their IDs
        const userIds = {};
        for (const user of testUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const [result] = await pool.execute(
                "INSERT INTO users (name, email, password, role, company) VALUES (?, ?, ?, ?, ?)",
                [user.name, user.email, hashedPassword, user.role, user.company]
            );
            userIds[user.name] = result.insertId;
        }

        console.log("✅ Users created successfully!");

        // Test tasks data - all tasks initially have assigned_to as NULL
        const testTasks = [
            // TechCorp tasks
            {
                title: "Develop User Authentication",
                description: "Implement JWT-based authentication system for the application",
                due_date: "2024-02-15",
                status: "Pending",
                created_by: userIds["superadmin_john"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Database Schema Design",
                description: "Design and implement the database schema for task management",
                due_date: "2024-02-10",
                status: "Pending",
                created_by: userIds["companyuser_mike"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Frontend Dashboard",
                description: "Create responsive dashboard for task management",
                due_date: "2024-02-20",
                status: "Pending",
                created_by: userIds["superadmin_john"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "API Documentation",
                description: "Document all API endpoints with examples",
                due_date: "2024-02-25",
                status: "Pending",
                created_by: userIds["companyuser_mike"],
                // assigned_to: NULL (not assigned yet)
            },
            // InnovateX tasks
            {
                title: "Mobile App Development",
                description: "Develop React Native mobile application",
                due_date: "2024-03-01",
                status: "Pending",
                created_by: userIds["superadmin_sarah"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Cloud Deployment",
                description: "Deploy application to AWS cloud infrastructure",
                due_date: "2024-02-28",
                status: "Pending",
                created_by: userIds["companyuser_david"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Performance Testing",
                description: "Conduct load and performance testing",
                due_date: "2024-03-05",
                status: "Pending",
                created_by: userIds["superadmin_sarah"],
                // assigned_to: NULL (not assigned yet)
            },
            // Globex tasks
            {
                title: "UI/UX Design",
                description: "Design user interface and experience for the application",
                due_date: "2024-02-12",
                status: "Pending",
                created_by: userIds["companyuser_lisa"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Security Audit",
                description: "Conduct security audit and vulnerability assessment",
                due_date: "2024-02-18",
                status: "Pending",
                created_by: userIds["companyuser_lisa"],
                // assigned_to: NULL (not assigned yet)
            },
            {
                title: "Client Meeting Preparation",
                description: "Prepare materials for client demo and presentation",
                due_date: "2024-02-22",
                status: "Pending",
                created_by: userIds["companyuser_lisa"],
                // assigned_to: NULL (not assigned yet)
            }
        ];

        // Insert test tasks - all with assigned_to as NULL
        const taskIds = [];
        for (const task of testTasks) {
            const [result] = await pool.execute(
                "INSERT INTO tasks (title, description, due_date, status, created_by) VALUES (?, ?, ?, ?, ?)",
                [task.title, task.description, task.due_date, task.status, task.created_by]
            );
            taskIds.push(result.insertId);
        }

        console.log("✅ Tasks created successfully! All tasks are unassigned.");

        // Add sample task files for completed tasks
        const testFiles = [
            {
                task_id: taskIds[1], // Database Schema Design (completed)
                filename: "schema_documentation.pdf",
                file_path: "uploads/tasks/schema_doc_12345.pdf",
                uploaded_by: userIds["enduser_alex"]
            },
            {
                task_id: taskIds[1], // Database Schema Design (completed)
                filename: "erd_diagram.png",
                file_path: "uploads/tasks/erd_67890.png",
                uploaded_by: userIds["companyuser_mike"]
            },
            {
                task_id: taskIds[7], // UI/UX Design (completed)
                filename: "design_mockups.zip",
                file_path: "uploads/tasks/mockups_11121.zip",
                uploaded_by: userIds["enduser_sophia"]
            }
        ];

        // Insert test files
        for (const file of testFiles) {
            await pool.execute(
                "INSERT INTO task_files (task_id, filename, file_path, uploaded_by) VALUES (?, ?, ?, ?)",
                [file.task_id, file.filename, file.file_path, file.uploaded_by]
            );
        }

        console.log("✅ Task files created successfully!");

        // Display summary
        console.log("\n📊 Test Data Summary:");
        console.log(`   - Users: ${testUsers.length}`);
        console.log(`   - Tasks: ${testTasks.length}`);
        console.log(`   - Task Files: ${testFiles.length}`);
        
        console.log("\n👥 Users by Company:");
        const companies = {};
        testUsers.forEach(user => {
            if (!companies[user.company]) companies[user.company] = 0;
            companies[user.company]++;
        });
        Object.entries(companies).forEach(([company, count]) => {
            console.log(`   - ${company}: ${count} users`);
        });

        console.log("\n📋 Tasks by Status:");
        const statusCount = { Pending: 0, InProgress: 0, Completed: 0 };
        testTasks.forEach(task => {
            statusCount[task.status]++;
        });
        Object.entries(statusCount).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count} tasks`);
        });

        console.log("\n⚠️ CAUTION: Remove the TRUNCATE TABLE lines from this script after the first run to prevent accidental data loss.");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding test data:", error.message);
        process.exit(1);
    }
};

// Run the script
seedTestData();