
"""
Q-Guard - Quantum Engine API

FastAPI service connecting the Node.js backend
to the Qiskit quantum simulation engine.
"""

from fastapi import FastAPI, HTTPException # type: ignore
from pydantic import BaseModel, Field # type: ignore

from quantum_simulator import run_quantum_simulation


app = FastAPI(
    title="Q-Guard Quantum Engine",
    description="Quantum Error Detection and Recovery Simulator",
    version="1.0.0"
)


class SimulationRequest(BaseModel):

    codeType: str = "bit_flip"

    noiseType: str

    errorProbability: float = Field(
        ge=0,
        le=0.5
    )

    shots: int

    targetQubit: int = Field(
        ge=0,
        le=2
    )


@app.get("/")
def home():

    return {
        "success": True,
        "project": "Q-Guard",
        "service": "Quantum Engine",
        "message": "Quantum Engine is running."
    }


@app.get("/health")
def health():

    return {
        "success": True,
        "status": "online",
        "engine": "Qiskit Aer",
        "supported_codes": ["bit_flip"],
        "supported_noise_models": [
            "bit_flip",
            "phase_flip",
            "depolarizing",
            "amplitude_damping"
        ]
    }


@app.post("/simulate")
def simulate(request: SimulationRequest):

    try:

        result = run_quantum_simulation(
            code_type=request.codeType,
            noise_type=request.noiseType,
            error_probability=request.errorProbability,
            shots=request.shots,
            target_qubit=request.targetQubit
        )

        # Return metrics at the top level so the
        # Node.js controller can read them directly.
        return {
            "success": True,
            "message": "Quantum simulation completed successfully.",
            **result
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Quantum simulation failed: {str(error)}"
        )
