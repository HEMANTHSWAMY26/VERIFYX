import type { InferenceResult, BackendType } from "./types";

export interface InferenceAdapter {
    readonly name: string;
    readonly backend: BackendType;
    readonly isReady: boolean;
    readonly loadTimeMs: number;

    init(): Promise<void>;
    detect(
        source: HTMLVideoElement | HTMLCanvasElement | ImageData,
        minConfidence?: number,
        maxDetections?: number
    ): Promise<InferenceResult>;
    dispose(): Promise<void>;
}
