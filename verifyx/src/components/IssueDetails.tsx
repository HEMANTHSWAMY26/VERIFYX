import { motion } from "framer-motion";
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    ScanLine,
    Info,
    ArrowRight,
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

    return (
        <main className="issue-page">
            <div className="issue-container">
                {/* BACK */}
                <button className="issue-back-btn" onClick={onBack}>
                    <ArrowLeft size={18} />
                    Back to Results
                </button>

                {/* HEADER */}
                <motion.header
                    className="issue-page-header"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="issue-meta-tags">
                        <span className="issue-tag red">
                            <ShieldAlert size={14} />
                            COMPLIANCE ISSUE DETECTED
                        </span>
                        <span className="issue-tag neutral">RULE-SAFE-05</span>
                    </div>

                    <h1>{title}</h1>
                    <p className="issue-lead">{issueMessage}</p>
                </motion.header>

                {/* EVIDENCE FRAME WITH BOUNDING HUD */}
                <section className="issue-evidence-panel">
                    <div className="evidence-panel-header">
                        <div className="panel-title">
                            <ScanLine size={16} />
                            <span>CAPTURED EVIDENCE & SPATIAL ANNOTATION</span>
                        </div>
                        <span className="confidence-pill">{confidence}% MEASURED CONFIDENCE</span>
                    </div>

                    <div className="evidence-frame-viewport">
                        {evidenceFrame ? (
                            <img
                                src={evidenceFrame}
                                alt="Captured evidence"
                                className="evidence-media-img"
                            />
                        ) : (
                            <div className="evidence-fallback">
                                <div className="fallback-grid" />
                                <div className="fallback-box">
                                    <div className="box-badge">OBSTRUCTION 93%</div>
                                </div>
                            </div>
                        )}

                        {/* Overlay telemetry bar */}
                        <div className="telemetry-bar">
                            <span>COORDINATES: X: 38% · Y: 58% · W: 28% · H: 32%</span>
                            <span>STATUS: NON-COMPLIANT</span>
                        </div>
                    </div>
                </section>

                {/* RULE ANALYSIS & ROOT CAUSE */}
                <div className="issue-details-grid">
                    <section className="rule-card">
                        <div className="card-label">
                            <Info size={15} />
                            REGULATORY REQUIREMENT
                        </div>
                        <h3>{standard}</h3>
                        <p>
                            Workplace walking-working surfaces and designated access routes must
                            remain clear of hazardous obstacles, equipment, clutter, and trip
                            hazards to maintain continuous safe passage.
                        </p>
                    </section>

                    <section className="fix-guide-card">
                        <div className="card-label warning">
                            <AlertTriangle size={15} />
                            REQUIRED CORRECTIVE ACTION
                        </div>
                        <ul className="action-steps">
                            <li>
                                <span className="step-num">1</span>
                                <div>
                                    <strong>Remove physical obstruction</strong>
                                    <span>Clear boxes, carts, and equipment from the designated path.</span>
                                </div>
                            </li>
                            <li>
                                <span className="step-num">2</span>
                                <div>
                                    <strong>Verify clearance zone</strong>
                                    <span>Ensure at least 1.0 meter of unobstructed lateral width.</span>
                                </div>
                            </li>
                            <li>
                                <span className="step-num">3</span>
                                <div>
                                    <strong>Perform re-scan</strong>
                                    <span>Point camera at the cleared corridor to prove compliance.</span>
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>

                {/* ACTION BUTTON */}
                <section className="issue-bottom-bar">
                    <button className="reverify-action-btn" onClick={onFix}>
                        <CheckCircle2 size={19} />
                        FIX ISSUE & RE-SCAN
                        <ArrowRight size={18} />
                    </button>
                </section>
            </div>
        </main>
    );
}
