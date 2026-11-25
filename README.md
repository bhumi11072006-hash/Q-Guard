
# Q-Guard
### Quantum Error Detection and Recovery Simulator

Q-Guard is a quantum computing simulation platform designed to demonstrate quantum error detection and recovery using Qiskit.

## Project Overview

Quantum computers are sensitive to noise and errors that can affect computation results. Q-Guard provides an interactive platform to simulate quantum noise, analyze errors, and understand error correction techniques.

## Key Features

- Quantum circuit simulation using Qiskit.
- Bit-flip error correction.
- Quantum noise simulation.
- Configurable error probability and shot count.
- Syndrome measurement and analysis.
- Simulation history stored in SQLite.
- Dashboard statistics and analytics.

## Technologies Used

| Component | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Quantum Engine | Python, Qiskit, Qiskit Aer |
| Database | SQLite |
| Version Control | Git, GitHub |

## Project Structure

```text
Q-Guard/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── database.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── qunatum  engine/
│   ├── main.py
│   ├── error_correction.py
│   ├── noise_models.py
│   ├── quantum_simulator.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Current Implementation

- Bit-flip repetition code (3-qubit).
- Bit-flip, phase-flip, depolarizing and amplitude-damping noise models.
- Measurement-based simulation metrics.
- Node.js API integration with the Python quantum engine.
- SQLite simulation storage.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/bhumi11072006-hash/Q-Guard.git
cd Q-Guard
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` and configure:

```env
PORT=3000
PYTHON_ENGINE_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5500
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

### 3. Quantum Engine Setup

Open a new terminal:

```bash
cd "qunatum  engine"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Access Backend APIs

- Health: http://localhost:3000/api/health
- Dashboard: http://localhost:3000/api/dashboard
- Analytics: http://localhost:3000/api/analytics

## Team Project

Developed collaboratively as an academic group project.

## Disclaimer

Q-Guard is an educational quantum error simulation platform. Simulation metrics are measurement-based and should not be interpreted as universal quantum state fidelity.


