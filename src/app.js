// Import Express
import express from 'express';
import cors from "cors";
import cookierParser from "cookie-parser";

const app = express();

// cookierParser
app.use(cookierParser());


// Define a route
app.get('/', (req, res) => {
res.send('Hello, Express!');
});

export {app}