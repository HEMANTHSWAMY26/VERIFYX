import type { InferenceAdapter } from "./InferenceAdapter";
import type { BackendType, InferenceResult } from "./types";
import type { Detection } from "../types/verification";

export class SimulationVisionAdapter implements InferenceAdapter {
    readonly name = "Simulated Inspection Engine (Demo Fallback)";
    readonly backend: BackendType = "simulated";
    private _isReady = false;
    private _loadTimeMs = 0;

    get isReady(): boolean {
        return this._isReady;
    }

    get loadTimeMs(): number {
        return this._loadTimeMs;
    }

    async init(): Promise<void> {
        this._loadTimeMs = 15;
        this._isReady = true;
    }

    async detect(
        source: HTMLVideoElement | HTMLCanvasElement | ImageData,
        _minConfidence = 0.50,
        _maxDetections = 10
    ): Promise<InferenceResult> {
        let width = 640;
        let height = 480;

        if (source instanceof HTMLVideoElement) {
            width = source.videoWidth || 640;
            height = source.videoHeight || 480;
        } else if (source instanceof HTMLCanvasElement) {
            width = source.width;
            height = source.height;
        }

        const detections: Detection[] = [
            {
                id: "sim-det-01",
                label: "FIRE EXTINGUISHER",
                category: "fire_extinguisher",
                confidence: 0.94,
                bbox: { x: 0.15, y: 0.28, width: 0.22, height: 0.44 },
                statusText: "DETECTED & MOUNTED",
                timestamp: Date.now(),
            },
            {
                id: "sim-det-02",
                label: "EMERGENCY EXIT",
                category: "emergency_exit",
                confidence: 0.91,
                bbox: { x: 0.68, y: 0.18, width: 0.26, height: 0.52 },
                statusText: "ILLUMINATED & CLEAR",
                timestamp: Date.now(),
            },
            {
                id: "sim-det-03",
                label: "SAFETY SIGN",
                category: "safety_sign",
                confidence: 0.88,
                bbox: { x: 0.44, y: 0.12, width: 0.18, height: 0.2 },
                statusText: "COMPLIANT POSITION",
                timestamp: Date.now(),
            },
            {
                id: "sim-det-04",
                label: "SAFETY EQUIPMENT",
                category: "required_equipment",
                confidence: 0.86,
                bbox: { x: 0.12, y: 0.72, width: 0.24, height: 0.22 },
                statusText: "STATION PRESENT",
                timestamp: Date.now(),
            },
            {
                id: "sim-det-05",
                label: "ACCESS OBSTRUCTION",
                category: "obstruction",
                confidence: 0.93,
                bbox: { x: 0.38, y: 0.58, width: 0.28, height: 0.32 },
                isIssue: true,
                statusText: "CORRIDOR BLOCKED",
                timestamp: Date.now(),
            },
        ];

        return {
            detections,
            inferenceTimeMs: 12,
            engineName: this.name,
            backend: this.backend,
            timestamp: Date.now(),
            frameWidth: width,
            frameHeight: height,
        };
    }

    async dispose(): Promise<void> {
        this._isReady = false;
    }
}
