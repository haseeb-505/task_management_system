import mysql from "mysql2/promise";

let serverPool = null;
let databasePool = null;

export const getPool = (includeDatabase = false) => {
    if (includeDatabase) {
        if (!databasePool) {
            databasePool = mysql.createPool({
                host: process.env.DB_HOST || "localhost",
                user: process.env.DB_USER || "root",
                password: process.env.DB_PASS,
                database: process.env.DB_NAME || "task_manager",
                waitForConnections: true,
                connectionLimit: 10,
            });
        }
        return databasePool;
    } else {
        if (!serverPool) {
            serverPool = mysql.createPool({
                host: process.env.DB_HOST || "localhost",
                user: process.env.DB_USER || "root",
                password: process.env.DB_PASS,
                waitForConnections: true,
                connectionLimit: 10,
            });
        }
        return serverPool;
    }
}

// Updated testConnection function
export const testConnection = async (testDatabase = false) => {
    try {
        const currentPool = getPool(testDatabase);
        const connection = await currentPool.getConnection();
        console.log(testDatabase ? 'Database connected successfully' : 'Database server connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('Connection failed:', error.message);
        return false;
    }
}

export default getPool;