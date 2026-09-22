import { motion } from "framer-motion";
import {
    ArrowRight,
    Camera,
    Cpu,
    FlaskConical,
    ShieldCheck,
    WifiOff,
    Zap,
} from "lucide-react";
import "./VerifyXHome.css";

interface VerifyXHomeProps {
    onStart: () => void;
    onDatasetDemo: () => void;
    onBenchmark?: () => void;
}

export default function VerifyXHome({ onStart, onDatasetDemo, onBenchmark }: VerifyXHomeProps) {
    return (
        <main className="verifyx-home">
            <div className="home-ambient-grid" />
            <div className="home-container">

                {/* TOP BRAND & SYSTEM TELEMETRY */}
                <motion.header
                    className="home-nav"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="brand-badge">
                        <span className="brand-logo-text">VERIFY<span className="accent">X</span></span>
                        <span className="brand-version-pill">v2.0 PRO</span>
                    </div>

                    <div className="nav-telemetry">
                        <div className="system-indicator">
                            <span className="status-dot-pulse" />
                            <span>LOCAL AI</span>
                        </div>
                        <div className="system-indicator">
                            <WifiOff size={13} className="indicator-icon" />
                            <span>OFFLINE READY</span>
                        </div>
                        {onBenchmark && (
                            <button
                                className="benchmark-link-btn"
                                onClick={onBenchmark}
                                title="Open ONNX WebGL & WASM Benchmark"
                            >
                                <Zap size={12} />
                                <span>BENCHMARK</span>
                            </button>
                        )}
                    </div>
                </motion.header>

                {/* HERO SECTION */}
                <section className="hero-section">
                    <div className="hero-copy">
                        <motion.div
                            className="system-eyebrow"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.05 }}
                        >
                            <span className="eyebrow-line" />
                            <span>INDUSTRIAL COMPUTER VISION</span>
                        </motion.div>

                        <motion.h1
                            className="hero-headline"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
                                },
                            }}
                        >
                            <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>POINT.</motion.span>
                            <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>VERIFY.</motion.span>
                            <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>FIX.</motion.span>
                            <motion.span className="text-highlight" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                                VERIFY AGAIN.
                            </motion.span>
                        </motion.h1>

                        <motion.p
                            className="hero-description"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.35 }}
                        >
                            AI-powered workplace verification, running locally on your device.
                        </motion.p>

                        <motion.div
                            className="hero-actions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.45 }}
                        >
                            <button
                                className="primary-cta-button"
                                onClick={onStart}
                                id="btn-start-verification"
                            >
                                <span>START VERIFICATION</span>
                                <ArrowRight size={16} className="cta-icon" />
                            </button>

                            <button
                                className="secondary-cta-button"
                                onClick={onDatasetDemo}
                                id="btn-dataset-demo"
                            >
                                <FlaskConical size={16} />
                                <span>DATASET DEMO</span>
                            </button>
                        </motion.div>

                        <motion.div
                            className="trust-strip"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.55 }}
                        >
                            <div className="trust-item">
                                <Cpu size={14} />
                                <span>YOLO11n ONNX</span>
                            </div>
                            <span className="trust-divider">·</span>
                            <div className="trust-item">
                                <ShieldCheck size={14} />
                                <span>Deterministic Rules</span>
                            </div>
                            <span className="trust-divider">·</span>
                            <div className="trust-item">
                                <WifiOff size={14} />
                                <span>Zero Cloud Leakage</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT PREVIEW: ADVANCED VISION INSTRUMENT */}
                    <motion.div
                        className="hero-instrument-preview"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="preview-top-hud">
                            <div className="hud-status">
                                <span className="hud-live-dot" />
                                <span>VISION ENGINE · WASM</span>
                            </div>
                            <div className="hud-meta">
                                <Camera size={14} />
                                <span>1280×720 · ~2 FPS ASYNC</span>
                            </div>
                        </div>

                        <div className="preview-viewfinder">
                            <div className="viewfinder-grid" />

                            {/* RETICLE CORNERS */}
                            <div className="hud-corner tl" />
                            <div className="hud-corner tr" />
                            <div className="hud-corner bl" />
                            <div className="hud-corner br" />

                            {/* SIMULATED OBJECT 1: FIRE EXTINGUISHER */}
                            <motion.div
                                className="hud-bbox bbox-pass"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.6 }}
                            >
                                <div className="bbox-tag pass">
                                    <span className="tag-label">FIRE EXTINGUISHER</span>
                                    <span className="tag-conf">92%</span>
                                    <span className="tag-state">✓ VERIFIED</span>
                                </div>
                            </motion.div>

                            {/* SIMULATED OBJECT 2: CORRIDOR OBSTRUCTION */}
                            <motion.div
                                className="hud-bbox bbox-issue"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.8 }}
                            >
                                <div className="bbox-tag issue">
                                    <span className="tag-label">WALKING CORRIDOR</span>
                                    <span className="tag-conf">93%</span>
                                    <span className="tag-state">! OBSTRUCTION</span>
                                </div>
                            </motion.div>

                            {/* RESTRAINED SCAN BEAM */}
                            <motion.div
                                className="subtle-scan-beam"
                                animate={{ top: ["8%", "90%", "8%"] }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />
                        </div>

                        <div className="preview-bottom-hud">
                            <div className="hud-result">
                                <span className="result-label">VERIFICATION STATE</span>
                                <span className="result-value">4 / 5 CHECKS</span>
                            </div>
                            <div className="hud-issue-indicator">
                                <span className="issue-dot" />
                                <span>1 CORRIDOR ISSUE</span>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* MINIMAL FOOTER */}
                <footer className="home-footer">
                    <div className="footer-stages">
                        <span>POINT</span>
                        <span className="sep">→</span>
                        <span>VERIFY</span>
                        <span className="sep">→</span>
                        <span>FIX</span>
                        <span className="sep">→</span>
                        <span className="highlight">VERIFY AGAIN</span>
                    </div>
                    <div className="footer-copyright">
                        <span>VERIFYX · ZERO CLOUD · ZERO COMPROMISE</span>
                    </div>
                </footer>

            </div>
        </main>
    );
}