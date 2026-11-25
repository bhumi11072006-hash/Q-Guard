
/**
 * Q-Guard - Database Configuration
 * Uses Node.js built-in SQLite module.
 */

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

// Database folder location
const databaseFolder = path.join(__dirname, "database");

// Create database folder if it does not exist
if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
}

// Database file location
const databasePath = path.join(databaseFolder, "quantum.db");

// Create database connection
const db = new DatabaseSync(databasePath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON");

// Create tables
function initializeDatabase() {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                code_type TEXT NOT NULL,

                noise_type TEXT NOT NULL,

                error_probability REAL NOT NULL,

                shots INTEGER NOT NULL,

                target_qubit INTEGER NOT NULL,

                fidelity REAL,

                recovery_success_rate REAL,

                logical_error_rate REAL,

                syndrome_summary TEXT,

                interpretation TEXT,

                results_json TEXT,

                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_simulations_created_at
            ON simulations(created_at);

            CREATE INDEX IF NOT EXISTS idx_simulations_code_type
            ON simulations(code_type);

            CREATE INDEX IF NOT EXISTS idx_simulations_noise_type
            ON simulations(noise_type);
        `);

        console.log("Q-Guard database initialized successfully.");
        console.log(`Database location: ${databasePath}`);

    } catch (error) {
        console.error("Database initialization failed:", error.message);
        throw error;
    }
}

// Initialize database immediately
initializeDatabase();

// Export database connection
module.exports = {
    db,
    initializeDatabase
};
