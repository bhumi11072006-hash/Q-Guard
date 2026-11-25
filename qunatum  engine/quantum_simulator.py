
"""
Q-Guard - Quantum Simulator

Runs a three-qubit bit-flip error correction
simulation using Qiskit Aer.
"""

from qiskit import transpile
from qiskit_aer import AerSimulator

from error_correction import create_error_correction_circuit
from noise_models import create_noise_model # type: ignore


SUPPORTED_SHOTS = [256, 1024, 4096, 8192]
SUPPORTED_CODES = ["bit_flip"]


def run_quantum_simulation(
    code_type: str,
    noise_type: str,
    error_probability: float,
    shots: int = 1024,
    target_qubit: int = 0
):
    """
    Execute a quantum error correction simulation.

    The logical input is |0>. Fidelity here is an
    estimated logical-zero survival rate, not a
    general quantum state fidelity.
    """

    if code_type not in SUPPORTED_CODES:
        raise ValueError(
            f"Unsupported code type: {code_type}. "
            "Currently only bit_flip is implemented."
        )

    if shots not in SUPPORTED_SHOTS:
        raise ValueError(
            f"Shots must be one of {SUPPORTED_SHOTS}."
        )

    if not 0 <= error_probability <= 0.5:
        raise ValueError(
            "Error probability must be between 0 and 0.5."
        )

    if target_qubit not in [0, 1, 2]:
        raise ValueError(
            "Target qubit must be 0, 1, or 2."
        )

    # Build the error correction circuit
    circuit = create_error_correction_circuit(
        code_type=code_type,
        target_qubit=target_qubit
    )

    # Build the selected noise channel
    noise_model = create_noise_model(
        noise_type=noise_type,
        probability=error_probability
    )

    # Initialize simulator
    simulator = AerSimulator(
        noise_model=noise_model
    )

    # Compile circuit
    compiled_circuit = transpile(
        circuit,
        simulator,
        optimization_level=0
    )

    # Execute simulation
    job = simulator.run(
        compiled_circuit,
        shots=shots
    )

    result = job.result()
    counts = result.get_counts()

    total_shots = sum(counts.values())

    if total_shots == 0:
        raise RuntimeError(
            "No measurement results received."
        )

    logical_zero_count = 0
    logical_one_count = 0
    syndrome_counts = {}

    for bitstring, count in counts.items():

        registers = bitstring.split()

        # Classical output register appears first
        output_bit = registers[0][-1]

        # Syndrome register appears second
        syndrome = (
            registers[1]
            if len(registers) > 1
            else "unknown"
        )

        if output_bit == "0":
            logical_zero_count += count
        else:
            logical_one_count += count

        syndrome_counts[syndrome] = (
            syndrome_counts.get(syndrome, 0) + count
        )

    recovery_success_rate = (
        logical_zero_count / total_shots
    )

    logical_error_rate = (
        logical_one_count / total_shots
    )

    fidelity = recovery_success_rate

    return {
        "code_type": code_type,
        "noise_type": noise_type,
        "error_probability": error_probability,
        "target_qubit": target_qubit,
        "shots": total_shots,

        "fidelity": fidelity,
        "recovery_success_rate": recovery_success_rate,
        "logical_error_rate": logical_error_rate,

        "syndrome_summary": {
            "syndrome_counts": syndrome_counts,
            "measurement_counts": counts
        },

        "measurement_counts": counts,

        "interpretation": (
            "Results represent logical-zero survival "
            "for an initial |0> state. Fidelity is an "
            "estimated measurement-based metric, not "
            "a general quantum state fidelity."
        )
    }


