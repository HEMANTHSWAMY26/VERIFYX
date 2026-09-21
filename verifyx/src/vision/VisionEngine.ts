import type { InferenceAdapter } from "./InferenceAdapter";
import type {
    VisionEngineConfig,
    VisionEngineMode,
    VisionEngineStatus,
    InferenceResult,
} from "./types";
import { CustomYoloAdapter } from "./CustomYoloAdapter";
import { LocalCocoSsdAdapter } from "./LocalCocoSsdAdapter";
import { SimulationVisionAdapter } from "./SimulationVisionAdapter";

export class VisionEngine {
    private static _instance: VisionEngine | null = null;

    private _mode: VisionEngineMode = "local_model";
    private _engineType: "yolo" | "coco_ssd" | "simulation" = "yolo";

    private _yoloAdapter: CustomYoloAdapter;
    private _cocoAdapter: LocalCocoSsdAdapter;
    private _simulationAdapter: SimulationVisionAdapter;
    private _activeAdapter: InferenceAdapter;

    private _status: VisionEngineStatus = {
        mode: "local_model",
        state: "uninitialized",
        engineName: "VERIFYX YOLO11n Custom Model",
        backend: "wasm",
        engineType: "yolo",
        queueState: "idle",
    };

    // Background inference throttle: ~480ms interval (~2 FPS) for asynchronous processing
    private _throttleMs = 480;
    private _lastInferenceTimestamp = 0;
    private _lastResult: InferenceResult | null = null;
    private _isInferring = false;
    private _inferenceCount = 0;
    private _totalInferenceMs = 0;

    private constructor(config?: VisionEngineConfig) {
        if (config?.mode) {
            this._mode = config.mode;
        }
        if (config?.throttleMs) {
            this._throttleMs = config.throttleMs;
        }

        this._yoloAdapter = new CustomYoloAdapter();
        this._cocoAdapter = new LocalCocoSsdAdapter();
        this._simulationAdapter = new SimulationVisionAdapter();

        // Default active adapter is YOLO11n
        this._activeAdapter = this._yoloAdapter;
    }

    static getInstance(config?: VisionEngineConfig): VisionEngine {
        if (!VisionEngine._instance) {
            VisionEngine._instance = new VisionEngine(config);
        }
        return VisionEngine._instance;
    }

    get status(): VisionEngineStatus {
        return {
            ...this._status,
            queueState: this._isInferring ? "in_flight" : "idle",
        };
    }

    get mode(): VisionEngineMode {
        return this._mode;
    }

    get engineType(): "yolo" | "coco_ssd" | "simulation" {
        return this._engineType;
    }

    get activeAdapter(): InferenceAdapter {
        return this._activeAdapter;
    }

    get isInferring(): boolean {
        return this._isInferring;
    }

    get lastResult(): InferenceResult | null {
        return this._lastResult;
    }

    /**
     * Initializes the vision engine.
     * Tries Custom YOLO11n ONNX model first.
     * If ONNX fails to load, gracefully falls back to LocalCocoSsdAdapter.
     */
    async init(): Promise<void> {
        if (this._status.state === "ready" || this._status.state === "loading") {
            return;
        }

        this._status.state = "loading";

        if (this._mode === "local_model") {
            try {
                console.log("[VisionEngine] Initializing Primary YOLO11n ONNX Adapter...");
                await this._yoloAdapter.init();
                this._activeAdapter = this._yoloAdapter;
                this._engineType = "yolo";
                this._status = {
                    mode: "local_model",
                    state: "ready",
                    engineName: this._yoloAdapter.name,
                    backend: this._yoloAdapter.backend,
                    engineType: "yolo",
                    loadTimeMs: this._yoloAdapter.loadTimeMs,
                    queueState: "idle",
                };
                console.log("[VisionEngine] Primary YOLO11n Adapter ready!");
            } catch (yoloError) {
                console.warn(
                    "[VisionEngine] Primary YOLO11n ONNX model failed to load. Initiating graceful fallback to COCO-SSD:",
                    yoloError
                );
                try {
                    await this._cocoAdapter.init();
                    this._activeAdapter = this._cocoAdapter;
                    this._engineType = "coco_ssd";
                    this._status = {
                        mode: "local_model",
                        state: "fallback",
                        engineName: "COCO-SSD Fallback Engine",
                        backend: this._cocoAdapter.backend,
                        engineType: "coco_ssd",
                        loadTimeMs: this._cocoAdapter.loadTimeMs,
                        queueState: "idle",
                        errorMessage: "YOLO11n failed to load. Operating in COCO-SSD Fallback mode.",
                    };
                    console.log("[VisionEngine] COCO-SSD Fallback Engine initialized successfully.");
                } catch (cocoError) {
                    console.error("[VisionEngine] Both YOLO and COCO-SSD failed. Falling back to Simulation:", cocoError);
                    await this._simulationAdapter.init();
                    this._activeAdapter = this._simulationAdapter;
                    this._engineType = "simulation";
                    this._mode = "simulation";
                    this._status = {
                        mode: "simulation",
                        state: "fallback",
                        engineName: this._simulationAdapter.name,
                        backend: this._simulationAdapter.backend,
                        engineType: "simulation",
                        loadTimeMs: this._simulationAdapter.loadTimeMs,
                        queueState: "idle",
                        errorMessage: "All local models failed. Running simulation fallback.",
                    };
                }
            }
        } else {
            await this._simulationAdapter.init();
            this._activeAdapter = this._simulationAdapter;
            this._engineType = "simulation";
            this._status = {
                mode: "simulation",
                state: "ready",
                engineName: this._simulationAdapter.name,
                backend: this._simulationAdapter.backend,
                engineType: "simulation",
                loadTimeMs: this._simulationAdapter.loadTimeMs,
                queueState: "idle",
            };
        }
    }

    /**
     * Explicitly switch between YOLO11n, COCO-SSD Fallback, and Simulation.
     */
    async switchEngine(target: "yolo" | "coco_ssd" | "simulation"): Promise<void> {
        this._status.state = "loading";

        try {
            if (target === "yolo") {
                if (!this._yoloAdapter.isReady) {
                    await this._yoloAdapter.init();
                }
                this._activeAdapter = this._yoloAdapter;
                this._engineType = "yolo";
                this._mode = "local_model";
                this._status = {
                    mode: "local_model",
                    state: "ready",
                    engineName: this._yoloAdapter.name,
                    backend: this._yoloAdapter.backend,
                    engineType: "yolo",
                    loadTimeMs: this._yoloAdapter.loadTimeMs,
                    queueState: "idle",
                };
            } else if (target === "coco_ssd") {
                if (!this._cocoAdapter.isReady) {
                    await this._cocoAdapter.init();
                }
                this._activeAdapter = this._cocoAdapter;
                this._engineType = "coco_ssd";
                this._mode = "local_model";
                this._status = {
                    mode: "local_model",
                    state: "ready",
                    engineName: "COCO-SSD Fallback Engine",
                    backend: this._cocoAdapter.backend,
                    engineType: "coco_ssd",
                    loadTimeMs: this._cocoAdapter.loadTimeMs,
                    queueState: "idle",
                };
            } else {
                if (!this._simulationAdapter.isReady) {
                    await this._simulationAdapter.init();
                }
                this._activeAdapter = this._simulationAdapter;
                this._engineType = "simulation";
                this._mode = "simulation";
                this._status = {
                    mode: "simulation",
                    state: "ready",
                    engineName: this._simulationAdapter.name,
                    backend: this._simulationAdapter.backend,
                    engineType: "simulation",
                    loadTimeMs: this._simulationAdapter.loadTimeMs,
                    queueState: "idle",
                };
            }
            console.log(`[VisionEngine] Switched active engine to: ${this._activeAdapter.name}`);
        } catch (err: any) {
            console.error(`[VisionEngine] Failed to switch engine to ${target}:`, err);
            this._status.state = "error";
            this._status.errorMessage = err.message || "Engine switch failed";
        }
    }

    async setMode(newMode: VisionEngineMode): Promise<void> {
        if (newMode === "simulation") {
            await this.switchEngine("simulation");
        } else {
            await this.switchEngine("yolo");
        }
    }

    /**
     * Executes inference on a video/canvas frame.
     *
     * ASYNCHRONOUS BACKGROUND INTEGRATION RULES:
     * 1. If an inference is currently in flight (_isInferring == true):
     *    DISCARD incoming frame immediately, DO NOT queue.
     *    Return the latest cached result.
     * 2. If called before throttle interval (~480ms) expires:
     *    Return cached result.
     * 3. Executes cleanly without blocking the caller's thread.
     */
    async detect(
        source: HTMLVideoElement | HTMLCanvasElement,
        minConfidence = 0.25
    ): Promise<InferenceResult> {
        const now = performance.now();

        // 1. Single-Flight Lock: If inference is running, discard frame and return last valid result
        if (this._isInferring && this._lastResult) {
            return this._lastResult;
        }

        // 2. Background Rate Throttle: Throttle to ~2 FPS (480ms)
        if (now - this._lastInferenceTimestamp < this._throttleMs && this._lastResult) {
            return this._lastResult;
        }

        this._isInferring = true;
        this._lastInferenceTimestamp = now;

        try {
            if (!this._activeAdapter.isReady) {
                await this.init();
            }

            const result = await this._activeAdapter.detect(source, minConfidence);
            this._lastResult = result;

            this._inferenceCount++;
            this._totalInferenceMs += result.inferenceTimeMs;
            const effectiveFps = Math.round(1000 / (result.inferenceTimeMs + this._throttleMs) * 10) / 10;

            this._status.lastInferenceMs = result.inferenceTimeMs;
            this._status.fps = effectiveFps;

            return result;
        } catch (error) {
            console.error("[VisionEngine] Detection execution error:", error);
            if (this._lastResult) return this._lastResult;
            throw error;
        } finally {
            this._isInferring = false;
        }
    }
}
