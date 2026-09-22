import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Cpu,
    FlaskConical,
    RotateCcw,
    ScanLine,
    ShieldAlert,
    Video,
    Zap,
} from "lucide-react";

import "./LiveScan.css";

import { captureVideoFrame } from "../utils/canvasCapture";
import {
    evaluateInitialScan,
    evaluateRealDetectionsAgainstRules,
    type TestConfidenceProfile,
} from "../rules/safetyRules";
import { VisionEngine } from "../vision/VisionEngine";
import type { Detection, VerificationCheck } from "../types/verification";
import type { VisionEngineStatus } from "../vision/types";

interface LiveScanProps {
    onBack: () => void;
    onResults: (data: {
        frameDataUrl: string;
        checks?: VerificationCheck[];
        detections?: Detection[];
        isRealAI?: boolean;
    }) => void;
    initialDemoMode?: boolean;
}

export default function LiveScan({ onBack, onResults, initialDemoMode = false }: LiveScanProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [scanning, setScanning] = useState(initialDemoMode);

    const visionEngine = VisionEngine.getInstance();

    // Vision Engine State
    const [engineStatus, setEngineStatus] = useState<VisionEngineStatus>(() => visionEngine.status);
    const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
    const [inferenceMs, setInferenceMs] = useState<number>(0);
    const [devHudOpen, setDevHudOpen] = useState<boolean>(false);
    const isInferringRef = useRef<boolean>(false);

    // Development & Test Profile State
    const testProfile: "live" | TestConfidenceProfile = "live";

    // Dataset Demo / Evaluation Mode State
    const [isDemoMode, setIsDemoMode] = useState<boolean>(initialDemoMode);
    const [demoScenario, setDemoScenario] = useState<"fe" | "exit" | "hazard" | "pathway" | "empty">("fe");
    const demoImageRef = useRef<HTMLImageElement | null>(null);

    const datasetScenarios = [
        { id: "fe", label: "Fire Extinguisher", code: "FE-01", src: "/test_samples/fe.jpg" },
        { id: "exit", label: "Emergency Exit", code: "EX-02", src: "/test_samples/exit.jpg" },
        { id: "hazard", label: "Hazard Sign", code: "HZ-03", src: "/test_samples/hazard.jpg" },
        { id: "pathway", label: "Pathway Obstruction", code: "PW-04", src: "/test_samples/chair.jpg" },
        { id: "empty", label: "Empty / No Object", code: "NO-05", src: "/test_samples/empty.jpg" },
    ] as const;

    const startCamera = async () => {
        try {
            setCameraError("");

            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError("Camera access is not supported by this browser.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraActive(true);
            setIsDemoMode(false);
        } catch (error) {
            console.error("Camera error:", error);
            setCameraActive(false);
            setCameraError(
                "Camera access was blocked or unavailable. You can use Dataset Demo / Evaluation Mode to verify."
            );
        }
    };

    const handleSelectDemoScenario = (scenarioId: "fe" | "exit" | "hazard" | "pathway" | "empty") => {
        setDemoScenario(scenarioId);
        setIsDemoMode(true);
        setScanning(true);
    };

    // Evaluate Demo Scenario through real VisionEngine
    useEffect(() => {
        if (!isDemoMode) return;

        const targetScenario = datasetScenarios.find((s) => s.id === demoScenario);
        if (!targetScenario) return;

        let isCancelled = false;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = targetScenario.src;

        img.onload = async () => {
            if (isCancelled) return;
            try {
                const startTime = performance.now();
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || 640;
                canvas.height = img.naturalHeight || 640;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.drawImage(img, 0, 0);

                const result = await visionEngine.detect(canvas, 0.35);
                const elapsed = Math.round(performance.now() - startTime);

                if (!isCancelled) {
                    setLiveDetections(result.detections);
                    setInferenceMs(elapsed || result.inferenceTimeMs);
                    setEngineStatus(visionEngine.status);
                }
            } catch (err) {
                console.warn("[LiveScan] Demo mode inference warning:", err);
            }
        };

        return () => {
            isCancelled = true;
        };
    }, [isDemoMode, demoScenario, visionEngine]);

    // Initialize local VisionEngine on mount
    useEffect(() => {
        let isMounted = true;
        visionEngine
            .init()
            .then(() => {
                if (isMounted) {
                    setEngineStatus(visionEngine.status);
                }
            })
            .catch((err) => {
                console.warn("VisionEngine init warning:", err);
                if (isMounted) {
                    setEngineStatus(visionEngine.status);
                }
            });

        if (!initialDemoMode) {
            startCamera();
        }

        return () => {
            isMounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Explicit engine switcher (YOLO11n, COCO-SSD Fallback, Simulation)
    const handleSwitchEngine = async (target: "yolo" | "coco_ssd" | "simulation") => {
        await visionEngine.switchEngine(target);
        setEngineStatus(visionEngine.status);
    };

    // Asynchronous background inference loop (~2 FPS / 480ms) for Live Camera
    useEffect(() => {
        if (!scanning || !cameraActive || isDemoMode) {
            if (!isDemoMode) setLiveDetections([]);
            return;
        }

        let isCancelled = false;

        const intervalId = window.setInterval(async () => {
            if (isInferringRef.current || !videoRef.current || isCancelled) return;

            isInferringRef.current = true;
            try {
                const result = await visionEngine.detect(videoRef.current, 0.35);
                if (!isCancelled) {
                    setLiveDetections(result.detections);
                    setInferenceMs(result.inferenceTimeMs);
                    setEngineStatus(visionEngine.status);
                }
            } catch (err) {
                console.warn("[LiveScan] Async background inference warning:", err);
            } finally {
                isInferringRef.current = false;
            }
        }, 480);

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
            isInferringRef.current = false;
        };
    }, [scanning, cameraActive, isDemoMode, visionEngine]);

    const toggleScanning = () => {
        if (isDemoMode) {
            setIsDemoMode(false);
            setScanning(false);
            startCamera();
            return;
        }
        if (!cameraActive) {
            startCamera();
            return;
        }
        setScanning((current) => !current);
    };

    const handleViewResults = () => {
        const isRealAI = engineStatus.mode === "local_model" && testProfile === "live";

        let finalDetections = liveDetections;
        let evaluatedChecks: VerificationCheck[];

        if (!isRealAI) {
            const initial = evaluateInitialScan(testProfile !== "live" ? testProfile : "high_confidence");
            finalDetections = initial.detections;
            evaluatedChecks = initial.checks;
        } else {
            const evalResult = evaluateRealDetectionsAgainstRules(liveDetections, engineStatus.engineType || "yolo");
            evaluatedChecks = evalResult.checks;
            finalDetections = liveDetections;
        }

        const sourceElement = isDemoMode && demoImageRef.current ? demoImageRef.current : videoRef.current;
        const frameDataUrl = captureVideoFrame(
            sourceElement,
            finalDetections,
            isDemoMode
                ? `DATASET DEMO MODE (${demoScenario.toUpperCase()})`
                : isRealAI
                ? `${engineStatus.engineName.toUpperCase()} SCAN`
                : `SIMULATION MODE (${testProfile.toUpperCase()})`
        );

        onResults({
            frameDataUrl,
            checks: evaluatedChecks,
            detections: finalDetections,
            isRealAI,
        });
    };

    // Check if any detected object triggers Move-Closer guardrail (< 32px or uncertain distance)
    const needsCloser = liveDetections.some(
        (d) => d.isTooSmall || d.decision === "RESCAN_NEEDED" || d.statusText?.includes("MOVE CLOSER")
    );

    // Primary detection for telemetry HUD
    const primaryObstacle = liveDetections.find(
        (d) => d.category === "obstruction_candidate" && d.isIssue
    );
    const primaryDetection = primaryObstacle || (liveDetections.length > 0
        ? [...liveDetections].sort((a, b) => b.confidence - a.confidence)[0]
        : null);

    const isDevMode = Boolean(
        devHudOpen ||
        import.meta.env.VITE_VERIFYX_DEV_MODE === "true" ||
        (typeof window !== "undefined" && (window.location.search.includes("dev=true") || window.location.search.includes("benchmark")))
    );

    const getUserFacingState = (det: Detection): { label: string; className: string } => {
        if (det.isTooSmall || det.decision === "RESCAN_NEEDED" || det.statusText?.includes("MOVE CLOSER")) {
            return { label: "Move closer", className: "move-closer" };
        }
        if (det.confidenceTier === "LOW") {
            return { label: "Rescan", className: "rescan" };
        }
        if (det.confidenceTier === "MEDIUM" || det.decision === "REVIEW_REQUIRED") {
            return { label: "Review required", className: "review-required" };
        }
        if (det.isIssue || det.decision === "ISSUE") {
            return { label: "Issue detected", className: "issue-detected" };
        }
        return { label: "✓ Verified", className: "verified" };
    };

    const hasActiveView = cameraActive || isDemoMode;
    const isIssueDetected = liveDetections.some((d) => d.isIssue);

    return (
        <main className="live-page">
            <div className="live-container">

                {/* ─── TOP PRECISION TELEMETRY BAR ─────────────────────────── */}
                <header className="scan-telemetry-header">
                    <div className="telemetry-left">
                        <button className="live-back-btn" onClick={onBack} title="Back">
                            <ArrowLeft size={16} />
                            <span>RETURN</span>
                        </button>

                        <div className="telemetry-chips-row">
                            <div className="telemetry-chip active-ai">
                                <span className="telemetry-pulse-dot" />
                                <span>LOCAL AI</span>
                            </div>
                            <span className="telemetry-divider">/</span>
                            <div className="telemetry-chip">
                                <span>YOLO11n ONNX</span>
                            </div>
                            <span className="telemetry-divider">/</span>
                            <div className="telemetry-chip">
                                <span>LOCAL INFERENCE</span>
                            </div>
                            <span className="telemetry-divider">/</span>
                            <div className="telemetry-chip rate-pill">
                                <span>~2 FPS ASYNC</span>
                            </div>
                            {inferenceMs > 0 && (
                                <>
                                    <span className="telemetry-divider">/</span>
                                    <div className="telemetry-chip latency">
                                        <span>{inferenceMs}ms</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="telemetry-right">
                        {/* DATASET DEMO TOGGLE */}
                        <button
                            className={`mode-toggle-btn ${isDemoMode ? "active-demo" : ""}`}
                            onClick={() => {
                                if (isDemoMode) {
                                    setIsDemoMode(false);
                                    startCamera();
                                } else {
                                    handleSelectDemoScenario("fe");
                                }
                            }}
                            id="btn-toggle-demo-mode"
                        >
                            <FlaskConical size={13} />
                            <span>{isDemoMode ? "LIVE CAMERA" : "DATASET DEMO"}</span>
                        </button>

                        {/* DEV HUD TOGGLE */}
                        <button
                            className={`dev-toggle-btn ${devHudOpen ? "active" : ""}`}
                            onClick={() => setDevHudOpen((prev) => !prev)}
                            title="Diagnostics HUD"
                        >
                            <Zap size={13} />
                        </button>

                        {/* SENSOR STATE BADGE */}
                        <div className={`sensor-badge ${hasActiveView ? "live" : "standby"}`}>
                            {isDemoMode ? (
                                <span className="sensor-text demo">EVAL DEMO</span>
                            ) : cameraActive ? (
                                <span className="sensor-text live">CAM ON</span>
                            ) : (
                                <span className="sensor-text off">STANDBY</span>
                            )}
                        </div>
                    </div>
                </header>

                {/* ─── DATASET DEMO SELECTOR (WHEN ACTIVE) ─────────────────── */}
                {isDemoMode && (
                    <motion.div
                        className="demo-selector-bar"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="demo-selector-header">
                            <span className="demo-tag">DATASET DEMO · EVALUATION SAMPLES</span>
                            <span className="demo-sub">Zero personal photos · Approved audit test suite</span>
                        </div>

                        <div className="demo-pills-row">
                            {datasetScenarios.map((sc) => {
                                const isSelected = demoScenario === sc.id;
                                return (
                                    <button
                                        key={sc.id}
                                        className={`demo-pill ${isSelected ? "selected" : ""}`}
                                        onClick={() => handleSelectDemoScenario(sc.id as any)}
                                    >
                                        <span className="pill-code">{sc.code}</span>
                                        <span className="pill-label">{sc.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ─── DOMINANT COMPUTER VISION VIEWPORT ────────────────────── */}
                <section className="vision-viewport">
                    {/* LIVE CAMERA FEED */}
                    <video
                        ref={videoRef}
                        className="vision-feed-element"
                        autoPlay
                        muted
                        playsInline
                        style={{ display: isDemoMode ? "none" : "block" }}
                    />

                    {/* DATASET DEMO IMAGE */}
                    {isDemoMode && (
                        <img
                            ref={demoImageRef}
                            src={datasetScenarios.find((s) => s.id === demoScenario)?.src}
                            alt="Evaluation sample"
                            className="vision-feed-element"
                            style={{ objectFit: "contain", background: "#050707" }}
                        />
                    )}

                    {/* CAMERA NOT ACTIVE & NOT IN DEMO MODE */}
                    {!cameraActive && !isDemoMode && (
                        <div className="viewport-empty-state">
                            <Camera size={44} className="empty-icon" />
                            <h2>Camera Standby</h2>
                            <p>Enable live camera or select Dataset Demo mode to evaluate locally.</p>
                            <div className="empty-actions">
                                <button className="empty-btn primary" onClick={startCamera}>
                                    <Video size={15} />
                                    <span>ENABLE CAMERA</span>
                                </button>
                                <button
                                    className="empty-btn secondary"
                                    onClick={() => handleSelectDemoScenario("fe")}
                                >
                                    <FlaskConical size={15} />
                                    <span>USE DATASET DEMO</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SUBTLE SCAN BEAM (MOVES SLOWLY, THIN, INDUSTRIAL) */}
                    {hasActiveView && scanning && (
                        <motion.div
                            className="industrial-scan-beam"
                            animate={{ top: ["2%", "96%", "2%"] }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    )}

                    {/* CORNER RETICLES (HUD OVERLAYS) */}
                    {hasActiveView && (
                        <>
                            <div className="viewport-reticle tl" />
                            <div className="viewport-reticle tr" />
                            <div className="viewport-reticle bl" />
                            <div className="viewport-reticle br" />
                        </>
                    )}

                    {/* DYNAMIC SPATIAL CORRIDOR GUIDE */}
                    {hasActiveView && scanning && (
                        <div className="pathway-zone-overlay">
                            <span className="corridor-watermark">WALKING ROUTE 1.0M ZONE</span>
                        </div>
                    )}

                    {/* MOVE CLOSER GUARDRAIL BANNER */}
                    {hasActiveView && scanning && needsCloser && (
                        <div className="guardrail-closer-banner">
                            <ShieldAlert size={15} />
                            <span>MOVE CLOSER TO VERIFY (1.5–3.5m) · DETECTION UNDER 32px</span>
                        </div>
                    )}

                    {/* ─── REAL DETECTION OVERLAYS WITH SPRING MOTION ─────────── */}
                    {hasActiveView && scanning && liveDetections.length > 0 && (
                        <div className="detections-overlay-container">
                            <AnimatePresence>
                                {liveDetections.map((det) => {
                                    const userState = getUserFacingState(det);
                                    const isReview = userState.className === "review-required";
                                    const isRescan = userState.className === "rescan" || userState.className === "move-closer";

                                    const boxClass = isReview
                                        ? "detection-reticle review"
                                        : isRescan
                                        ? "detection-reticle rescan"
                                        : det.isIssue
                                        ? "detection-reticle issue"
                                        : "detection-reticle pass";

                                    return (
                                        <motion.div
                                            key={det.id}
                                            className={boxClass}
                                            initial={{ opacity: 0, scale: 0.94 }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                                left: `${det.bbox.x * 100}%`,
                                                top: `${det.bbox.y * 100}%`,
                                                width: `${det.bbox.width * 100}%`,
                                                height: `${det.bbox.height * 100}%`,
                                            }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ type: "spring", stiffness: 340, damping: 28 }}
                                        >
                                            {/* CORNER MARKS */}
                                            <span className="box-corner tl" />
                                            <span className="box-corner tr" />
                                            <span className="box-corner bl" />
                                            <span className="box-corner br" />

                                            {/* FLOATING DETECTION LABEL */}
                                            <motion.div
                                                className="detection-floating-label"
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.18 }}
                                            >
                                                <span className="label-object-name">{det.label}</span>
                                                <span className="label-conf-value">
                                                    {Math.round(det.confidence * 100)}%
                                                </span>
                                                <span className={`label-state-pill ${userState.className}`}>
                                                    {userState.label}
                                                </span>
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* NO DETECTION IN VIEW GUIDANCE */}
                    {hasActiveView && scanning && liveDetections.length === 0 && (
                        <div className="view-empty-guidance">
                            <span className="guidance-dot" />
                            <span>NO COMPLIANCE OBJECTS DETECTED · POINT CAMERA AT SAFETY ASSETS</span>
                        </div>
                    )}

                    {/* ─── BOTTOM VIEWPORT TELEMETRY READOUT ─────────────────── */}
                    {hasActiveView && (
                        <div className="viewport-bottom-telemetry">
                            {/* DYNAMIC STATE PROGRESSION */}
                            <div className="state-progression-pill">
                                {isIssueDetected ? (
                                    <span className="state-item issue">
                                        <span className="state-dot" />
                                        ISSUE DETECTED · CORRIDOR OBSTRUCTION
                                    </span>
                                ) : needsCloser ? (
                                    <span className="state-item warning">
                                        <span className="state-dot" />
                                        MOVE CLOSER TO ESTABLISH CONFIDENCE
                                    </span>
                                ) : liveDetections.length > 0 ? (
                                    <span className="state-item pass">
                                        <span className="state-dot" />
                                        EVIDENCE FOUND · VERIFIED
                                    </span>
                                ) : scanning ? (
                                    <span className="state-item scanning">
                                        <span className="state-dot" />
                                        SCANNING WORKPLACE ENVIRONMENT
                                    </span>
                                ) : (
                                    <span className="state-item standby">
                                        <span className="state-dot" />
                                        VISION INSTRUMENT READY
                                    </span>
                                )}
                            </div>

                            {primaryDetection && (
                                <div className="primary-detection-pill">
                                    <span className="target-label">PRIMARY TARGET:</span>
                                    <span className="target-name">
                                        {primaryDetection.label} ({Math.round(primaryDetection.confidence * 100)}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {cameraError && <div className="live-camera-alert">{cameraError}</div>}

                {/* ─── MINIMAL CONTROL CONSOLE ──────────────────────────────── */}
                <section className="scan-controls-console">
                    <div className="console-info">
                        <span className="console-label">INSTRUMENT STATE</span>
                        <strong className="console-status">
                            {scanning
                                ? isDemoMode
                                    ? "Evaluating approved dataset sample..."
                                    : "Asynchronous YOLO inference active (~2 FPS)"
                                : "Paused · Ready"}
                        </strong>
                    </div>

                    <div className="console-actions">
                        <button
                            className={`control-btn-scan ${scanning ? "active-scanning" : ""}`}
                            onClick={toggleScanning}
                            id="btn-toggle-scan"
                        >
                            {scanning ? (
                                <>
                                    <RotateCcw size={16} />
                                    <span>STOP SCAN</span>
                                </>
                            ) : (
                                <>
                                    <ScanLine size={16} />
                                    <span>START SCAN</span>
                                </>
                            )}
                        </button>

                        <button
                            className="control-btn-results"
                            onClick={handleViewResults}
                            disabled={!scanning && !hasActiveView}
                            id="btn-view-results"
                        >
                            <span>VIEW RESULTS</span>
                            <CheckCircle2 size={16} />
                        </button>
                    </div>
                </section>

                {/* ─── DEV DIAGNOSTICS & TELEMETRY CARD (COLLAPSIBLE) ───────── */}
                {isDevMode && (
                    <section className="dev-diagnostics-drawer">
                        <div className="dev-drawer-header">
                            <div className="drawer-title">
                                <Cpu size={14} />
                                <span>ON-DEVICE DIAGNOSTICS · PHASE 10 / 11 ENGINE</span>
                            </div>
                            <span className="queue-status">
                                {isInferringRef.current ? "PROCESSING FRAME" : "ENGINE IDLE"}
                            </span>
                        </div>

                        <div className="dev-metrics-grid">
                            <div className="dev-metric">
                                <span>Model</span>
                                <strong>{engineStatus.engineName}</strong>
                            </div>
                            <div className="dev-metric">
                                <span>Inference</span>
                                <strong>{inferenceMs} ms</strong>
                            </div>
                            <div className="dev-metric">
                                <span>Detections</span>
                                <strong>{liveDetections.length} objects</strong>
                            </div>
                            <div className="dev-metric">
                                <span>Guardrail</span>
                                <strong>{needsCloser ? "ACTIVE (<32px)" : "CLEAR"}</strong>
                            </div>
                        </div>

                        <div className="dev-switch-row">
                            <span className="dev-switch-label">ENGINE:</span>
                            <button
                                className={`dev-switch-btn ${engineStatus.engineType === "yolo" ? "active" : ""}`}
                                onClick={() => handleSwitchEngine("yolo")}
                            >
                                YOLO11n (WASM)
                            </button>
                            <button
                                className={`dev-switch-btn ${engineStatus.engineType === "coco_ssd" ? "active" : ""}`}
                                onClick={() => handleSwitchEngine("coco_ssd")}
                            >
                                COCO-SSD (WebGL)
                            </button>
                            <button
                                className={`dev-switch-btn ${engineStatus.mode === "simulation" ? "active" : ""}`}
                                onClick={() => handleSwitchEngine("simulation")}
                            >
                                Simulation
                            </button>
                        </div>
                    </section>
                )}

            </div>
        </main>
    );
}