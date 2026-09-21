import { useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Cpu,
    RotateCcw,
    ScanLine,
    ShieldAlert,
    Video,
    VideoOff,
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
}

export default function LiveScan({ onBack, onResults }: LiveScanProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [scanning, setScanning] = useState(false);

    const visionEngine = VisionEngine.getInstance();

    // Vision Engine State
    const [engineStatus, setEngineStatus] = useState<VisionEngineStatus>(() => visionEngine.status);
    const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
    const [inferenceMs, setInferenceMs] = useState<number>(0);
    const [fps, setFps] = useState<number>(0);
    const [lastInferenceTime, setLastInferenceTime] = useState<string>("");
    const [devHudOpen, setDevHudOpen] = useState<boolean>(false);
    const isInferringRef = useRef<boolean>(false);

    // Development & Test Profile State (allows testing High, Med-Review, and Low-Rescan)
    const [testProfile, setTestProfile] = useState<"live" | TestConfidenceProfile>("live");

    // Dataset Demo / Evaluation Mode State
    const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
    const [demoScenario, setDemoScenario] = useState<"fe" | "exit" | "hazard" | "pathway" | "empty">("fe");
    const demoImageRef = useRef<HTMLImageElement | null>(null);

    const datasetScenarios = [
        { id: "fe", label: "Fire Extinguisher", src: "/test_samples/fe.jpg" },
        { id: "exit", label: "Emergency Exit Sign", src: "/test_samples/exit.jpg" },
        { id: "hazard", label: "Hazard Sign", src: "/test_samples/hazard.jpg" },
        { id: "pathway", label: "Clear Pathway", src: "/test_samples/chair.jpg" },
        { id: "empty", label: "Empty / No Detection", src: "/test_samples/empty.jpg" },
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
                    setFps(2);
                    const now = new Date();
                    setLastInferenceTime(now.toLocaleTimeString() + "." + String(now.getMilliseconds()).padStart(3, "0"));
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

        startCamera();

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
                    const now = new Date();
                    setLastInferenceTime(now.toLocaleTimeString() + "." + String(now.getMilliseconds()).padStart(3, "0"));
                    setEngineStatus(visionEngine.status);
                    if (visionEngine.status.fps) {
                        setFps(visionEngine.status.fps);
                    }
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
        return { label: "Verified", className: "verified" };
    };

    return (
        <main className="live-page">
            <div className="live-container">
                {/* BACK */}
                <button className="live-back" onClick={onBack}>
                    <ArrowLeft size={18} />
                    Back
                </button>

                {/* HEADER */}
                <header className="live-header">
                    <div>
                        <span>VERIFYX / {isDemoMode ? "DATASET DEMO MODE" : "LIVE SCAN"}</span>
                        <h1>{isDemoMode ? "Dataset Evaluation Demo" : "Scan Environment"}</h1>
                    </div>

                    <div className="live-header-controls">
                        {/* DATASET DEMO TOGGLE BUTTON */}
                        <button
                            className={`vision-mode-btn-demo${isDemoMode ? " active" : ""}`}
                            onClick={() => {
                                if (isDemoMode) {
                                    setIsDemoMode(false);
                                    startCamera();
                                } else {
                                    handleSelectDemoScenario("fe");
                                }
                            }}
                        >
                            {isDemoMode ? "📷 SWITCH TO LIVE CAMERA" : "🧪 DATASET DEMO MODE"}
                        </button>

                        {/* ENGINE MODE BADGE */}
                        <div
                            className={
                                engineStatus.mode === "local_model"
                                    ? engineStatus.engineType === "yolo"
                                        ? "vision-status-chip"
                                        : "vision-status-chip fallback"
                                    : "vision-status-chip simulated"
                            }
                            title={engineStatus.engineName}
                        >
                            <Cpu size={14} />
                            <span>
                                {engineStatus.mode === "local_model"
                                    ? engineStatus.engineType === "yolo"
                                        ? "VERIFYX SAFETY SCANNER"
                                        : "SAFETY SCANNER (FALLBACK)"
                                    : "SIMULATION MODE"}
                            </span>
                        </div>

                        <button
                            className={`vision-mode-btn-devhud${devHudOpen ? " active" : ""}`}
                            onClick={() => setDevHudOpen((prev) => !prev)}
                            title="Toggle Developer Diagnostics & Engine Switcher"
                        >
                            {devHudOpen ? "HIDE DEV HUD" : "⚡ DEV HUD"}
                        </button>

                        <div className={cameraActive && !isDemoMode ? "camera-status active" : "camera-status"}>
                            {cameraActive && !isDemoMode ? <Video size={18} /> : <VideoOff size={18} />}
                            {isDemoMode ? "DEMO MODE ACTIVE" : cameraActive ? "CAMERA ACTIVE" : "CAMERA OFF"}
                        </div>
                    </div>
                </header>

                {/* DATASET DEMO SCENARIO SELECTION BAR */}
                <div className="demo-scenario-bar">
                    <span className="demo-bar-label">EVALUATION SCENARIO:</span>
                    {datasetScenarios.map((sc) => {
                        const isSelected = isDemoMode && demoScenario === sc.id;
                        return (
                            <button
                                key={sc.id}
                                className={`demo-scenario-btn${isSelected ? " active" : ""}`}
                                onClick={() => handleSelectDemoScenario(sc.id as any)}
                            >
                                {sc.label}
                            </button>
                        );
                    })}
                </div>

                {/* CAMERA / DEMO VIEWPORT */}
                <section className="camera-view">
                    {/* LIVE VIDEO FEED */}
                    <video
                        ref={videoRef}
                        className="camera-video"
                        autoPlay
                        muted
                        playsInline
                        style={{ display: isDemoMode ? "none" : "block" }}
                    />

                    {/* DATASET DEMO IMAGE DISPLAY */}
                    {isDemoMode && (
                        <img
                            src={datasetScenarios.find((s) => s.id === demoScenario)?.src}
                            alt="Dataset Evaluation Sample"
                            className="camera-video"
                            style={{ objectFit: "contain", background: "#050707" }}
                        />
                    )}

                    {/* MOVE CLOSER GUARDRAIL BANNER */}
                    {(cameraActive || isDemoMode) && scanning && needsCloser && (
                        <div className="move-closer-banner">
                            <ShieldAlert size={16} />
                            <span>MOVE CLOSER TO VERIFY (1.5–3.5m)</span>
                        </div>
                    )}

                    {/* CAMERA NOT ACTIVE & NOT DEMO */}
                    {!cameraActive && !isDemoMode && (
                        <div className="camera-placeholder">
                            <Camera size={48} />
                            <h2>Camera not active</h2>
                            <p>Allow camera access or select Dataset Demo / Evaluation Mode to verify without personal photos.</p>
                            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                                <button className="camera-start-button" onClick={startCamera}>
                                    ENABLE CAMERA
                                </button>
                                <button
                                    className="camera-start-button"
                                    onClick={() => handleSelectDemoScenario("fe")}
                                    style={{ background: "#1a2622", border: "1px solid #00ff9d", color: "#00ff9d" }}
                                >
                                    USE DATASET DEMO
                                </button>
                            </div>
                        </div>
                    )}


                    {/* SCAN OVERLAY */}
                    {cameraActive && scanning && <div className="camera-overlay" />}

                    {/* PATHWAY CORRIDOR GUIDANCE OVERLAY */}
                    {cameraActive && scanning && (
                        <div className="pathway-corridor-guide">
                            <div className="corridor-zone-tag">
                                <span>Walking Pathway Zone</span>
                            </div>
                        </div>
                    )}

                    {/* REAL MODEL DETECTIONS OVERLAY WITH USER-FACING STATES */}
                    {cameraActive && scanning && liveDetections.length > 0 && (
                        <>
                            {liveDetections.map((det) => {
                                const userState = getUserFacingState(det);
                                const isReview = userState.className === "review-required";
                                const isRescan = userState.className === "rescan" || userState.className === "move-closer";

                                const boxClass = isReview
                                    ? "real-scan-box review"
                                    : isRescan
                                    ? "real-scan-box rescan"
                                    : det.isIssue
                                    ? "real-scan-box issue"
                                    : "real-scan-box";

                                const labelClass = isReview
                                    ? "real-scan-label review"
                                    : isRescan
                                    ? "real-scan-label rescan"
                                    : det.isIssue
                                    ? "real-scan-label issue"
                                    : "real-scan-label";

                                return (
                                    <div
                                        key={det.id}
                                        className={boxClass}
                                        style={{
                                             left: `${det.bbox.x * 100}%`,
                                             top: `${det.bbox.y * 100}%`,
                                             width: `${det.bbox.width * 100}%`,
                                             height: `${det.bbox.height * 100}%`,
                                        }}
                                    >
                                        <div className={labelClass}>
                                            <span>{det.label}</span>
                                            <strong>{Math.round(det.confidence * 100)}%</strong>
                                            <span className={`user-state-pill ${userState.className}`}>
                                                {userState.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* CLEAR GUIDANCE WHEN NO OBJECTS DETECTED */}
                    {cameraActive && scanning && liveDetections.length === 0 && (
                        <div className="no-detection-overlay-guide">
                            <div className="no-det-pill">
                                <strong>NO RELEVANT OBJECT DETECTED</strong>
                            </div>
                            <p className="no-det-hint">Move the camera across the area</p>
                        </div>
                    )}

                    {/* SCANNING LASER */}
                    {cameraActive && scanning && <div className="scanning-line" />}

                    {/* REAL-TIME PERFORMANCE & CONFIDENCE TELEMETRY */}
                    {cameraActive && scanning && (
                        <div className="live-metrics-badge">
                            <span>
                                LATENCY: <strong>{inferenceMs}ms</strong>
                            </span>
                            <span>
                                FPS: <strong>{fps}</strong>
                            </span>
                            <span>
                                BACKEND: <strong>{engineStatus.backend.toUpperCase()}</strong>
                            </span>
                            {primaryDetection ? (
                                <span>
                                    OBJECT: <strong>{primaryDetection.label} ({Math.round(primaryDetection.confidence * 100)}% {primaryDetection.confidenceTier})</strong>
                                </span>
                            ) : (
                                <span style={{ color: "#94a3b8" }}>
                                    OBJECT: <strong>NONE IN VIEW</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {/* READY STATE */}
                    {cameraActive && !scanning && (
                        <div className="ready-indicator">
                            <ScanLine size={30} />
                            <span>READY TO SCAN</span>
                        </div>
                    )}
                </section>

                {/* ERROR */}
                {cameraError && <div className="camera-error">{cameraError}</div>}

                {/* CONTROLS */}
                <section className="scan-controls">
                    <div className="scan-info">
                        <div>
                            <span>VERIFICATION MODE</span>
                            <strong>
                                {scanning
                                    ? engineStatus.mode === "local_model"
                                        ? `Local AI scanning (${liveDetections.length} detected)...`
                                        : "Simulated scan running..."
                                    : "Ready"}
                            </strong>
                        </div>

                        <div className="scan-icon">
                            {scanning ? <ScanLine size={22} /> : <Camera size={22} />}
                        </div>
                    </div>

                    {/* START / STOP */}
                    <button
                        className={scanning ? "scan-control stop" : "scan-control"}
                        onClick={toggleScanning}
                    >
                        {scanning ? (
                            <>
                                <RotateCcw size={18} />
                                STOP SCANNING
                            </>
                        ) : (
                            <>
                                <ScanLine size={18} />
                                START SCANNING
                            </>
                        )}
                    </button>

                    {/* STATUS CHECKS */}
                    {scanning && (
                        <div className="verification-checks">
                            <div className="check-item done">
                                <CheckCircle2 size={17} />
                                Local Safety Engine Active
                            </div>

                            <div className="check-item">
                                <span className="pulse-dot" />
                                {liveDetections.length > 0 ? (
                                    <>
                                        <Zap size={14} color="#00ff9d" /> In view:{" "}
                                        {liveDetections.map((d) => d.label).join(", ")}
                                    </>
                                ) : (
                                    "Aim camera at workplace safety assets or walking pathway..."
                                )}
                            </div>
                        </div>
                    )}

                    {/* RESULTS BUTTON */}
                    {scanning && (
                        <button className="results-button" onClick={handleViewResults}>
                            VIEW RESULTS
                        </button>
                    )}

                    {/* CONFIDENCE TEST HARNESS (DEVELOPER ONLY: HIDDEN IN NORMAL PRODUCTION) */}
                    {isDevMode && (
                        <div className="confidence-harness-bar">
                            <span className="confidence-harness-label">
                                <ShieldAlert size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                                DEV TEST PROFILES:
                            </span>
                            <button
                                className={`confidence-harness-btn ${testProfile === "live" ? "active" : ""}`}
                                onClick={() => setTestProfile("live")}
                            >
                                Live Model
                            </button>
                            <button
                                className={`confidence-harness-btn ${testProfile === "high_confidence" ? "active" : ""}`}
                                onClick={() => setTestProfile("high_confidence")}
                                title="Simulate High Confidence (93% - Confirmed Issue)"
                            >
                                High Conf (93%)
                            </button>
                            <button
                                className={`confidence-harness-btn ${testProfile === "medium_confidence" ? "active" : ""}`}
                                onClick={() => setTestProfile("medium_confidence")}
                                title="Simulate Medium Confidence (58% - Review Required)"
                            >
                                Med Review (58%)
                            </button>
                            <button
                                className={`confidence-harness-btn ${testProfile === "low_confidence" ? "active" : ""}`}
                                onClick={() => setTestProfile("low_confidence")}
                                title="Simulate Low Confidence (36% - Rescan Needed)"
                            >
                                Low Rescan (36%)
                            </button>
                        </div>
                    )}

                    {/* DEV DIAGNOSTICS & TELEMETRY CARD */}
                    {isDevMode && (
                        <div className="dev-hud-card">
                            <div className="dev-hud-header">
                                <span>DEVELOPMENT TELEMETRY (PHASE 10)</span>
                                <span style={{ color: isInferringRef.current ? "#f59e0b" : "#4ade80" }}>
                                    QUEUE: {isInferringRef.current ? "IN-FLIGHT (NO QUEUE)" : "IDLE"}
                                </span>
                            </div>
                            <div className="dev-hud-grid">
                                <div className="dev-hud-item">
                                    <span>Active Model</span>
                                    <strong>{engineStatus.engineName}</strong>
                                </div>
                                <div className="dev-hud-item">
                                    <span>Inference Latency</span>
                                    <strong>~{inferenceMs} ms</strong>
                                </div>
                                <div className="dev-hud-item">
                                    <span>Last Inference</span>
                                    <strong>{lastInferenceTime || "Awaiting frame"}</strong>
                                </div>
                                <div className="dev-hud-item">
                                    <span>Detections</span>
                                    <strong>{liveDetections.length} object(s)</strong>
                                </div>
                                <div className="dev-hud-item">
                                    <span>Move-Closer Guardrail</span>
                                    <strong style={{ color: needsCloser ? "#facc15" : "#4ade80" }}>
                                        {needsCloser ? "ACTIVE (<32px)" : "INACTIVE"}
                                    </strong>
                                </div>
                            </div>
                            <div className="dev-engine-pills">
                                <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center", marginRight: 4 }}>SWITCH ENGINE:</span>
                                <button
                                    className={`dev-pill-btn ${engineStatus.engineType === "yolo" ? "active" : ""}`}
                                    onClick={() => handleSwitchEngine("yolo")}
                                    title="Run trained VERIFYX YOLO11n ONNX model (WASM)"
                                >
                                    VERIFYX YOLO (WASM)
                                </button>
                                <button
                                    className={`dev-pill-btn ${engineStatus.engineType === "coco_ssd" ? "active" : ""}`}
                                    onClick={() => handleSwitchEngine("coco_ssd")}
                                    title="Run COCO-SSD fallback model (WebGL)"
                                >
                                    COCO-SSD Fallback
                                </button>
                                <button
                                    className={`dev-pill-btn ${engineStatus.mode === "simulation" ? "active" : ""}`}
                                    onClick={() => handleSwitchEngine("simulation")}
                                    title="Run simulated vision adapter"
                                >
                                    Simulation
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}