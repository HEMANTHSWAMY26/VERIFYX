# VERIFYX Model Registry & Artifacts

This directory stores intermediate and production-ready model weights for VERIFYX.

## Directory Layout

```
models/
├── weights/            # PyTorch checkpoint weights (.pt)
│   └── yolo11n_safety_best.pt
├── onnx/               # Exported ONNX graphs for web/cross-platform runtime
│   └── yolo11n_safety.onnx
├── tflite/             # TFLite / LiteRT models for Android runtime
│   └── yolo11n_safety_fp16.tflite
└── benchmarks/         # Documented benchmark logs with real device metrics
```

## Model Architecture

- **Base Architecture**: YOLO11 Nano (`yolo11n`)
- **Parameters**: ~2.6M parameters (ultra-lightweight for edge devices)
- **Input Resolution**: 640x640 (configurable down to 480x480 for ultra-low latency mobile)
- **Execution Target**:
  - Web: ONNX Runtime Web (WASM / WebGL)
  - Mobile (Android): Qualcomm NPU (QNN via ONNX Runtime / LiteRT GPU/NPU delegate)
  - Fallback: Local CPU multi-threaded SIMD

## Verification Contract

No model weights stored here may be deployed to production or active verification unless:
1. They pass `scripts/test_harness.py` across standardized test sets.
2. Predictions map faithfully to the VERIFYX domain `Detection` contract.
3. Every latency claim is measured on actual target hardware and marked accordingly (`VERIFIED` vs `UNVALIDATED ESTIMATE`).
