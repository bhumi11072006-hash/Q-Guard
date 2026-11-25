
const express = require("express");

const router = express.Router();

const {
    runSimulation,
    getSimulations,
    getDashboard,
    getAnalytics
} = require("../controllers/simulationController");

// API health check
router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "online",
        project: "Q-Guard",
        service: "Backend API",
        timestamp: new Date().toISOString()
    });
});

// Run quantum simulation
router.post("/simulate", runSimulation);

// Get simulation history
router.get("/simulations", getSimulations);

// Get dashboard statistics
router.get("/dashboard", getDashboard);

// Get analytics data
router.get("/analytics", getAnalytics);

module.exports = router;

