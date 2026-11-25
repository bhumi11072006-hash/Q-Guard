
"""
Q-Guard - Quantum Noise Models

Creates quantum noise channels using Qiskit Aer.
Noise is applied through an explicit identity gate
placed on the selected data qubit.
"""

from qiskit_aer.noise import (
    NoiseModel,
    pauli_error,
    depolarizing_error,
    amplitude_damping_error
)


SUPPORTED_NOISES = [
    "bit_flip",
    "phase_flip",
    "depolarizing",
    "amplitude_damping"
]


def create_noise_model(noise_type: str, probability: float):
    """
    Create a quantum noise model.

    The selected error channel is attached only to
    the identity gate. The circuit places this gate
    on the target qubit at the required point.
    """

    if noise_type not in SUPPORTED_NOISES:
        raise ValueError(
            f"Unsupported noise model: {noise_type}"
        )

    if not 0 <= probability <= 0.5:
        raise ValueError(
            "Probability must be between 0 and 0.5."
        )

    noise_model = NoiseModel()

    if probability == 0:
        return noise_model

    if noise_type == "bit_flip":
        error = pauli_error([
            ("X", probability),
            ("I", 1 - probability)
        ])

    elif noise_type == "phase_flip":
        error = pauli_error([
            ("Z", probability),
            ("I", 1 - probability)
        ])

    elif noise_type == "depolarizing":
        error = depolarizing_error(probability, 1)

    elif noise_type == "amplitude_damping":
        error = amplitude_damping_error(probability)

    noise_model.add_all_qubit_quantum_error(
        error,
        ["id"]
    )

    return noise_model

