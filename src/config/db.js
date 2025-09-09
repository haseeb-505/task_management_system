import mysql from "mysql2/promise";

let pool;

export const getPool = () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS,
            database: process.env.DB_NAME || "task_manager",
            waitForConnections: true,
            connectionLimit: 10,
        });
    }
    return pool;
}

// creating a testConnection function to check the dbConnection in app.js or index.js
export const testConnection = async () => {
        try {
           const currentPool = getPool()
           const connection = await currentPool.getConnection();
            console.log('Database connected successfully');
            connection.release();
            return true;
        } catch (error) {
            console.error('Database connection failed:', error.message);
            return false;
        }
    }

export default getPool;
