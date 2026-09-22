import { motion } from "framer-motion";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    AlertTriangle,
    FileText,
    HelpCircle,
    RotateCcw,
    ShieldAlert,
    Info,
    Camera,
    Flame,
    DoorOpen,
    ShieldCheck,
    Route,
    Wrench,
} from "lucide-react";

import "./VerificationResults.css";

import type { VerificationCheck } from "../types/verification";
import { evaluateInitialScan } from "../rules/safetyRules";

interface VerificationResultsProps {
    onBack: () => void;
    onIssue: () => void;
    onReport: () => void;
    onRescan?: () => void;
    onConfirmManualReview?: () => void;
    checks?: VerificationCheck[];
    evidenceFrame?: string;
}

const defaultEvaluation = evaluateInitialScan();

const ruleIcons: Record<string, React.ElementType> = {
    rule_extinguisher: Flame,
    rule_exit: DoorOpen,
    rule_sign: ShieldCheck,
    rule_pathway: Route,
    rule_equipment: Wrench,
};

export default function VerificationResults({
    onBack,
    onIssue,
    onReport,
    onRescan,
    onConfirmManualReview,
    checks = defaultEvaluation.checks,
    evidenceFrame,
}: VerificationResultsProps) {
    const verifiedCount = checks.filter((c) => c.status === "verified").length;
    const totalCount = checks.length;
    const hasIssue = checks.some((c) => c.status === "issue");
    const hasReview = checks.some((c) => c.status === "review");
    const hasRescan = checks.some((c) => c.status === "rescan");
    const allPending = checks.every((c) => c.status === "pending" || c.status === "not_supported");
    const hasPending = checks.some((c) => c.status === "pending" || c.status === "not_supported");

    const reviewCheck = checks.find((c) => c.status === "review");
    const rescanCheck = checks.find((c) => c.status === "rescan");

    let headline = "All standards satisfied.";
    let subStatus = "VERIFIED COMPLIANT";
    if (hasIssue) {
        headline = "One active compliance issue requires physical fix.";
        subStatus = "ISSUE FLAGGED";
    } else if (hasReview) {
        headline = "Model detected object with moderate confidence (45%–69%).";
        subStatus = "HUMAN REVIEW NEEDED";
    } else if (hasRescan) {
        headline = "Camera distance or angle was outside operational threshold.";
        subStatus = "RE-SCAN NEEDED";
    } else if (allPending) {
        headline = "No verified objects were visible in the scanned corridor.";
        subStatus = "INCOMPLETE";
    } else if (hasPending && verifiedCount < totalCount) {
        headline = `${verifiedCount} of ${totalCount} verified. Further area scan required.`;
        subStatus = "PARTIAL PASS";
    }

    return (
        <main className="results-page">
            <div className="results-container">

                {/* ─── NAVIGATION ───────────────────────────────────────────── */}
                <motion.button
                    className="results-back-btn"
                    onClick={onBack}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Scanner</span>
                </motion.button>

                {/* ─── RESULT HERO SCORE ────────────────────────────────────── */}
                <motion.header
                    className="results-hero"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="hero-top-eyebrow">
                        <span className="eyebrow-tag">PHYSICAL INSPECTION OUTCOME</span>
                        <span className={`status-pill ${hasIssue ? "issue" : hasReview ? "review" : verifiedCount === totalCount ? "pass" : "partial"}`}>
                            {subStatus}
                        </span>
                    </div>

                    <div className="score-hero-display">
                        <div className="score-big-number">
                            <motion.span
                                className="number-current"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                            >
                                {verifiedCount}
                            </motion.span>
                            <span className="number-slash">/</span>
                            <span className="number-total">{totalCount}</span>
                        </div>

                        <div className="score-text-block">
                            <span className="score-label">CHECKS VERIFIED</span>
                            <h2>{headline}</h2>
                        </div>
                    </div>
                </motion.header>

                {/* ─── CONTEXTUAL ALERTS (DRIVEN BY REAL STATE) ─────────────── */}
                {hasReview && (
                    <motion.div
                        className="alert-banner review"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="alert-header">
                            <HelpCircle size={17} />
                            <span>HUMAN REVIEW RECOMMENDED</span>
                        </div>
                        <p>
                            {reviewCheck?.reviewReason ||
                                "Detection confidence is in the review tier (45%–69%). Automated pass held to prevent false compliance."}
                        </p>
                        <div className="alert-actions">
                            <button className="alert-btn primary" onClick={onConfirmManualReview}>
                                <CheckCircle2 size={14} />
                                <span>CONFIRM COMPLIANT (MANUAL REVIEW)</span>
                            </button>
                            <button className="alert-btn secondary" onClick={onRescan || onBack}>
                                <RotateCcw size={14} />
                                <span>RE-SCAN AREA</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {hasRescan && !hasReview && (
                    <motion.div
                        className="alert-banner rescan"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="alert-header">
                            <ShieldAlert size={17} />
                            <span>RE-SCAN REQUIRED · OPERATIONAL THRESHOLD</span>
                        </div>
                        <p>
                            {rescanCheck?.rescanReason ||
                                "Detection confidence or object size was below reliable threshold (< 45% or < 32px). Move closer to confirm."}
                        </p>
                        <button className="alert-btn primary" onClick={onRescan || onBack}>
                            <RotateCcw size={14} />
                            <span>RE-SCAN WITH CAMERA</span>
                        </button>
                    </motion.div>
                )}

                {allPending && !hasIssue && !hasReview && !hasRescan && (
                    <motion.div
                        className="alert-banner pending"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="alert-header">
                            <Info size={17} />
                            <span>INCOMPLETE INSPECTION · NO EVIDENCE IN VIEW</span>
                        </div>
                        <p>
                            No supported safety equipment or pathway obstructions were detected in the frame.
                            Aim camera at designated facility fixtures.
                        </p>
                        <button className="alert-btn primary" onClick={onBack}>
                            <RotateCcw size={14} />
                            <span>CONTINUE SCANNING</span>
                        </button>
                    </motion.div>
                )}

                {/* ─── CAPTURED EVIDENCE FRAME (IF AVAILABLE) ───────────────── */}
                {evidenceFrame && (
                    <motion.section
                        className="evidence-frame-strip"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                    >
                        <div className="strip-header">
                            <div className="strip-title">
                                <Camera size={14} />
                                <span>CAPTURED AUDIT EVIDENCE</span>
                            </div>
                            <span className="strip-tag">OFFLINE LOCAL FRAME</span>
                        </div>
                        <div className="strip-image-wrap">
                            <img src={evidenceFrame} alt="Captured scan evidence" className="strip-img" />
                        </div>
                    </motion.section>
                )}

                {/* ─── STAGGERED CHECKLIST BREAKDOWN ─────────────────────────── */}
                <motion.section
                    className="checklist-breakdown-card"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.06, delayChildren: 0.2 },
                        },
                    }}
                >
                    <div className="checklist-breakdown-header">
                        <span>STANDARDS AUDIT STATUS</span>
                        <span className="total-tag">{totalCount} REQUIREMENTS</span>
                    </div>

                    <div className="results-items-list">
                        {checks.map((check) => {
                            const isIssue = check.status === "issue";
                            const isReview = check.status === "review";
                            const isRescan = check.status === "rescan";
                            const isPending = check.status === "pending" || check.status === "not_supported";
                            const isVerified = check.status === "verified";

                            const Icon = ruleIcons[check.ruleId] || CheckCircle2;

                            let statusBadge = "PASS";
                            let statusClass = "pass";
                            let statusSymbol = "✓";

                            if (isIssue) {
                                statusBadge = "ISSUE";
                                statusClass = "issue";
                                statusSymbol = "!";
                            } else if (isReview) {
                                statusBadge = "REVIEW";
                                statusClass = "review";
                                statusSymbol = "?";
                            } else if (isRescan) {
                                statusBadge = "RE-SCAN";
                                statusClass = "rescan";
                                statusSymbol = "△";
                            } else if (isPending) {
                                statusBadge = "PENDING";
                                statusClass = "pending";
                                statusSymbol = "○";
                            }

                            return (
                                <motion.div
                                    key={check.id || check.title}
                                    className={`result-item-row ${statusClass}`}
                                    variants={{
                                        hidden: { opacity: 0, x: -8 },
                                        visible: { opacity: 1, x: 0 },
                                    }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <div className="item-symbol-wrap">
                                        <span className={`symbol-badge ${statusClass}`}>{statusSymbol}</span>
                                    </div>

                                    <div className="item-icon-box">
                                        <Icon size={16} />
                                    </div>

                                    <div className="item-details">
                                        <div className="item-title-line">
                                            <strong>{check.title}</strong>
                                            {isVerified && check.confidence > 0 && (
                                                <span className="confidence-readout">
                                                    {Math.round(check.confidence * 100)}% conf
                                                </span>
                                            )}
                                        </div>
                                        <span className="item-subtitle">
                                            {check.issueMessage ||
                                                check.reviewReason ||
                                                check.rescanReason ||
                                                (isPending
                                                    ? check.description || "Awaiting verified physical evidence"
                                                    : "Verified compliant with regulatory standard")}
                                        </span>
                                    </div>

                                    <div className={`item-status-pill ${statusClass}`}>
                                        {statusBadge}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* ─── PRIMARY ACTIONS ──────────────────────────────────────── */}
                <motion.section
                    className="results-bottom-actions"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.35 }}
                >
                    {hasIssue && (
                        <button
                            className="action-btn-issue"
                            onClick={onIssue}
                            id="btn-view-issue-details"
                        >
                            <AlertTriangle size={16} />
                            <span>VIEW ISSUE DETAILS</span>
                            <ChevronRight size={16} />
                        </button>
                    )}

                    <button
                        className="action-btn-report"
                        onClick={onReport}
                        id="btn-view-audit-report"
                    >
                        <FileText size={16} />
                        <span>VIEW INSPECTION REPORT</span>
                    </button>
                </motion.section>

            </div>
        </main>
    );
}