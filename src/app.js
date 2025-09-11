// Import Express
import express from 'express';
import cors from "cors";
import cookierParser from "cookie-parser";

const app = express();

// data handling
app.use(express.json({limit: "16Kb"}));

// url encoder
app.use(express.urlencoded({extended: true, limit: "16Kb"}));

// static folder
app.use(express.static("public"));

// cookierParser
app.use(cookierParser());


// Define or import routes here and then use them
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
// import { errorHandler } from './middlewares/errorMiddleware.js';

app.get('/', (req, res) => {
res.send('Hello, Express!');
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tasks", taskRoutes);

// Error handling middleware
// app.use(errorHandler);
export {app}