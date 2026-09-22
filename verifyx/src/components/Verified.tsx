import { motion } from "framer-motion";
import {
    CheckCircle2,
    FileText,
    RotateCcw,
    ArrowRight,
    Flame,
    DoorOpen,
    ShieldAlert,
    Route,
    Wrench,
    Camera,
} from "lucide-react";
import "./Verified.css";
import type { VerificationCheck } from "../types/verification";
import { evaluateRescan } from "../rules/safetyRules";

interface VerifiedProps {
    onBack: () => void;
    onReport: () => void;
    onNewVerification: () => void;
    finalChecks?: VerificationCheck[];
    beforeFrame?: string;
    afterFrame?: string;
}

const defaultEvaluation = evaluateRescan();

const ruleIcons: Record<string, React.ElementType> = {
    rule_extinguisher: Flame,
    rule_exit: DoorOpen,
    rule_sign: ShieldAlert,
    rule_equipment: Wrench,
    rule_pathway: Route,
};

export default function Verified({
    onBack,
    onReport,
    onNewVerification,
    finalChecks = defaultEvaluation.checks,
    beforeFrame,
    afterFrame,
}: VerifiedProps) {
    const verifiedCount = finalChecks.filter((c) => c.status === "verified").length;
    const totalCount = finalChecks.length;
    const isAllVerified = verifiedCount === totalCount && totalCount > 0;

    return (
        <main className="verified-page">
            <div className="verified-container">

                {/* ─── TOP BRAND BAR ────────────────────────────────────────── */}
                <div className="verified-top-nav">
                    <span className="verified-brand">
                        VERIFY<span className="brand-accent">X</span>
                    </span>
                    <button className="verified-back-link" onClick={onBack}>
                        <RotateCcw size={13} />
                        <span>RETURN TO SETUP</span>
                    </button>
                </div>

                {/* ─── HERO CONFIRMATION ────────────────────────────────────── */}
                <motion.header
                    className="verified-hero"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* RESTRAINED CONFIRMATION ANIMATION (EXPANDING RING + CHECK) */}
                    <div className="checkmark-ring-container">
                        <motion.div
                            className="subtle-ring-pulse"
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: 1.3, opacity: 0 }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        />
                        <div className="checkmark-icon-circle">
                            <motion.svg
                                className="check-svg"
                                width="36"
                                height="36"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#00ff9d"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </motion.svg>
                        </div>
                    </div>

                    <div className="verified-badge-tag">
                        <span className="pulse-dot" />
                        <span>CLOSED-LOOP VERIFICATION COMPLETE</span>
                    </div>

                    <h1 className="verified-title">
                        VERIFIED
                    </h1>

                    <div className="verified-count-statement">
                        <strong>{verifiedCount} / {totalCount} CHECKS PASSED</strong>
                    </div>

                    <p className="verified-supporting-text">
                        All required verification evidence is available.
                    </p>
                </motion.header>

                {/* ─── BEFORE & AFTER EVIDENCE STRIP ─────────────────────────── */}
                {(beforeFrame || afterFrame) && (
                    <motion.section
                        className="evidence-comparison-strip"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.2 }}
                    >
                        <div className="strip-header-bar">
                            <span>VERIFICATION EVIDENCE LOG (AUDIT READY)</span>
                            <span className="strip-badge-count">CLOSED-LOOP PROOF</span>
                        </div>

                        <div className="comparison-frames-grid">
                            {beforeFrame && (
                                <div className="comparison-frame-card before">
                                    <div className="frame-tag-chip issue">INITIAL SCAN EVIDENCE</div>
                                    <div className="frame-media-box">
                                        <img src={beforeFrame} alt="Initial scan evidence" />
                                    </div>
                                    <span className="frame-caption-text">Obstruction Flagged (Rule 4.1)</span>
                                </div>
                            )}

                            {afterFrame && (
                                <div className="comparison-frame-card after">
                                    <div className="frame-tag-chip resolved">RE-SCAN EVIDENCE</div>
                                    <div className="frame-media-box">
                                        <img src={afterFrame} alt="Re-scan confirmed evidence" />
                                    </div>
                                    <span className="frame-caption-text">Corridor Cleared & Confirmed</span>
                                </div>
                            )}
                        </div>
                    </motion.section>
                )}

                {/* ─── STANDARDS AUDIT STATE BREAKDOWN ──────────────────────── */}
                <motion.section
                    className="verified-standards-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.3 }}
                >
                    <div className="standards-card-header">
                        <span>STANDARDS AUDIT STATE</span>
                        <strong className="status-all-pass">
                            {isAllVerified ? "100% COMPLIANT" : `${verifiedCount}/${totalCount} VERIFIED`}
                        </strong>
                    </div>

                    <div className="standards-items-list">
                        {finalChecks.map((check, index) => {
                            const Icon = ruleIcons[check.ruleId] || CheckCircle2;
                            const isVerified = check.status === "verified";
                            const confPercent = Math.round(check.confidence * 100);

                            return (
                                <motion.div
                                    key={check.id || check.title}
                                    className="standard-audit-row"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.25, delay: 0.35 + index * 0.05 }}
                                >
                                    <div className="audit-icon-box">
                                        <Icon size={16} />
                                    </div>

                                    <div className="audit-meta">
                                        <div className="audit-title-line">
                                            <strong>{check.title}</strong>
                                            {isVerified && confPercent > 0 && (
                                                <span className="conf-pill">{confPercent}% conf</span>
                                            )}
                                        </div>
                                        <span className="audit-desc-line">{check.description}</span>
                                    </div>

                                    <div className={isVerified ? "audit-pass-badge" : "audit-pending-badge"}>
                                        {isVerified ? (
                                            <>
                                                <CheckCircle2 size={13} />
                                                <span>PASS</span>
                                            </>
                                        ) : (
                                            "PENDING"
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* ─── PRIMARY ACTIONS ──────────────────────────────────────── */}
                <motion.section
                    className="verified-actions-dock"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.45 }}
                >
                    <button
                        className="btn-view-report-primary"
                        onClick={onReport}
                        id="btn-view-report"
                    >
                        <FileText size={16} />
                        <span>VIEW REPORT</span>
                        <ArrowRight size={16} />
                    </button>

                    <button
                        className="btn-new-inspection-secondary"
                        onClick={onNewVerification}
                        id="btn-new-inspection"
                    >
                        <Camera size={16} />
                        <span>NEW INSPECTION</span>
                    </button>
                </motion.section>

            </div>
        </main>
    );
}
