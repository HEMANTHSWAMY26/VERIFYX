import type { Detection } from "../types/verification";

export type VisionEngineMode = "local_model" | "simulation";

export type BackendType = "webgl" | "wasm" | "cpu" | "simulated";

export interface InferenceResult {
    detections: Detection[];
    inferenceTimeMs: number;
    engineName: string;
    backend: BackendType;
    timestamp: number;
    frameWidth: number;
    frameHeight: number;
}

export interface VisionEngineStatus {
    mode: VisionEngineMode;
    state: "uninitialized" | "loading" | "ready" | "error" | "fallback";
    engineName: string;
    backend: BackendType;
    engineType?: "yolo" | "coco_ssd" | "simulation";
    loadTimeMs?: number;
    lastInferenceMs?: number;
    fps?: number;
    errorMessage?: string;
    queueState?: "idle" | "in_flight";
}

export interface VisionEngineConfig {
    mode?: VisionEngineMode;
    minConfidence?: number;
    maxDetections?: number;
    throttleMs?: number; // Throttle interval between inference calls (e.g. 150-200ms -> 5-7 FPS)
}
