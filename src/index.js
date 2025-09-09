import dotenv from 'dotenv';
import {app} from './app.js';
// import getPool from '../config/db.js';
import { testConnection } from './config/db.js';

// config dotenv
dotenv.config({
    path: "./.env"
});

// test the db connection
const isDbConnected = await testConnection();
if (!isDbConnected) {
    console.log("Exiting due to database connection failure.");
    // exiting the aap if db is not connected 
    process.exit(1); 
}

// Start the server
app.listen(process.env.PORT || 3000, () => {
console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});