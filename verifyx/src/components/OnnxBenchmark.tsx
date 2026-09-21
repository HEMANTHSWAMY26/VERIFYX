import React, { useState, useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";
import "./OnnxBenchmark.css";

// Configure WASM paths
ort.env.wasm.wasmPaths = "/wasm/";
ort.env.wasm.numThreads = 1; // Single-thread WASM for consistent baseline

interface Detection {
    classId: number;
    className: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface BenchmarkMetrics {
    provider: string;
    modelLoadTimeMs: number;
    firstRunLatencyMs: number;
    runCount: number;
    preAvgMs: number;
    inferAvgMs: number;
    inferP50Ms: number;
    inferP95Ms: number;
    inferMinMs: number;
    inferMaxMs: number;
    postAvgMs: number;
    totalAvgMs: number;
    approxFps: number;
    memoryMb: number | null;
}

const CLASS_NAMES = [
    "fire_extinguisher",
    "emergency_exit_sign",
    "hazard_sign",
    "box_carton",
    "chair_furniture"
];

const TEST_IMAGES = [
    { id: "fe", label: "Fire Extinguisher", path: "/test_samples/fe.jpg", expectedClass: "fire_extinguisher" },
    { id: "exit", label: "Emergency Exit Sign", path: "/test_samples/exit.jpg", expectedClass: "emergency_exit_sign" },
    { id: "hazard", label: "Hazard Caution Sign", path: "/test_samples/hazard.jpg", expectedClass: "hazard_sign" },
    { id: "box", label: "Box / Carton", path: "/test_samples/box.jpg", expectedClass: "box_carton" },
    { id: "chair", label: "Chair / Furniture", path: "/test_samples/chair.jpg", expectedClass: "chair_furniture" }
];

export const OnnxBenchmark: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [provider, setProvider] = useState<"webgl" | "wasm">("wasm");
    const [status, setStatus] = useState<string>("Ready to benchmark");
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [selectedImg, setSelectedImg] = useState<string>("/test_samples/fe.jpg");
    const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState<number>(0);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sessionRef = useRef<ort.InferenceSession | null>(null);

    const log = (msg: string) => {
        console.log(`[ONNX-BENCH] ${msg}`);
        setLogs(prev => [...prev.slice(-40), msg]);
    };

    // Preprocess HTMLImageElement to 1x3x640x640 Float32 Tensor
    const preprocess = (img: HTMLImageElement): { tensor: ort.Tensor; scale: number; dx: number; dy: number } => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext("2d")!;
        
        // Fill letterbox canvas with neutral gray (114)
        ctx.fillStyle = "rgb(114, 114, 114)";
        ctx.fillRect(0, 0, 640, 640);
        
        const scale = Math.min(640 / img.naturalWidth, 640 / img.naturalHeight);
        const nw = Math.round(img.naturalWidth * scale);
        const nh = Math.round(img.naturalHeight * scale);
        const dx = Math.floor((640 - nw) / 2);
        const dy = Math.floor((640 - nh) / 2);
        
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, nw, nh);
        const imgData = ctx.getImageData(0, 0, 640, 640).data;
        
        // Convert RGBA HWC to RGB CHW float32
        const floatData = new Float32Array(3 * 640 * 640);
        const rOffset = 0;
        const gOffset = 640 * 640;
        const bOffset = 2 * 640 * 640;
        
        for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
            floatData[rOffset + p] = imgData[i] / 255.0;
            floatData[gOffset + p] = imgData[i + 1] / 255.0;
            floatData[bOffset + p] = imgData[i + 2] / 255.0;
        }
        
        const tensor = new ort.Tensor("float32", floatData, [1, 3, 640, 640]);
        return { tensor, scale, dx, dy };
    };

    // Postprocess raw YOLO output [1, 9, 8400]
    const postprocess = (
        outputTensor: ort.Tensor,
        confThresh: number = 0.25,
        iouThresh: number = 0.45,
        scale: number = 1.0,
        dx: number = 0,
        dy: number = 0
    ): Detection[] => {
        const data = outputTensor.data as Float32Array;
        // output shape is [1, 9, 8400]
        // 9 channels: cx, cy, w, h, class0, class1, class2, class3, class4
        const numAnchors = 8400;
        const candidates: { classId: number; conf: number; cx: number; cy: number; w: number; h: number }[] = [];

        for (let i = 0; i < numAnchors; i++) {
            // Find max class score among 5 classes
            let maxScore = 0;
            let maxClass = -1;
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
                candidates.push({ classId: maxClass, conf: maxScore, cx, cy, w, h });
            }
        }

        // Sort descending by confidence
        candidates.sort((a, b) => b.conf - a.conf);

        // Simple Greedy NMS
        const selected: Detection[] = [];
        const isSuppressed = new Uint8Array(candidates.length);

        for (let i = 0; i < candidates.length; i++) {
            if (isSuppressed[i]) continue;
            const a = candidates[i];
            const ax1 = (a.cx - a.w / 2 - dx) / scale;
            const ay1 = (a.cy - a.h / 2 - dy) / scale;
            const ax2 = (a.cx + a.w / 2 - dx) / scale;
            const ay2 = (a.cy + a.h / 2 - dy) / scale;

            selected.push({
                classId: a.classId,
                className: CLASS_NAMES[a.classId] || `class_${a.classId}`,
                confidence: a.conf,
                bbox: [ax1, ay1, ax2, ay2]
            });

            if (selected.length >= 20) break; // cap top 20 detections

            const areaA = (ax2 - ax1) * (ay2 - ay1);

            for (let j = i + 1; j < candidates.length; j++) {
                if (isSuppressed[j]) continue;
                const b = candidates[j];
                if (b.classId !== a.classId) continue; // class-specific NMS

                const bx1 = (b.cx - b.w / 2 - dx) / scale;
                const by1 = (b.cy - b.h / 2 - dy) / scale;
                const bx2 = (b.cx + b.w / 2 - dx) / scale;
                const by2 = (b.cy + b.h / 2 - dy) / scale;

                const ix1 = Math.max(ax1, bx1);
                const iy1 = Math.max(ay1, by1);
                const ix2 = Math.min(ax2, bx2);
                const iy2 = Math.min(ay2, by2);
                const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
                const areaB = (bx2 - bx1) * (by2 - by1);
                const iou = inter / (areaA + areaB - inter);

                if (iou > iouThresh) {
                    isSuppressed[j] = 1;
                }
            }
        }

        return selected;
    };

    // Load or switch model session
    const loadSession = async (targetProvider: "webgl" | "wasm"): Promise<ort.InferenceSession> => {
        log(`Loading ONNX model with provider '${targetProvider}'...`);
        const modelUrl = "/models/verifyx_yolo11n_baseline_10ep.onnx";
        const t0 = performance.now();
        
        let session: ort.InferenceSession;
        try {
            session = await ort.InferenceSession.create(modelUrl, {
                executionProviders: [targetProvider, "wasm"],
                graphOptimizationLevel: "all"
            });
        } catch (err) {
            log(`Provider '${targetProvider}' failed. Falling back to 'wasm'. Error: ${err}`);
            session = await ort.InferenceSession.create(modelUrl, {
                executionProviders: ["wasm"],
                graphOptimizationLevel: "all"
            });
        }
        
        const loadMs = performance.now() - t0;
        log(`Model loaded successfully in ${loadMs.toFixed(1)} ms`);
        sessionRef.current = session;
        return session;
    };

    // Single run verification across all 5 test images
    const runVerificationTest = async () => {
        setIsRunning(true);
        setStatus("Running verification across all 5 classes...");
        log("=== Starting 5-Class Output Verification ===");

        try {
            const session = sessionRef.current || (await loadSession(provider));
            
            for (const item of TEST_IMAGES) {
                log(`Testing asset: ${item.label} (${item.expectedClass})...`);
                const img = new Image();
                img.src = item.path;
                await img.decode();

                const { tensor, scale, dx, dy } = preprocess(img);
                const t0 = performance.now();
                const outputMap = await session.run({ images: tensor });
                const inferMs = performance.now() - t0;
                
                const outputTensor = outputMap[session.outputNames[0]];
                const results = postprocess(outputTensor, 0.25, 0.45, scale, dx, dy);

                log(`  -> Output decoded: ${results.length} detection(s) in ${inferMs.toFixed(1)}ms`);
                results.forEach((r, idx) => {
                    log(`    [#${idx + 1}] Class: ${r.className} | Conf: ${(r.confidence * 100).toFixed(1)}% | BBox: [${r.bbox.map(n => Math.round(n)).join(", ")}]`);
                });

                if (item.path === selectedImg) {
                    setDetections(results);
                }
            }

            setStatus("5-Class verification complete! Inspect detections below.");
        } catch (err: any) {
            log(`Verification error: ${err.message || err}`);
            setStatus(`Verification failed: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    // 100-run Benchmark
    const run100Benchmark = async () => {
        setIsRunning(true);
        setStatus("Running 100-iteration inference benchmark...");
        setProgress(0);
        log(`=== Starting 100-Run Benchmark on Provider '${provider}' ===`);

        try {
            const tLoad0 = performance.now();
            const session = await loadSession(provider);
            const loadMs = performance.now() - tLoad0;

            const img = new Image();
            img.src = selectedImg;
            await img.decode();

            // Warmup run
            const warmup = preprocess(img);
            const tWarm0 = performance.now();
            await session.run({ images: warmup.tensor });
            const firstRunMs = performance.now() - tWarm0;
            log(`First run / warmup completed in ${firstRunMs.toFixed(1)} ms`);

            const preTimes: number[] = [];
            const inferTimes: number[] = [];
            const postTimes: number[] = [];
            const totalTimes: number[] = [];

            const totalRuns = 100;
            for (let i = 0; i < totalRuns; i++) {
                const tStart = performance.now();

                // 1. Preprocessing
                const tPre0 = performance.now();
                const { tensor, scale, dx, dy } = preprocess(img);
                const tPre1 = performance.now();
                preTimes.push(tPre1 - tPre0);

                // 2. Model Inference
                const tInf0 = performance.now();
                const outputMap = await session.run({ images: tensor });
                const tInf1 = performance.now();
                inferTimes.push(tInf1 - tInf0);

                // 3. Postprocessing
                const tPost0 = performance.now();
                const outputTensor = outputMap[session.outputNames[0]];
                const results = postprocess(outputTensor, 0.25, 0.45, scale, dx, dy);
                const tPost1 = performance.now();
                postTimes.push(tPost1 - tPost0);

                const tEnd = performance.now();
                totalTimes.push(tEnd - tStart);

                if (i === totalRuns - 1) {
                    setDetections(results);
                }

                if ((i + 1) % 10 === 0) {
                    setProgress(i + 1);
                    log(`Completed ${i + 1}/${totalRuns} runs... current avg infer: ${(inferTimes.reduce((a, b) => a + b, 0) / (i + 1)).toFixed(1)} ms`);
                    // Allow UI to breathe
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // Compute statistics
            inferTimes.sort((a, b) => a - b);
            const p50 = inferTimes[Math.floor(totalRuns * 0.5)];
            const p95 = inferTimes[Math.floor(totalRuns * 0.95)];
            const min = inferTimes[0];
            const max = inferTimes[totalRuns - 1];

            const avgPre = preTimes.reduce((a, b) => a + b, 0) / totalRuns;
            const avgInfer = inferTimes.reduce((a, b) => a + b, 0) / totalRuns;
            const avgPost = postTimes.reduce((a, b) => a + b, 0) / totalRuns;
            const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalRuns;
            const fps = 1000.0 / avgTotal;

            const memMb = (performance as any).memory
                ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
                : null;

            const benchmarkResult: BenchmarkMetrics = {
                provider,
                modelLoadTimeMs: loadMs,
                firstRunLatencyMs: firstRunMs,
                runCount: totalRuns,
                preAvgMs: avgPre,
                inferAvgMs: avgInfer,
                inferP50Ms: p50,
                inferP95Ms: p95,
                inferMinMs: min,
                inferMaxMs: max,
                postAvgMs: avgPost,
                totalAvgMs: avgTotal,
                approxFps: fps,
                memoryMb: memMb
            };

            setMetrics(benchmarkResult);
            setStatus(`100 runs completed! Avg Infer: ${avgInfer.toFixed(1)}ms | Approx FPS: ${fps.toFixed(1)}`);
            log(`=== Benchmark Complete ===`);
            log(`Avg Inference: ${avgInfer.toFixed(1)}ms | P50: ${p50.toFixed(1)}ms | P95: ${p95.toFixed(1)}ms`);
            log(`Total Pipeline: ${avgTotal.toFixed(1)}ms | Total FPS: ${fps.toFixed(1)} FPS`);
            
            // Expose globally for automated inspection
            (window as any).__ONNX_BENCHMARK_RESULTS__ = benchmarkResult;
        } catch (err: any) {
            log(`Benchmark error: ${err.message || err}`);
            setStatus(`Benchmark failed: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Render detections on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.src = selectedImg;
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            detections.forEach(det => {
                const [x1, y1, x2, y2] = det.bbox;
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#00ff66";
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                // Label tag
                ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                const label = `${det.className} ${(det.confidence * 100).toFixed(0)}%`;
                const textWidth = ctx.measureText(label).width;
                ctx.fillRect(x1, Math.max(0, y1 - 24), textWidth + 12, 22);

                ctx.fillStyle = "#00ff66";
                ctx.font = "bold 13px Inter, sans-serif";
                ctx.fillText(label, x1 + 6, Math.max(16, y1 - 8));
            });
        };
    }, [selectedImg, detections]);

    return (
        <div className="onnx-benchmark-container">
            <header className="bench-header">
                <button className="bench-back-btn" onClick={onBack}>&larr; Back to App</button>
                <div className="bench-title-group">
                    <h1>VERIFYX Browser ONNX Runtime Benchmark</h1>
                    <span className="bench-badge">Phase 9 Runtime Profiling</span>
                </div>
            </header>

            <div className="bench-grid">
                {/* Control Panel */}
                <div className="bench-card bench-controls">
                    <h2>1. Runtime Configuration</h2>
                    <div className="control-row">
                        <label>Execution Provider:</label>
                        <div className="btn-group">
                            <button
                                className={`pill-btn ${provider === "wasm" ? "active" : ""}`}
                                onClick={() => setProvider("wasm")}
                                disabled={isRunning}
                            >
                                WASM (CPU)
                            </button>
                            <button
                                className={`pill-btn ${provider === "webgl" ? "active" : ""}`}
                                onClick={() => setProvider("webgl")}
                                disabled={isRunning}
                            >
                                WebGL (GPU)
                            </button>
                        </div>
                    </div>

                    <div className="control-row">
                        <label>Select Test Sample:</label>
                        <select
                            value={selectedImg}
                            onChange={(e) => {
                                setSelectedImg(e.target.value);
                                setDetections([]);
                            }}
                            disabled={isRunning}
                            className="bench-select"
                        >
                            {TEST_IMAGES.map(img => (
                                <option key={img.id} value={img.path}>{img.label} ({img.expectedClass})</option>
                            ))}
                        </select>
                    </div>

                    <div className="bench-actions">
                        <button
                            className="primary-btn run-test-btn"
                            onClick={runVerificationTest}
                            disabled={isRunning}
                        >
                            {isRunning ? "Testing..." : "Verify 5 Classes"}
                        </button>
                        <button
                            className="primary-btn benchmark-btn"
                            onClick={run100Benchmark}
                            disabled={isRunning}
                        >
                            {isRunning ? `Running (${progress}/100)...` : "Run 100-Run Benchmark"}
                        </button>
                    </div>

                    <div className="bench-status-bar">
                        <strong>Status:</strong> {status}
                    </div>
                </div>

                {/* Metrics Card */}
                <div className="bench-card bench-metrics">
                    <h2>2. Benchmark Latency Results</h2>
                    {metrics ? (
                        <div className="metrics-table-wrapper">
                            <table className="metrics-table">
                                <tbody>
                                    <tr>
                                        <td>Execution Provider</td>
                                        <td className="highlight">{metrics.provider.toUpperCase()}</td>
                                    </tr>
                                    <tr>
                                        <td>Model Load Time</td>
                                        <td>{metrics.modelLoadTimeMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>First Run / Initialization</td>
                                        <td>{metrics.firstRunLatencyMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Preprocessing Time (Avg)</td>
                                        <td>{metrics.preAvgMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Raw Model Inference (Avg)</td>
                                        <td className="highlight-green">{metrics.inferAvgMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Inference P50 (Median)</td>
                                        <td>{metrics.inferP50Ms.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Inference P95</td>
                                        <td>{metrics.inferP95Ms.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Inference Min / Max</td>
                                        <td>{metrics.inferMinMs.toFixed(1)} ms / {metrics.inferMaxMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Postprocessing Time (NMS)</td>
                                        <td>{metrics.postAvgMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Total Frame Pipeline Time</td>
                                        <td className="highlight">{metrics.totalAvgMs.toFixed(1)} ms</td>
                                    </tr>
                                    <tr>
                                        <td>Estimated Operating FPS</td>
                                        <td className="highlight-fps">{metrics.approxFps.toFixed(1)} FPS</td>
                                    </tr>
                                    <tr>
                                        <td>JS Heap Memory</td>
                                        <td>{metrics.memoryMb ? `${metrics.memoryMb} MB` : "N/A (Browser Restricted)"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-metrics">
                            <p>No benchmark run completed yet. Click <strong>"Run 100-Run Benchmark"</strong> to measure latency.</p>
                        </div>
                    )}
                </div>

                {/* Visual Canvas Display */}
                <div className="bench-card bench-visual">
                    <h2>3. Output Decoding & Visual Overlay</h2>
                    <div className="canvas-wrapper">
                        <canvas ref={canvasRef} className="prediction-canvas" />
                    </div>
                    <div className="detection-list">
                        <h4>Decoded Detections ({detections.length})</h4>
                        {detections.length === 0 ? (
                            <p className="no-dets">No detections above threshold (conf &ge; 0.25)</p>
                        ) : (
                            <ul>
                                {detections.map((d, i) => (
                                    <li key={i}>
                                        <span className="det-class">{d.className}</span>
                                        <span className="det-conf">{(d.confidence * 100).toFixed(1)}%</span>
                                        <span className="det-box">[{d.bbox.map(x => Math.round(x)).join(", ")}]</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Console Log Terminal */}
                <div className="bench-card bench-terminal">
                    <h2>4. Runtime Execution Logs</h2>
                    <div className="terminal-box">
                        {logs.map((l, i) => (
                            <div key={i} className="log-line">{l}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
