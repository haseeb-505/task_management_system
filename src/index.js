import dotenv from 'dotenv';
import { app } from './app.js';
import { testConnection } from './config/db.js';
import { initDB } from './config/initDB.js';

// config dotenv
dotenv.config({
    path: "./.env"
});

const startServer = async () => {
    // Step 1: Test server connection (no database specified)
    console.log("Testing MySQL server connection...");
    const isServerConnected = await testConnection(false);
    if (!isServerConnected) {
        console.log("Exiting due to server connection failure.");
        process.exit(1); 
    }

    // Step 2: Initialize database and tables
    console.log("Initializing database schema...");
    await initDB();

    // Step 3: Test database connection (with database specified)
    console.log("Testing database connection...");
    const isDatabaseConnected = await testConnection(true);
    if (!isDatabaseConnected) {
        console.log("Exiting due to database connection failure.");
        process.exit(1); 
    }

    // Start the server
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
    });
};

// Use .catch to handle any uncaught errors in the async function
startServer().catch(error => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
});