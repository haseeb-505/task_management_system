// scripts/seedTestData.js
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

        // Check if users table exists, create if not
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('SuperAdmin', 'CompanyUser', 'EndUser') NOT NULL,
                    company VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Users table ensured');
        } catch (error) {
            console.error('Error creating users table:', error.message);
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

        // Insert test users
        for (const user of testUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await pool.execute(
                "INSERT INTO users (name, email, password, role, company) VALUES (?, ?, ?, ?, ?)",
                [user.name, user.email, hashedPassword, user.role, user.company]
            );
        }

        console.log("Test data seeded successfully!");
        console.log("📊 Users created:");
        testUsers.forEach(user => {
            console.log(`   - ${user.name} (${user.role}) - ${user.company}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error("Error seeding test data:", error.message);
        process.exit(1);
    }
};

// Run the script
seedTestData();