# VERIFYX

### Point. Verify. Fix. Verify Again.

VERIFYX is a phone-first, offline-first physical-world verification prototype designed to inspect physical workplace environments against predefined safety standards. By combining real-time local computer vision with a spatial rule engine, VERIFYX bridges the gap between digital compliance checklists and physical reality without relying on cloud servers or external APIs.

---

## Problem

Businesses rely heavily on manual physical inspections to verify that facilities meet workplace safety standards. Traditional verification processes are slow, subjective, inconsistent, and error-prone: inspectors must walk through facilities, visually check assets, take photos, compare observations against written guidelines, and compile manual reports. This leaves physical evidence scattered, compliance data delayed, and corrective actions difficult to audit.

## Solution

VERIFYX turns any smartphone or web browser into an autonomous physical-world verification engine. Instead of simply detecting objects, VERIFYX evaluates physical evidence against explicit safety standards in real time. Identified hazards trigger an interactive issue lifecycle—guiding inspectors to correct physical obstructions and re-scan the environment to confirm resolution with immutable visual evidence.

## Core Flow

```
POINT  ➔  VERIFY  ➔  FIX  ➔  VERIFY AGAIN
```

1. **POINT**: Aim camera or select evaluation scenario.
2. **VERIFY**: Real-time AI detection evaluates evidence against safety rules.
3. **FIX**: Clear physical hazards or adjust asset placement based on visual feedback.
4. **VERIFY AGAIN**: Re-scan the environment to confirm resolution and store evidence.

---

## Key Capabilities

- **Local AI Vision**: Runs real-time object detection directly inside the browser using ONNX Runtime WebAssembly (WASM).
- **Confidence-Aware Verification**: Enforces confidence tiers (HIGH, MEDIUM, LOW) to prevent false passes and trigger human supervisor review when uncertain.
- **Spatial Pathway Reasoning**: Evaluates spatial overlap between objects and walking corridors to identify physical egress obstructions.
- **Temporal Confirmation**: Requires multi-frame persistence before confirming physical verification decisions.
- **Evidence Lifecycle & Audit Trail**: Preserves initial violation evidence and re-scan clearance frames side-by-side in session history.
- **Offline-First Inspection Reporting**: Generates complete, print-ready inspection reports and structured JSON payloads without external backend dependencies.
- **Dataset Demo Mode**: Provides a reproducible evaluation interface using approved held-out test images without requiring personal photographs.
- **Graceful Fallback**: Automatically provides Dataset Demo mode if camera permissions are unavailable.

---

## Technology

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS (Dark-mode, neon accent visual design)
- **Object Detection**: Custom YOLO11n (ONNX format)
- **Inference Runtime**: ONNX Runtime Web (WASM execution provider with SIMD multi-threading)
- **Fallbacks**: WebGL COCO-SSD / Lightweight Rule Simulator
- **Rule Engine**: Custom TypeScript Spatial & Confidence Rule Engine

---

## Model

VERIFYX uses a custom **YOLO11n** object detection model trained specifically for the project's MVP workplace safety taxonomy:
- `fire_extinguisher`
- `exit_sign`
- `hazard_sign`
- `box`
- `chair`

The model is exported to ONNX format (10.15 MB, 640×640 input resolution) and executed locally in the browser via WebAssembly.

*Note: The model is a domain-specific prototype trained for workplace safety assets and does not claim universal multi-domain object recognition accuracy.*

---

## Evaluation

Operational evaluation results measured during Phase 8.8 testing on the project's evaluation pool (primary inspection distance 1.0 m – 4.5 m):

| Target Class | Measured Recall | Performance Notes |
| :--- | :---: | :--- |
| **Fire Extinguisher** | **93.2%** | Clear frontal access and wall mounting |
| **Emergency Exit Sign** | **87.2%** | Standard illuminated overhead signage |
| **Hazard Sign** | **98.0%** | Floor warning cones & wall hazard placards |
| **Clean-Floor False Alarms** | **0** | Evaluated on unobstructed corridor pool |
| **Cross-Class Confusion** | **0** | Zero misclassifications between safety classes |

**Inference Latency**: ~504 ms average per frame in browser WASM (~1.96 FPS background inference loop). Camera preview operates asynchronously at native 60 FPS without UI freeze.

---

## Demo

The **Dataset Demo / Evaluation Mode** uses approved held-out test images so the demonstration is completely reproducible and does not require personal photographs or camera permissions.

Evaluators can select from five standardized test scenarios:
1. `Fire Extinguisher` (`/test_samples/fe.jpg`)
2. `Emergency Exit Sign` (`/test_samples/exit.jpg`)
3. `Hazard Sign` (`/test_samples/hazard.jpg`)
4. `Clear Pathway` (`/test_samples/chair.jpg`)
5. `Empty / No Detection` (`/test_samples/empty.jpg`)

*All test samples pass through the exact same ONNX model and spatial rule pipeline as live camera frames.*

---

## Architecture

```
+-----------------------------------------------------------------------------------+
|                                 VERIFYX ENGINE                                    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Camera Feed / Test Sample ] ──► [ ONNX Runtime WASM ] ──► Raw Detections       |
|                                                                    │              |
|                                                                    ▼              |
|  [ Inspection Report ] ◄── [ Session Lifecycle ] ◄── [ Spatial Rule Engine ]      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Limitations

- **Small/Distant Objects**: Detection reliability drops substantially for objects occupying < 32 pixels or positioned > 4.5 m away (triggers automatic "MOVE CLOSER" guardrail).
- **Browser WASM Latency**: Background inference runs at ~2 FPS on CPU WASM execution provider.
- **Corridor Geometry**: Spatial pathway reasoning relies on 2D bounding box intersection with designated walking corridor zones.
- **Prototype Status**: This prototype rule engine is not a certified workplace safety compliance system.

---

## Privacy

The submission demo does not require personal photographs. Approved dataset/test images are used for reproducible evaluation. No camera frames or personal images are uploaded, stored remotely, or transmitted to any external server.

---

## Disclaimer

> **Notice**: This prototype rule engine is not a certified workplace safety compliance system.
