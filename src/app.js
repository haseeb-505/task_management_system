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
import authRoutes from "./routes/authRoutes.js"
app.get('/', (req, res) => {
res.send('Hello, Express!');
});

app.use("/api/v1/auth", authRoutes);

export {app}