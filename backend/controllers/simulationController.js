
/**
 * Q-Guard - Simulation Controller
 * Handles simulation requests, Python engine communication,
 * database storage, dashboard and analytics.
 */

const { db } = require("../database");

// Allowed simulation configurations
const ALLOWED_CODES = ["bit_flip"];

const ALLOWED_NOISE = [
    "bit_flip",
    "phase_flip",
    "depolarizing",
    "amplitude_damping"
];

const ALLOWED_SHOTS = [256, 1024, 4096, 8192];

// Helper: Convert stored JSON safely
function parseJSON(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// Helper: Check numeric values
function isValidNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

// POST /api/simulate
async function runSimulation(req, res) {
    try {
        const {
            codeType,
            noiseType,
            errorProbability,
            shots,
            targetQubit
        } = req.body || {};

        // Validate error correction code
        if (!ALLOWED_CODES.includes(codeType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid error correction code."
            });
        }

        // Validate noise model
        if (!ALLOWED_NOISE.includes(noiseType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid noise model."
            });
        }

        // Validate error probability
        if (
            !isValidNumber(errorProbability) ||
            errorProbability < 0 ||
            errorProbability > 0.5
        ) {
            return res.status(400).json({
                success: false,
                message: "Error probability must be between 0 and 0.5."
            });
        }

        // Validate shots
        if (!ALLOWED_SHOTS.includes(Number(shots))) {
            return res.status(400).json({
                success: false,
                message: "Invalid shot count."
            });
        }

        // Validate target qubit
        const maxQubit = codeType === "shor" ? 8 : 2;

        if (
            !Number.isInteger(targetQubit) ||
            targetQubit < 0 ||
            targetQubit > maxQubit
        ) {
            return res.status(400).json({
                success: false,
                message: `Target qubit must be between 0 and ${maxQubit}.`
            });
        }

        // Python engine URL
        const engineURL =
            process.env.PYTHON_ENGINE_URL ||
            "http://127.0.0.1:8000";

        // Send request to actual Python quantum engine
        let engineResponse;

        try {
            engineResponse = await fetch(`${engineURL}/simulate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    codeType,
                    noiseType,
                    errorProbability,
                    shots: Number(shots),
                    targetQubit
                }),
                signal: AbortSignal.timeout(60000)
            });
        } catch (error) {
            console.error("Quantum engine connection error:", error.message);

            return res.status(503).json({
                success: false,
                message: "Quantum engine is unavailable. Start the Python engine first."
            });
        }

        if (!engineResponse.ok) {
            const errorText = await engineResponse.text();

            console.error("Quantum engine error:", errorText);

            return res.status(502).json({
                success: false,
                message: "Quantum engine failed to process the simulation."
            });
        }

        const result = await engineResponse.json();

        // Validate engine response
        if (
            !isValidNumber(result.fidelity) ||
            !isValidNumber(result.recovery_success_rate) ||
            !isValidNumber(result.logical_error_rate)
        ) {
            return res.status(502).json({
                success: false,
                message: "Quantum engine returned an invalid result."
            });
        }

        // Store simulation in SQLite
        const statement = db.prepare(`
            INSERT INTO simulations (
                code_type,
                noise_type,
                error_probability,
                shots,
                target_qubit,
                fidelity,
                recovery_success_rate,
                logical_error_rate,
                syndrome_summary,
                interpretation,
                results_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const saved = statement.run(
            codeType,
            noiseType,
            errorProbability,
            Number(shots),
            targetQubit,
            result.fidelity,
            result.recovery_success_rate,
            result.logical_error_rate,
            JSON.stringify(result.syndrome_summary ?? {}),
            result.interpretation ?? "",
            JSON.stringify(result)
        );

        return res.status(200).json({
            success: true,
            message: "Simulation completed successfully.",
            simulationId: Number(saved.lastInsertRowid),
            result
        });

    } catch (error) {
        console.error("Simulation controller error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to complete simulation."
        });
    }
}


// GET /api/simulations
function getSimulations(req, res) {
    try {
        const simulations = db.prepare(`
            SELECT *
            FROM simulations
            ORDER BY id DESC
            LIMIT 100
        `).all();

        const formatted = simulations.map(item => ({
            ...item,
            syndrome_summary: parseJSON(item.syndrome_summary),
            results: parseJSON(item.results_json)
        }));

        return res.json({
            success: true,
            total: formatted.length,
            simulations: formatted
        });

    } catch (error) {
        console.error("History error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load simulation history."
        });
    }
}


// GET /api/dashboard
function getDashboard(req, res) {
    try {
        const stats = db.prepare(`
            SELECT
                COUNT(*) AS total_simulations,
                AVG(fidelity) AS average_fidelity,
                AVG(recovery_success_rate) AS recovery_rate,
                AVG(logical_error_rate) AS logical_error_rate
            FROM simulations
        `).get();

        const recent = db.prepare(`
            SELECT
                id,
                code_type,
                noise_type,
                fidelity,
                recovery_success_rate,
                created_at
            FROM simulations
            ORDER BY id DESC
            LIMIT 5
        `).all();

        return res.json({
            success: true,
            stats,
            recentActivity: recent
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard data."
        });
    }
}


// GET /api/analytics
function getAnalytics(req, res) {
    try {
        const summary = db.prepare(`
            SELECT
                COUNT(*) AS total_simulations,
                AVG(fidelity) AS average_fidelity,
                AVG(recovery_success_rate) AS recovery_rate,
                AVG(logical_error_rate) AS logical_error_rate
            FROM simulations
        `).get();

        const noiseStats = db.prepare(`
            SELECT
                noise_type,
                COUNT(*) AS total,
                AVG(fidelity) AS average_fidelity,
                AVG(logical_error_rate) AS average_error
            FROM simulations
            GROUP BY noise_type
        `).all();

        const codeStats = db.prepare(`
            SELECT
                code_type,
                COUNT(*) AS total,
                AVG(fidelity) AS average_fidelity,
                AVG(recovery_success_rate) AS recovery_rate
            FROM simulations
            GROUP BY code_type
        `).all();

        return res.json({
            success: true,
            summary,
            noiseStats,
            codeStats
        });

    } catch (error) {
        console.error("Analytics error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load analytics."
        });
    }
}


module.exports = {
    runSimulation,
    getSimulations,
    getDashboard,
    getAnalytics
};
