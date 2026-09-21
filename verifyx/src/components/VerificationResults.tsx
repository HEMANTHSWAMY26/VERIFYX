import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    AlertTriangle,
    FileText,
    HelpCircle,
    RotateCcw,
    ShieldAlert,
    Clock,
    Info,
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

    let headline = "All requirements satisfied.";
    if (hasIssue) headline = "One issue needs attention.";
    else if (hasReview) headline = "Human review required.";
    else if (hasRescan) headline = "Camera re-scan needed.";
    else if (allPending) headline = "Verification Incomplete (No Valid Detections).";
    else if (hasPending && verifiedCount < totalCount) headline = `${verifiedCount} of ${totalCount} verified. Further inspection required.`;

    return (
        <main className="results-page">
            <div className="results-container">
                <button className="results-back" onClick={onBack}>
                    <ArrowLeft size={18} />
                    Back to Scan
                </button>

                <header className="results-header">
                    <span>VERIFYX / INSPECTION RESULTS</span>
                    <h1>
                        Verification
                        <br />
                        Complete.
                    </h1>
                    <p>
                        On-device AI inspected the environment against
                        workplace safety standards.
                    </p>
                </header>

                <section className="score-card">
                    <div className="score">
                        <strong>{verifiedCount}</strong>
                        <span>/ {totalCount}</span>
                    </div>

                    <div>
                        <span className="score-label">REQUIREMENTS VERIFIED</span>
                        <h2>{headline}</h2>
                    </div>
                </section>

                {/* REVIEW REQUIRED BANNER */}
                {hasReview && (
                    <div className="review-alert-card">
                        <div className="review-alert-title">
                            <HelpCircle size={18} />
                            <span>VERIFYX NEEDS A CLOSER LOOK</span>
                        </div>
                        <p>
                            {reviewCheck?.reviewReason ||
                                "Object detected, but model confidence is in the review range (45%–69%). Automatic verification is held to prevent a false pass."}
                        </p>
                        <div className="review-alert-actions">
                            <button
                                className="confirm-manual-btn"
                                onClick={onConfirmManualReview}
                            >
                                <CheckCircle2 size={16} />
                                CONFIRM COMPLIANT (MANUAL REVIEW)
                            </button>
                            <button
                                className="check-again-btn"
                                onClick={onRescan || onBack}
                            >
                                <RotateCcw size={16} />
                                CHECK AGAIN (RE-SCAN)
                            </button>
                        </div>
                    </div>
                )}

                {/* RESCAN NEEDED BANNER */}
                {hasRescan && !hasReview && (
                    <div className="rescan-alert-card">
                        <div className="rescan-alert-title">
                            <ShieldAlert size={18} />
                            <span>RE-SCAN REQUIRED</span>
                        </div>
                        <p>
                            {rescanCheck?.rescanReason ||
                                "Detection confidence is below reliable threshold (< 45%). Move closer or change camera angle to establish certainty."}
                        </p>
                        <button
                            className="rescan-action-btn"
                            onClick={onRescan || onBack}
                        >
                            <RotateCcw size={16} />
                            RE-SCAN ENVIRONMENT
                        </button>
                    </div>
                )}

                {/* NO DETECTION / INCOMPLETE BANNER */}
                {allPending && !hasIssue && !hasReview && !hasRescan && (
                    <div className="rescan-alert-card no-detection-banner">
                        <div className="rescan-alert-title">
                            <Info size={18} />
                            <span>VERIFICATION INCOMPLETE — NO EVIDENCE IN VIEW</span>
                        </div>
                        <p>
                            No relevant corridor obstructions or supported safety fixtures were detected in view.
                            VERIFYX requires positive verified evidence to establish compliance.
                        </p>
                        <button
                            className="rescan-action-btn"
                            onClick={onBack}
                        >
                            <RotateCcw size={16} />
                            CONTINUE SCANNING
                        </button>
                    </div>
                )}

                {/* CAPTURED EVIDENCE FRAME */}
                {evidenceFrame && (
                    <section className="evidence-preview-card">
                        <div className="evidence-preview-header">
                            <span>CAPTURED EVIDENCE FRAME</span>
                            <span className="evidence-tag">LOCAL OFFLINE FRAME</span>
                        </div>
                        <div className="evidence-thumbnail-wrapper">
                            <img
                                src={evidenceFrame}
                                alt="Captured scan evidence"
                                className="evidence-thumbnail-img"
                            />
                        </div>
                    </section>
                )}

                {/* CHECKLIST BREAKDOWN */}
                <section className="results-list">
                    <div className="results-list-header">
                        <span>VERIFICATION CHECKS & CONFIDENCE TIERS</span>
                        <strong>{totalCount} TOTAL</strong>
                    </div>

                    {checks.map((check) => {
                        const isIssue = check.status === "issue";
                        const isReview = check.status === "review";
                        const isRescan = check.status === "rescan";
                        const isPending = check.status === "pending" || check.status === "not_supported";

                        const rowClass = isIssue
                            ? "result-row issue"
                            : isReview
                            ? "result-row review"
                            : isRescan
                            ? "result-row rescan"
                            : isPending
                            ? "result-row pending"
                            : "result-row";

                        return (
                            <div className={rowClass} key={check.id || check.title}>
                                <div className="result-icon">
                                    {isIssue ? (
                                        <AlertTriangle size={19} />
                                    ) : isReview ? (
                                        <HelpCircle size={19} />
                                    ) : isRescan ? (
                                        <RotateCcw size={19} />
                                    ) : isPending ? (
                                        <Clock size={19} />
                                    ) : (
                                        <CheckCircle2 size={19} />
                                    )}
                                </div>

                                <div className="result-info">
                                    <strong>{check.title}</strong>
                                    <span>
                                        {check.issueMessage ||
                                            check.reviewReason ||
                                            check.rescanReason ||
                                            (isPending
                                                ? check.description || "Awaiting verified evidence"
                                                : `Verified compliant (${Math.round(check.confidence * 100)}% conf · ${check.confidenceTier || "HIGH"})`)}
                                    </span>
                                </div>

                                <div className="result-status">
                                    {isIssue
                                        ? "ISSUE"
                                        : isReview
                                        ? "REVIEW"
                                        : isRescan
                                        ? "RE-SCAN"
                                        : isPending
                                        ? "PENDING"
                                        : "PASS"}
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* ACTION BUTTONS */}
                <section className="results-actions">
                    {hasIssue && (
                        <button className="issue-button" onClick={onIssue}>
                            <AlertTriangle size={18} />
                            VIEW ISSUE
                            <ChevronRight size={18} />
                        </button>
                    )}

                    <button className="report-button" onClick={onReport}>
                        <FileText size={18} />
                        VIEW REPORT
                    </button>
                </section>
            </div>
        </main>
    );
}