import { motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Cpu,
    Info,
    ScanLine,
    ShieldAlert,
    Wrench,
} from "lucide-react";
import "./IssueDetails.css";
import type { VerificationCheck } from "../types/verification";

interface IssueDetailsProps {
    onBack: () => void;
    onFix: () => void;
    issueCheck?: VerificationCheck;
    evidenceFrame?: string;
}

export default function IssueDetails({
    onBack,
    onFix,
    issueCheck,
    evidenceFrame,
}: IssueDetailsProps) {
    const title = issueCheck?.title || "Clear Pathway";
    const issueMessage =
        issueCheck?.issueMessage ||
        "Obstruction detected in access pathway corridor (width clearance < 1.0m).";
    const standard =
        issueCheck?.ruleStandard || "OSHA 1910.22 Walking-Working Surfaces Standard";
    const confidence = issueCheck ? Math.round(issueCheck.confidence * 100) : 93;
    const detectedObject = issueCheck?.detectionLabel?.split(" ")[0] || "Chair / Box";

    return (
        <main className="issue-page">
            <div className="issue-container">

                {/* ─── BACK BUTTON ──────────────────────────────────────────── */}
                <motion.button
                    className="issue-back-btn"
                    onClick={onBack}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Results</span>
                </motion.button>

                {/* ─── HEADER ───────────────────────────────────────────────── */}
                <motion.header
                    className="issue-page-header"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="issue-eyebrow-row">
                        <span className="issue-pill-red">
                            <ShieldAlert size={13} />
                            <span>ISSUE DETECTED</span>
                        </span>
                        <span className="issue-pill-neutral">RULE-SAFE-04 · SPATIAL ENGINE</span>
                    </div>

                    <h1 className="issue-main-title">{title}</h1>
                    <p className="issue-summary-lead">{issueMessage}</p>
                </motion.header>

                {/* ─── VISUAL EVIDENCE PANEL ────────────────────────────────── */}
                <motion.section
                    className="evidence-instrument-panel"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="panel-top-telemetry">
                        <div className="telemetry-item">
                            <ScanLine size={14} className="telemetry-icon" />
                            <span>CAPTURED EVIDENCE & BOUNDING RETICLE</span>
                        </div>
                        <div className="confidence-chip">
                            <span>{confidence}% MEASURED CONFIDENCE</span>
                        </div>
                    </div>

                    <div className="evidence-viewport">
                        {evidenceFrame ? (
                            <img
                                src={evidenceFrame}
                                alt="Captured evidence"
                                className="evidence-media-img"
                            />
                        ) : (
                            <div className="evidence-fallback-view">
                                <div className="fallback-technical-grid" />
                                <div className="fallback-annotated-box">
                                    <span className="corner tl" />
                                    <span className="corner tr" />
                                    <span className="corner bl" />
                                    <span className="corner br" />
                                    <div className="box-badge-flag">OBSTRUCTION {confidence}%</div>
                                </div>
                            </div>
                        )}

                        {/* Telemetry Annotation HUD */}
                        <div className="viewport-hud-telemetry">
                            <span>COORDINATES: X: 38% · Y: 58% · W: 28% · H: 32%</span>
                            <span className="flag-text">STATUS: NON-COMPLIANT</span>
                        </div>
                    </div>
                </motion.section>

                {/* ─── PERCEPTION + REASONING = DECISION FORMULA ───────────── */}
                <motion.section
                    className="reasoning-engine-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="reasoning-header">
                        <div className="reasoning-title">
                            <Cpu size={15} />
                            <span>DETERMINISTIC RULE REASONING</span>
                        </div>
                        <span className="reasoning-formula-tag">
                            PERCEPTION + REASONING = DECISION
                        </span>
                    </div>

                    <div className="formula-flow-grid">
                        {/* 1. PERCEPTION */}
                        <div className="formula-node">
                            <div className="node-eyebrow">STEP 1 · OBJECT</div>
                            <strong className="node-value">{detectedObject.toUpperCase()}</strong>
                            <span className="node-caption">Trained YOLO detection</span>
                        </div>

                        <div className="formula-operator">+</div>

                        {/* 2. SPATIAL INTERSECTION */}
                        <div className="formula-node">
                            <div className="node-eyebrow">STEP 2 · SPATIAL</div>
                            <strong className="node-value">PATHWAY OVERLAP</strong>
                            <span className="node-caption">Corridor bounding box IoU &gt; 0</span>
                        </div>

                        <div className="formula-operator">+</div>

                        {/* 3. CONFIDENCE */}
                        <div className="formula-node">
                            <div className="node-eyebrow">STEP 3 · CERTAINTY</div>
                            <strong className="node-value">{confidence}% CONFIDENCE</strong>
                            <span className="node-caption">Exceeds threshold (&gt; 70%)</span>
                        </div>

                        <div className="formula-operator">+</div>

                        {/* 4. REGULATORY RULE */}
                        <div className="formula-node">
                            <div className="node-eyebrow">STEP 4 · STANDARD</div>
                            <strong className="node-value">SPATIAL RULE</strong>
                            <span className="node-caption">OSHA 1910.22 (1.0m Clearance)</span>
                        </div>
                    </div>

                    <div className="decision-resolution-strip">
                        <span className="decision-arrow">↓</span>
                        <div className="decision-outcome">
                            <span className="outcome-label">RESOLVED DECISION:</span>
                            <strong className="outcome-text">POSSIBLE OBSTRUCTION · PHYSICAL FIX REQUIRED</strong>
                        </div>
                    </div>
                </motion.section>

                {/* ─── REGULATORY CONTEXT & CORRECTIVE ACTION ───────────────── */}
                <div className="details-two-columns">
                    {/* STANDARD REQUIREMENTS */}
                    <motion.section
                        className="rule-spec-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.3 }}
                    >
                        <div className="card-top-tag">
                            <Info size={14} />
                            <span>REGULATORY REQUIREMENT</span>
                        </div>
                        <h3>{standard}</h3>
                        <p>
                            Workplace walking-working surfaces and designated access routes must
                            remain clear of hazardous obstacles, equipment, clutter, and trip
                            hazards to maintain continuous safe passage.
                        </p>
                    </motion.section>

                    {/* ACTION STEPS */}
                    <motion.section
                        className="corrective-guide-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.35 }}
                    >
                        <div className="card-top-tag warning">
                            <Wrench size={14} />
                            <span>REQUIRED CORRECTIVE ACTION</span>
                        </div>

                        <ol className="remedy-steps">
                            <li>
                                <span className="step-badge">1</span>
                                <div className="step-text">
                                    <strong>Remove physical obstruction</strong>
                                    <span>Move boxes, chairs, or equipment outside designated boundary.</span>
                                </div>
                            </li>
                            <li>
                                <span className="step-badge">2</span>
                                <div className="step-text">
                                    <strong>Confirm clearance boundary</strong>
                                    <span>Ensure minimum 1.0 meter unobstructed pathway width.</span>
                                </div>
                            </li>
                            <li>
                                <span className="step-badge">3</span>
                                <div className="step-text">
                                    <strong>Execute re-scan proof</strong>
                                    <span>Point camera at cleared area to record audit-ready resolution.</span>
                                </div>
                            </li>
                        </ol>
                    </motion.section>
                </div>

                {/* ─── PRIMARY ACTION: FIX & RESCAN ─────────────────────────── */}
                <motion.section
                    className="issue-cta-dock"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.4 }}
                >
                    <button
                        className="btn-fix-and-rescan"
                        onClick={onFix}
                        id="btn-fix-and-rescan"
                    >
                        <CheckCircle2 size={17} />
                        <span>FIX & RESCAN</span>
                        <ArrowRight size={17} />
                    </button>
                </motion.section>

            </div>
        </main>
    );
}
