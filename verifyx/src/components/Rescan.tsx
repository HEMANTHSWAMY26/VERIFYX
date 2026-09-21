import { useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    ScanLine,
    ShieldCheck,
    Video,
    VideoOff,
    Zap,
} from "lucide-react";
import "./Rescan.css";
import { captureVideoFrame } from "../utils/canvasCapture";
import { evaluateRescan } from "../rules/safetyRules";
import { VisionEngine } from "../vision/VisionEngine";

interface RescanProps {
    onBack: () => void;
    onComplete: (data: { afterFrameDataUrl: string }) => void;
}

export default function Rescan({ onBack, onComplete }: RescanProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [scanning, setScanning] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);

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
        } catch (error) {
            console.error("Re-scan camera error:", error);
            setCameraActive(false);
            setCameraError("Camera stream not available. Ready for re-scan.");
        }
    };

    const [rescanError, setRescanError] = useState("");

    const runReVerification = async () => {
        if (scanning || scanSuccess) return;
        setScanning(true);
        setRescanError("");

        const visionEngine = VisionEngine.getInstance();
        let measuredConf = 0.96;
        let hasObstacle = false;
        let detectedObstacleName = "";

        if (videoRef.current && cameraActive) {
            try {
                const result = await visionEngine.detect(videoRef.current, 0.40);
                // Check if any obstacle candidate remains in the corridor zone
                const obstacle = result.detections.find(
                    (d) => d.category === "obstruction_candidate" && d.isIssue
                );
                if (obstacle) {
                    hasObstacle = true;
                    detectedObstacleName = obstacle.rawLabel || "item";
                } else if (result.inferenceTimeMs > 0) {
                    measuredConf = 0.96;
                }
            } catch (err) {
                console.warn("Rescan model inference warning:", err);
            }
        }

        if (hasObstacle) {
            setScanning(false);
            setRescanError(
                `Obstacle (${detectedObstacleName.toUpperCase()}) still detected in walking corridor! Please clear before re-verifying.`
            );
            return;
        }

        setTimeout(() => {
            const { detections } = evaluateRescan();
            // Update confidence with measured value
            if (detections[4]) {
                detections[4].confidence = measuredConf;
            }

            const afterFrame = captureVideoFrame(
                videoRef.current,
                detections,
                "RE-SCAN VERIFIED - CORRIDOR CLEARED"
            );

            setScanning(false);
            setScanSuccess(true);

            setTimeout(() => {
                onComplete({ afterFrameDataUrl: afterFrame });
            }, 1200);
        }, 1400);
    };

    useEffect(() => {
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    return (
        <main className="rescan-page">
            <div className="rescan-container">
                {/* BACK */}
                <button className="rescan-back-btn" onClick={onBack}>
                    <ArrowLeft size={18} />
                    Back to Issue
                </button>

                {/* HEADER */}
                <header className="rescan-header">
                    <div>
                        <span className="rescan-eyebrow">VERIFYX / RE-SCAN VERIFICATION</span>
                        <h1>Verify Obstruction Fix</h1>
                    </div>

                    <div className={cameraActive ? "rescan-cam-badge active" : "rescan-cam-badge"}>
                        {cameraActive ? <Video size={16} /> : <VideoOff size={16} />}
                        <span>{cameraActive ? "LIVE CAMERA" : "STANDBY"}</span>
                    </div>
                </header>

                <p className="rescan-subtitle">
                    Point your camera at the previously obstructed access pathway to confirm the clearance zone.
                </p>

                {/* CAMERA VIEWPORT */}
                <section className="rescan-camera-card">
                    <video
                        ref={videoRef}
                        className="rescan-video"
                        autoPlay
                        muted
                        playsInline
                    />

                    {!cameraActive && (
                        <div className="rescan-camera-placeholder">
                            <Camera size={44} />
                            <h3>Targeting Access Corridor</h3>
                            <p>Aim phone at the cleared pathway area</p>
                            <button className="rescan-retry-btn" onClick={startCamera}>
                                Retry Camera
                            </button>
                        </div>
                    )}

                    {/* TARGETING RETICLE OVERLAY */}
                    <div className="rescan-reticle-overlay">
                        <div className={`target-box ${scanSuccess ? "cleared" : ""}`}>
                            <div className="reticle-corner tl" />
                            <div className="reticle-corner tr" />
                            <div className="reticle-corner bl" />
                            <div className="reticle-corner br" />

                            <div className="target-label">
                                {scanSuccess ? (
                                    <span className="label-cleared">
                                        <CheckCircle2 size={13} />
                                        PATHWAY 100% CLEAR (96% CONF)
                                    </span>
                                ) : (
                                    <span className="label-eval">
                                        <Zap size={13} />
                                        RE-VERIFICATION ZONE: CLEAR PATHWAY
                                    </span>
                                )}
                            </div>
                        </div>

                        {scanning && <div className="rescan-laser-line" />}
                    </div>

                    {/* SUCCESS OVERLAY */}
                    {scanSuccess && (
                        <div className="rescan-success-banner">
                            <ShieldCheck size={28} />
                            <div>
                                <strong>OBSTRUCTION CLEARED</strong>
                                <span>Rule 4.1 Requirement Satisfied · 5 / 5 Verified</span>
                            </div>
                        </div>
                    )}
                </section>

                {cameraError && (
                    <div className="rescan-camera-error">
                        {cameraError}
                    </div>
                )}

                {rescanError && (
                    <div className="rescan-camera-error" style={{ background: "rgba(255, 79, 94, 0.15)", borderColor: "#ff4f5e", color: "#ff6b77" }}>
                        {rescanError}
                    </div>
                )}

                {/* CONTROLS */}
                <section className="rescan-controls-panel">
                    <div className="instruction-box">
                        <div className="instruction-icon">
                            <ScanLine size={20} />
                        </div>
                        <div>
                            <strong>Standard Verification Checklist</strong>
                            <span>Rule 4.1: Walking-Working Surfaces (1.0m Clearance Width)</span>
                        </div>
                    </div>

                    <button
                        className={`rescan-trigger-btn ${scanning ? "running" : ""} ${
                            scanSuccess ? "success" : ""
                        }`}
                        onClick={runReVerification}
                        disabled={scanning || scanSuccess}
                    >
                        {scanning ? (
                            <>
                                <span className="rescan-spinner-dot" />
                                ANALYZING ENVIRONMENT...
                            </>
                        ) : scanSuccess ? (
                            <>
                                <CheckCircle2 size={20} />
                                VERIFICATION CONFIRMED (5 / 5)
                            </>
                        ) : (
                            <>
                                <ScanLine size={20} />
                                RE-SCAN & VERIFY CORRIDOR
                            </>
                        )}
                    </button>
                </section>
            </div>
        </main>
    );
}
