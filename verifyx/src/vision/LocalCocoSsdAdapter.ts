import type { InferenceAdapter } from "./InferenceAdapter";
import type { BackendType, InferenceResult } from "./types";
import type { Detection } from "../types/verification";

// Import TensorFlow.js and COCO-SSD
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { evaluateConfidenceDecision } from "../rules/confidencePolicy";

export class LocalCocoSsdAdapter implements InferenceAdapter {
    readonly name = "Local MobileNet-SSD Vision Engine";
    private _backend: BackendType = "webgl";
    private _model: cocoSsd.ObjectDetection | null = null;
    private _isReady = false;
    private _loadTimeMs = 0;

    get backend(): BackendType {
        return this._backend;
    }

    get isReady(): boolean {
        return this._isReady;
    }

    get loadTimeMs(): number {
        return this._loadTimeMs;
    }

    async init(): Promise<void> {
        if (this._isReady && this._model) return;

        const startTime = performance.now();
        try {
            // Ensure TFJS is initialized and ready
            await tf.ready();
            const currentBackend = tf.getBackend();
            this._backend =
                currentBackend === "webgl" || currentBackend === "wasm" || currentBackend === "cpu"
                    ? currentBackend
                    : "webgl";

            // Load lightweight MobileNet-v2 SSD model for high-speed client-side inference
            this._model = await cocoSsd.load({
                base: "lite_mobilenet_v2",
            });

            this._loadTimeMs = Math.round(performance.now() - startTime);
            this._isReady = true;
            console.log(
                `[VERIFYX VisionEngine] Local model loaded in ${this._loadTimeMs}ms using backend: ${this._backend}`
            );
        } catch (error) {
            this._isReady = false;
            console.error("[VERIFYX VisionEngine] Failed to initialize local vision model:", error);
            throw error;
        }
    }

    async detect(
        source: HTMLVideoElement | HTMLCanvasElement | ImageData,
        minConfidence = 0.50,
        maxDetections = 10
    ): Promise<InferenceResult> {
        if (!this._isReady || !this._model) {
            throw new Error("LocalCocoSsdAdapter is not initialized. Call init() first.");
        }

        const startTime = performance.now();

        // Determine source pixel dimensions
        let width = 640;
        let height = 480;

        if (source instanceof HTMLVideoElement) {
            width = source.videoWidth || 640;
            height = source.videoHeight || 480;
            // If video has not loaded metadata yet, return empty
            if (width === 0 || height === 0 || source.readyState < 2) {
                return {
                    detections: [],
                    inferenceTimeMs: 0,
                    engineName: this.name,
                    backend: this._backend,
                    timestamp: Date.now(),
                    frameWidth: width,
                    frameHeight: height,
                };
            }
        } else if (source instanceof HTMLCanvasElement) {
            width = source.width;
            height = source.height;
        } else if (typeof ImageData !== "undefined" && source instanceof ImageData) {
            width = source.width;
            height = source.height;
        }

        // Execute local model inference
        const rawPredictions = await this._model.detect(source, maxDetections, minConfidence);
        const inferenceTimeMs = Math.round(performance.now() - startTime);

        // Map model predictions to canonical VERIFYX Detection domain entities
        const detections: Detection[] = rawPredictions.map((pred, index) => {
            const [rawX, rawY, rawW, rawH] = pred.bbox;

            // Normalized coordinates (0..1)
            const normX = Math.max(0, Math.min(1, rawX / width));
            const normY = Math.max(0, Math.min(1, rawY / height));
            const normW = Math.max(0, Math.min(1, rawW / width));
            const normH = Math.max(0, Math.min(1, rawH / height));

            const rawClass = pred.class.toLowerCase();
            const confidence = Math.round(pred.score * 100) / 100;

            // Map class to safety category
            const { category, label, isIssue, statusText } = this.categorizeSafetyDetection(
                rawClass,
                normX,
                normY,
                normW,
                normH
            );

            // Evaluate confidence tier and decision
            const { tier, decision } = evaluateConfidenceDecision(confidence, isIssue);

            return {
                id: `local-det-${Date.now()}-${index}`,
                label,
                rawLabel: pred.class,
                category,
                confidence,
                confidenceTier: tier,
                decision,
                bbox: {
                    x: normX,
                    y: normY,
                    width: normW,
                    height: normH,
                },
                isIssue,
                statusText,
                timestamp: Date.now(),
            };
        });

        return {
            detections,
            inferenceTimeMs,
            engineName: this.name,
            backend: this._backend,
            timestamp: Date.now(),
            frameWidth: width,
            frameHeight: height,
        };
    }

    private categorizeSafetyDetection(
        className: string,
        normX: number,
        normY: number,
        _normW: number,
        normH: number
    ): {
        category: string;
        label: string;
        isIssue: boolean;
        statusText: string;
    } {
        // Physical objects that can act as obstruction candidates if placed in a walking pathway
        const obstructionClasses = [
            "chair",
            "couch",
            "backpack",
            "handbag",
            "suitcase",
            "box",
            "bench",
            "dining table",
            "bed",
            "sports ball",
        ];

        if (obstructionClasses.includes(className)) {
            // Spatial Rule: Bounding box intersects the defined central corridor region
            const isCorridorZone = normY + normH > 0.40 && normX > 0.15 && normX < 0.85;
            return {
                category: "obstruction_candidate",
                label: className.toUpperCase(),
                isIssue: isCorridorZone,
                statusText: isCorridorZone ? "PATHWAY OBSTRUCTION" : "OUTSIDE CORRIDOR",
            };
        }

        if (className === "person") {
            return {
                category: "personnel",
                label: "PERSON",
                isIssue: false,
                statusText: "PERSONNEL",
            };
        }

        // All other COCO classes are generic model detections (laptop, bottle, cell phone, etc.)
        // Never treat arbitrary generic detections as proof of safety compliance or violations
        return {
            category: "generic_object",
            label: className.toUpperCase(),
            isIssue: false,
            statusText: "GENERIC OBJECT",
        };
    }

    async dispose(): Promise<void> {
        this._model = null;
        this._isReady = false;
    }
}
