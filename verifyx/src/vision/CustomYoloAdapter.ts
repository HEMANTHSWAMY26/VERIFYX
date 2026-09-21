/**
 * VERIFYX Custom YOLO11n Inference Adapter
 * ----------------------------------------
 * Real on-device ONNX runtime adapter for custom-trained VERIFYX YOLO11n safety model.
 * Executes in the browser via onnxruntime-web WebAssembly (WASM) backend.
 *
 * Implements the canonical InferenceAdapter contract:
 * VisionEngine -> InferenceAdapter -> CustomYoloAdapter -> Detections -> RulesEngine
 *
 * Classes:
 * 0: fire_extinguisher
 * 1: emergency_exit_sign
 * 2: hazard_sign
 * 3: box_carton
 * 4: chair_furniture
 *
 * Operational Guardrail:
 * Inspects bounding box dimensions. If target object is < 32px (distant/small),
 * flags `isTooSmall: true` and sets decision to RESCAN_NEEDED with "MOVE CLOSER TO VERIFY".
 */

import * as ort from "onnxruntime-web";
import type { InferenceAdapter } from "./InferenceAdapter";
import type { InferenceResult, BackendType } from "./types";
import type { Detection, BoundingBox } from "../types/verification";
import { evaluateConfidenceDecision } from "../rules/confidencePolicy";

export interface CustomYoloConfig {
    modelPath?: string;
    inputSize?: number;
    confThreshold?: number;
    iouThreshold?: number;
}

export class CustomYoloAdapter implements InferenceAdapter {
    readonly name = "VERIFYX YOLO11n Custom Model";
    readonly backend: BackendType = "wasm";

    private _isReady = false;
    private _loadTimeMs = 0;
    private _modelPath: string;
    private _inputSize: number;
    private _confThreshold: number;
    private _iouThreshold: number;
    private _session: ort.InferenceSession | null = null;
    private _offscreenCanvas: HTMLCanvasElement | null = null;
    private _offscreenCtx: CanvasRenderingContext2D | null = null;

    // Canonical VERIFYX Custom Safety Model Classes (5 MVP Classes)
    public static readonly CLASS_MAP: Record<number, {
        rawName: string;
        label: string;
        category: string;
        isIssue: boolean;
        statusText: string;
    }> = {
        0: {
            rawName: "fire_extinguisher",
            label: "Fire Extinguisher",
            category: "fire_extinguisher",
            isIssue: false,
            statusText: "Fire extinguisher detected and localized",
        },
        1: {
            rawName: "emergency_exit_sign",
            label: "Emergency Exit Sign",
            category: "emergency_exit",
            isIssue: false,
            statusText: "Emergency exit signage identified",
        },
        2: {
            rawName: "hazard_sign",
            label: "Safety Hazard Sign",
            category: "safety_sign",
            isIssue: false,
            statusText: "Safety hazard warning sign present",
        },
        3: {
            rawName: "box_carton",
            label: "Box / Delivery Carton",
            category: "obstruction_candidate",
            isIssue: true,
            statusText: "Carton/box detected in observation zone",
        },
        4: {
            rawName: "chair_furniture",
            label: "Chair / Seating Furniture",
            category: "obstruction_candidate",
            isIssue: true,
            statusText: "Chair/furniture detected in observation zone",
        },
    };

    constructor(config?: CustomYoloConfig) {
        this._modelPath = config?.modelPath || "/models/verifyx_yolo11n_baseline_10ep.onnx";
        this._inputSize = config?.inputSize || 640;
        this._confThreshold = config?.confThreshold || 0.25;
        this._iouThreshold = config?.iouThreshold || 0.45;
    }

    get isReady(): boolean {
        return this._isReady;
    }

    get loadTimeMs(): number {
        return this._loadTimeMs;
    }

    get inputSize(): number {
        return this._inputSize;
    }

    get confThreshold(): number {
        return this._confThreshold;
    }

    get iouThreshold(): number {
        return this._iouThreshold;
    }

    /**
     * Initializes the ONNX model session via onnxruntime-web.
     */
    async init(): Promise<void> {
        if (this._isReady && this._session) return;

        const startTime = performance.now();
        try {
            console.log(`[CustomYoloAdapter] Loading custom YOLO11n ONNX model from: ${this._modelPath}`);

            // Configure WASM paths
            ort.env.wasm.wasmPaths = "/wasm/";
            ort.env.wasm.numThreads = 1;

            // Check if model file exists before attempting create to give clear error
            const headCheck = await fetch(this._modelPath, { method: "HEAD" }).catch(() => null);
            if (!headCheck || !headCheck.ok) {
                throw new Error(`ONNX model weights not found at ${this._modelPath} (HTTP ${headCheck?.status || "Network Error"})`);
            }

            // Create InferenceSession with WASM backend (local /wasm/ first, CDN fallback)
            try {
                ort.env.wasm.wasmPaths = "/wasm/";
                ort.env.wasm.numThreads = 1;
                this._session = await ort.InferenceSession.create(this._modelPath, {
                    executionProviders: ["wasm"],
                    graphOptimizationLevel: "all",
                });
            } catch (localWasmErr) {
                console.warn("[CustomYoloAdapter] Local /wasm/ initialization failed, attempting CDN fallback:", localWasmErr);
                ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
                ort.env.wasm.numThreads = 1;
                this._session = await ort.InferenceSession.create(this._modelPath, {
                    executionProviders: ["wasm"],
                    graphOptimizationLevel: "all",
                });
            }

            this._loadTimeMs = Math.round(performance.now() - startTime);
            this._isReady = true;
            console.log(`[CustomYoloAdapter] YOLO11n ONNX model loaded successfully in ${this._loadTimeMs}ms via WASM`);
        } catch (err) {
            this._isReady = false;
            this._session = null;
            console.error("[CustomYoloAdapter] Failed to initialize ONNX session:", err);
            throw err;
        }
    }

    /**
     * Executes inference on the source frame and maps output to standardized VERIFYX Detections.
     */
    async detect(
        source: HTMLVideoElement | HTMLCanvasElement | ImageData,
        minConfidence = this._confThreshold,
        maxDetections = 10
    ): Promise<InferenceResult> {
        if (!this._isReady || !this._session) {
            throw new Error("CustomYoloAdapter is not initialized. Call init() first.");
        }

        const startTime = performance.now();

        let width = 640;
        let height = 480;

        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
            width = source.videoWidth || 640;
            height = source.videoHeight || 480;
            if (width === 0 || height === 0 || source.readyState < 2) {
                return {
                    detections: [],
                    inferenceTimeMs: 0,
                    engineName: this.name,
                    backend: this.backend,
                    timestamp: Date.now(),
                    frameWidth: width,
                    frameHeight: height,
                };
            }
        } else if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
            width = source.width;
            height = source.height;
        } else if (typeof ImageData !== "undefined" && source instanceof ImageData) {
            width = source.width;
            height = source.height;
        }

        // 1. Preprocess: Letterbox to 640x640 and extract NCHW Float32 tensor
        const { tensor, scale, dx, dy } = this.preprocess(source, width, height);

        // 2. Execute raw neural network forward pass
        const outputMap = await this._session.run({ images: tensor });
        const outputTensor = outputMap[this._session.outputNames[0]];

        // 3. Postprocess and decode detections with Move-Closer guardrail
        const detections = this.postprocess(outputTensor, minConfidence, this._iouThreshold, scale, dx, dy, width, height, maxDetections);
        const inferenceTimeMs = Math.round(performance.now() - startTime);

        return {
            detections,
            inferenceTimeMs,
            engineName: this.name,
            backend: this.backend,
            timestamp: Date.now(),
            frameWidth: width,
            frameHeight: height,
        };
    }

    /**
     * Preprocesses frame into 1x3x640x640 Float32 Tensor with 114 gray letterboxing.
     */
    private preprocess(
        source: HTMLVideoElement | HTMLCanvasElement | ImageData,
        srcW: number,
        srcH: number
    ): { tensor: ort.Tensor; scale: number; dx: number; dy: number } {
        if (!this._offscreenCanvas) {
            this._offscreenCanvas = document.createElement("canvas");
            this._offscreenCanvas.width = this._inputSize;
            this._offscreenCanvas.height = this._inputSize;
            this._offscreenCtx = this._offscreenCanvas.getContext("2d", { willReadFrequently: true });
        }

        const ctx = this._offscreenCtx!;
        // Fill canvas with standard neutral gray (114)
        ctx.fillStyle = "rgb(114, 114, 114)";
        ctx.fillRect(0, 0, this._inputSize, this._inputSize);

        const scale = Math.min(this._inputSize / srcW, this._inputSize / srcH);
        const nw = Math.round(srcW * scale);
        const nh = Math.round(srcH * scale);
        const dx = Math.floor((this._inputSize - nw) / 2);
        const dy = Math.floor((this._inputSize - nh) / 2);

        if (source instanceof ImageData) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = srcW;
            tempCanvas.height = srcH;
            tempCanvas.getContext("2d")!.putImageData(source, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0, srcW, srcH, dx, dy, nw, nh);
        } else {
            ctx.drawImage(source, 0, 0, srcW, srcH, dx, dy, nw, nh);
        }

        const imgData = ctx.getImageData(0, 0, this._inputSize, this._inputSize).data;
        const totalPixels = this._inputSize * this._inputSize;
        const floatData = new Float32Array(3 * totalPixels);
        const gOffset = totalPixels;
        const bOffset = 2 * totalPixels;

        for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
            floatData[p] = imgData[i] / 255.0;            // R
            floatData[gOffset + p] = imgData[i + 1] / 255.0; // G
            floatData[bOffset + p] = imgData[i + 2] / 255.0; // B
        }

        const tensor = new ort.Tensor("float32", floatData, [1, 3, this._inputSize, this._inputSize]);
        return { tensor, scale, dx, dy };
    }

    /**
     * Postprocesses raw model output tensor [1, 9, 8400].
     * Decodes boxes, applies Move-Closer guardrail (< 32px), and performs NMS.
     */
    private postprocess(
        outputTensor: ort.Tensor,
        confThresh: number,
        iouThresh: number,
        scale: number,
        dx: number,
        dy: number,
        frameWidth: number,
        frameHeight: number,
        maxDetections: number
    ): Detection[] {
        const data = outputTensor.data as Float32Array;
        const numAnchors = 8400;

        interface Candidate {
            classId: number;
            conf: number;
            cx: number;
            cy: number;
            w: number;
            h: number;
            isTooSmall: boolean;
        }

        const candidates: Candidate[] = [];

        for (let i = 0; i < numAnchors; i++) {
            let maxScore = 0;
            let maxClass = -1;

            // Check scores across the 5 MVP classes (channels 4 to 8)
            for (let c = 0; c < 5; c++) {
                const score = data[(4 + c) * numAnchors + i];
                if (score > maxScore) {
                    maxScore = score;
                    maxClass = c;
                }
            }

            if (maxScore >= confThresh) {
                const cx = data[0 * numAnchors + i];
                const cy = data[1 * numAnchors + i];
                const w = data[2 * numAnchors + i];
                const h = data[3 * numAnchors + i];

                // Phase 8.8 Operational Guardrail:
                // If the bounding box is below ~32px in maximum dimension on 640 input,
                // mark as too small for reliable safety verification.
                const isTooSmall = Math.max(w, h) < 32 || Math.min(w, h) < 18;

                candidates.push({
                    classId: maxClass,
                    conf: maxScore,
                    cx,
                    cy,
                    w,
                    h,
                    isTooSmall,
                });
            }
        }

        // Sort descending by confidence
        candidates.sort((a, b) => b.conf - a.conf);

        // Class-specific Greedy NMS
        const selectedDetections: Detection[] = [];
        const isSuppressed = new Uint8Array(candidates.length);

        for (let i = 0; i < candidates.length; i++) {
            if (isSuppressed[i]) continue;
            const a = candidates[i];

            // De-letterbox coordinates to original frame pixel space
            const origX1 = Math.max(0, Math.min(frameWidth, (a.cx - a.w / 2 - dx) / scale));
            const origY1 = Math.max(0, Math.min(frameHeight, (a.cy - a.h / 2 - dy) / scale));
            const origX2 = Math.max(0, Math.min(frameWidth, (a.cx + a.w / 2 - dx) / scale));
            const origY2 = Math.max(0, Math.min(frameHeight, (a.cy + a.h / 2 - dy) / scale));

            const origW = origX2 - origX1;
            const origH = origY2 - origY1;

            // Normalized [0..1] Bounding Box
            const normBbox: BoundingBox = {
                x: Math.round((origX1 / frameWidth) * 1000) / 1000,
                y: Math.round((origY1 / frameHeight) * 1000) / 1000,
                width: Math.round((origW / frameWidth) * 1000) / 1000,
                height: Math.round((origH / frameHeight) * 1000) / 1000,
            };

            const det = this.standardizeDetection(
                a.classId,
                a.conf,
                normBbox,
                selectedDetections.length,
                a.isTooSmall
            );
            selectedDetections.push(det);

            if (selectedDetections.length >= maxDetections) break;

            const areaA = (a.w) * (a.h);

            for (let j = i + 1; j < candidates.length; j++) {
                if (isSuppressed[j]) continue;
                const b = candidates[j];
                if (b.classId !== a.classId) continue;

                const ix1 = Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
                const iy1 = Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
                const ix2 = Math.min(a.cx + a.w / 2, b.cx + b.w / 2);
                const iy2 = Math.min(a.cy + a.h / 2, b.cy + b.h / 2);
                const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
                const areaB = b.w * b.h;
                const iou = inter / (areaA + areaB - inter);

                if (iou > iouThresh) {
                    isSuppressed[j] = 1;
                }
            }
        }

        return selectedDetections;
    }

    /**
     * Maps raw model predictions into canonical VERIFYX Detection domain entities.
     */
    public standardizeDetection(
        classId: number,
        score: number,
        normBbox: BoundingBox,
        index: number,
        isTooSmall: boolean = false
    ): Detection {
        const classMeta = CustomYoloAdapter.CLASS_MAP[classId] || {
            rawName: `class_${classId}`,
            label: `Safety Object ${classId}`,
            category: "General Safety",
            isIssue: false,
            statusText: "Object detected by custom model",
        };

        const confidence = Math.round(score * 100) / 100;
        const { tier, decision } = evaluateConfidenceDecision(confidence, classMeta.isIssue);

        // Guardrail: If object is too small (< 32px), downgrade decision to RESCAN_NEEDED
        const finalDecision = isTooSmall ? "RESCAN_NEEDED" : decision;
        const finalStatus = isTooSmall
            ? "MOVE CLOSER TO VERIFY"
            : classMeta.statusText;

        return {
            id: `yolo-det-${Date.now()}-${index}`,
            label: classMeta.label,
            rawLabel: classMeta.rawName,
            category: classMeta.category,
            confidence,
            confidenceTier: isTooSmall ? "LOW" : tier,
            decision: finalDecision,
            bbox: normBbox,
            isIssue: classMeta.isIssue,
            statusText: finalStatus,
            timestamp: Date.now(),
            isTooSmall,
            guardrailPrompt: isTooSmall ? "MOVE CLOSER TO VERIFY" : undefined,
        };
    }

    async dispose(): Promise<void> {
        this._session = null;
        this._isReady = false;
        this._offscreenCanvas = null;
        this._offscreenCtx = null;
    }
}
