import { motion } from "framer-motion";
import {
    ArrowRight,
    Camera,
    ShieldCheck,
    WifiOff,
    Zap,
} from "lucide-react";

interface VerifyXHomeProps {
    onStart: () => void;
    onBenchmark?: () => void;
}

export default function VerifyXHome({ onStart, onBenchmark }: VerifyXHomeProps) {
    return (
        <main className="verifyx-home">
            <div className="home-container">

                <motion.div
                    className="eyebrow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="eyebrow-dot" />
                    PHYSICAL-WORLD VERIFICATION AI
                </motion.div>

                <section className="hero-section">

                    <motion.div
                        className="hero-copy"
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1>
                            See what's wrong.
                            <br />
                            <span>Fix it.</span>
                        </h1>

                        <p className="hero-description">
                            VERIFYX uses on-device AI to inspect real-world
                            environments against predefined safety standards.
                        </p>

                        <button
                            className="start-button"
                            onClick={onStart}
                        >
                            START VERIFICATION
                            <ArrowRight size={19} />
                        </button>

                        <div className="trust-row">
                            <div>
                                <WifiOff size={15} />
                                Offline-first
                            </div>

                            <div>
                                <ShieldCheck size={15} />
                                On-device AI
                            </div>

                            <div>
                                <Zap size={15} />
                                Fast verification
                            </div>

                            {onBenchmark && (
                                <button
                                    onClick={onBenchmark}
                                    style={{
                                        background: "rgba(59, 130, 246, 0.15)",
                                        border: "1px solid rgba(59, 130, 246, 0.3)",
                                        color: "#60a5fa",
                                        borderRadius: "6px",
                                        padding: "4px 8px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    ⚡ ONNX Benchmark
                                </button>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        className="scan-preview"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="scan-topbar">
                            <div className="live-indicator">
                                <span />
                                LIVE ENVIRONMENT
                            </div>

                            <Camera size={18} />
                        </div>

                        <div className="scan-area">

                            <div className="scan-grid" />

                            <motion.div
                                className="detection-box extinguisher"
                                animate={{ opacity: [0.65, 1, 0.65] }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                }}
                            >
                                <div className="corner top-left" />
                                <div className="corner top-right" />
                                <div className="corner bottom-left" />
                                <div className="corner bottom-right" />

                                <div className="detection-label">
                                    <span>FIRE EXTINGUISHER</span>
                                    <strong>DETECTED</strong>
                                </div>
                            </motion.div>

                            <motion.div
                                className="detection-box obstruction"
                                animate={{ opacity: [0.55, 1, 0.55] }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                }}
                            >
                                <div className="corner top-left" />
                                <div className="corner top-right" />
                                <div className="corner bottom-left" />
                                <div className="corner bottom-right" />

                                <div className="detection-label warning">
                                    <span>ACCESS AREA</span>
                                    <strong>OBSTRUCTED</strong>
                                </div>
                            </motion.div>

                            <motion.div
                                className="scan-line"
                                animate={{
                                    top: ["5%", "95%", "5%"],
                                }}
                                transition={{
                                    duration: 3.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />

                        </div>

                        <div className="scan-results">

                            <div className="result-summary">
                                <div>
                                    <span>VERIFICATION STATUS</span>
                                    <strong>4/5</strong>
                                </div>

                                <div className="issue-count">
                                    <span>ISSUES FOUND</span>
                                    <strong>01</strong>
                                </div>
                            </div>

                            <div className="progress-track">
                                <motion.div
                                    className="progress-fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: "80%" }}
                                    transition={{ duration: 1.2 }}
                                />
                            </div>

                        </div>
                    </motion.div>

                </section>

                <motion.div
                    className="bottom-statement"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <span>POINT.</span>
                    <span>VERIFY.</span>
                    <span>FIX.</span>
                    <span>VERIFY AGAIN.</span>
                </motion.div>

            </div>
        </main>
    );
}