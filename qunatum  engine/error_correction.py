
"""
Q-Guard - Quantum Error Correction

Three-qubit repetition code with:
1. Logical qubit encoding
2. Selected-qubit noise injection
3. Ancilla-based syndrome measurement
4. Conditional error recovery
5. Logical output measurement
"""

from qiskit import (
    QuantumCircuit,
    QuantumRegister,
    ClassicalRegister
)


def create_bit_flip_circuit(target_qubit=0):

    if target_qubit not in [0, 1, 2]:
        raise ValueError(
            "Target qubit must be 0, 1, or 2."
        )

    data = QuantumRegister(3, "data")
    ancilla = QuantumRegister(2, "ancilla")

    syndrome = ClassicalRegister(2, "syndrome")
    output = ClassicalRegister(1, "output")

    qc = QuantumCircuit(
        data,
        ancilla,
        syndrome,
        output
    )

    # Step 1: Encode logical |0> into |000>
    qc.cx(data[0], data[1])
    qc.cx(data[0], data[2])

    qc.barrier()

    # Step 2: Inject selected noise channel
    # Noise is attached to this identity gate
    qc.id(data[target_qubit])

    qc.barrier()

    # Step 3: Measure parity checks
    qc.cx(data[0], ancilla[0])
    qc.cx(data[1], ancilla[0])

    qc.cx(data[1], ancilla[1])
    qc.cx(data[2], ancilla[1])

    qc.measure(ancilla[0], syndrome[0])
    qc.measure(ancilla[1], syndrome[1])

    qc.barrier()

    # Step 4: Correct the detected bit-flip error
    with qc.if_test((syndrome, 1)):
        qc.x(data[0])

    with qc.if_test((syndrome, 3)):
        qc.x(data[1])

    with qc.if_test((syndrome, 2)):
        qc.x(data[2])

    qc.barrier()

    # Step 5: Measure recovered logical state
    qc.measure(data[0], output[0])

    return qc


def create_error_correction_circuit(
    code_type="bit_flip",
    target_qubit=0
):

    if code_type == "bit_flip":
        return create_bit_flip_circuit(target_qubit)

    raise ValueError(
        f"{code_type} circuit is not implemented yet."
    )
