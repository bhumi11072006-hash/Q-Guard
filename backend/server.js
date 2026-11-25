
// Q-Guard - Main Backend Server

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501"
    ]
}));

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
    res.json({
        success: true,
        project: "Q-Guard",
        message: "Q-Guard Backend API is running"
    });
});

// Mount all API routes
app.use("/api", apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

// Start server
app.listen(PORT, () => {
    console.log("----------------------------------");
    console.log("       Q-GUARD BACKEND");
    console.log("----------------------------------");
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Dashboard: http://localhost:${PORT}/api/dashboard`);
    console.log("----------------------------------");
});
