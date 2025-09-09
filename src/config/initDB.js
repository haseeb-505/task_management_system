import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool } from "./db.js"; // Import named export, not default

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initDB = async () => {
  try {
    const schemaPath = path.join(__dirname, "../models/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Use getPool(false) - we don't need specific database yet
    const pool = getPool(false);
    const connection = await pool.getConnection();

    // Create database if it doesn't exist
    await connection.query("CREATE DATABASE IF NOT EXISTS task_manager");
    await connection.query("USE task_manager");

    // Split the schema into individual statements and execute them one by one
    const statements = schema.split(';').filter(statement => statement.trim() !== '');
    for (const statement of statements) {
      if (statement.trim()) {
        try {
              await connection.query(statement);
        } catch (error) {
          if (!error.message.includes("already exists")) {
            throw error
          }
          console.log(`Table already exists: ${statement.split(' ')[2]}`);
        }        
      }
    }
    
    connection.release();
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Failed to initialize schema:", error.message);
    throw error;
  }
};