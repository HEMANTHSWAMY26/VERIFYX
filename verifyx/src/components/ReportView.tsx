import { useState } from "react";
import {
    AlertTriangle,
    ArrowLeft,
    CameraOff,
    CheckCircle2,
    Clock,
    Download,
    Laptop,
    Printer,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react";
import "./ReportView.css";
import type {
    InspectionCheck,
    InspectionSession,
    InspectionStatus,
    VerificationCheck,
} from "../types/verification";
import {
    determineSessionStatus,
    getBusinessFriendlyCheckSummary,
    calculateSessionSummary,
} from "../rules/inspectionSession";
import { defaultReportTransferAdapter } from "../services/ReportTransferAdapter";

interface ReportViewProps {
    onBack: () => void;
    onNewVerification: () => void;
    session?: InspectionSession;
    checks?: VerificationCheck[];
    beforeFrame?: string;
    afterFrame?: string;
    verificationId?: string;
    locationLabel?: string;
}

export default function ReportView({
    onBack,
    onNewVerification,
    session: propSession,
    checks: propChecks,
    beforeFrame: propBeforeFrame,
    afterFrame: propAfterFrame,
    verificationId: propVerificationId = "VX-INSP-2026-9482",
    locationLabel: propLocation = "Main Facility Walking Corridor",
}: ReportViewProps) {
    const [copied, setCopied] = useState(false);
    const [transferStatus, setTransferStatus] = useState<string>("");

    // Reconcile session: prioritize passed session, or build from individual props
    const checks: InspectionCheck[] = propSession?.checks || (propChecks as InspectionCheck[]) || [];
    const beforeFrame = propSession?.beforeFrame || propBeforeFrame;
    const afterFrame = propSession?.afterFrame || propAfterFrame;
    const verificationId = propSession?.inspectionId || propVerificationId;
    const locationLabel = propSession?.locationLabel || propLocation;
    const inspectionType = propSession?.inspectionType || "Workplace Safety Inspection";

    const dateStr = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    const startTimestamp = propSession?.startTimestamp || `${dateStr} · ${timeStr}`;

    // Compute status and summary dynamically
    const currentStatus: InspectionStatus = propSession?.currentStatus || determineSessionStatus(checks);
    const summary = propSession?.summary || calculateSessionSummary(checks);

    // Identify checks with issues (either currently active or historically recorded and resolved)
    const issueChecks = checks.filter(
        (c) =>
            c.status === "issue" ||
            c.lifecycleState === "RESOLVED" ||
            (c.rescanCount && c.rescanCount > 0) ||
            c.history?.some((h) => h.status === "issue" || h.stage === "rescan")
    );

    const handlePrint = () => {
        window.print();
    };

    const handleOfficeKitTransfer = async () => {
        const fullSession: InspectionSession = propSession || {
            inspectionId: verificationId,
            startTimestamp,
            completionTimestamp: currentStatus === "COMPLETE" ? `${dateStr} · ${timeStr}` : undefined,
            inspectionType,
            locationLabel,
            checks,
            currentStatus,
            beforeFrame,
            afterFrame,
            summary,
        };

        try {
            const result = await defaultReportTransferAdapter.transfer(fullSession);
            setCopied(true);
            setTransferStatus(result.message);
            setTimeout(() => {
                setCopied(false);
                setTransferStatus("");
            }, 4000);
        } catch (err) {
            console.warn("Office Kit transfer warning:", err);
        }
    };

    const handleDownloadJson = () => {
        const exportSession: InspectionSession = propSession || {
            inspectionId: verificationId,
            startTimestamp,
            completionTimestamp: currentStatus === "COMPLETE" ? `${dateStr} · ${timeStr}` : undefined,
            inspectionType,
            locationLabel,
            checks,
            currentStatus,
            beforeFrame,
            afterFrame,
            summary,
        };

        const blob = new Blob([JSON.stringify(exportSession, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${verificationId}-inspection-report.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="report-page">
            <div className="report-container">
                {/* TOOLBAR */}
                <div className="report-toolbar no-print">
                    <button className="report-back-btn" onClick={onBack}>
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="report-toolbar-actions">
                        <button className="tool-btn" onClick={handleOfficeKitTransfer}>
                            {copied ? <CheckCircle2 size={15} color="#00ff9d" /> : <Laptop size={15} />}
                            {copied ? "TRANSFERRED TO OFFICE KIT" : "OFFICE KIT TRANSFER"}
                        </button>

                        <button className="tool-btn" onClick={handleDownloadJson}>
                            <Download size={15} />
                            EXPORT JSON
                        </button>

                        <button className="tool-btn primary" onClick={handlePrint} id="btn-print-report">
                            <Printer size={15} />
                            PRINT REPORT
                        </button>
                    </div>
                </div>

                {/* TRANSFER NOTIFICATION */}
                {transferStatus && (
                    <div className="transfer-toast no-print">
                        <CheckCircle2 size={16} color="#00ff9d" />
                        <span>{transferStatus}</span>
                    </div>
                )}

                {/* AUDIT REPORT DOCUMENT */}
                <article className="audit-document">
                    {/* DOCUMENT HEADER */}
                    <header className="doc-header">
                        <div className="doc-brand-block">
                            <div className="doc-logo">
                                VERIFY<span className="brand-accent">X</span>
                            </div>
                            <span className="doc-type">VERIFYX INSPECTION REPORT</span>
                            <span className="doc-compliance-note">PHYSICAL-WORLD VERIFICATION AUDIT</span>
                        </div>

                        <div className="doc-meta-block">
                            <div className="meta-pair">
                                <span className="meta-k">INSPECTION ID</span>
                                <span className="meta-v highlight">{verificationId}</span>
                            </div>
                            <div className="meta-pair">
                                <span className="meta-k">DATE / TIME</span>
                                <span className="meta-v">{startTimestamp}</span>
                            </div>
                            <div className="meta-pair">
                                <span className="meta-k">INSPECTION TYPE</span>
                                <span className="meta-v">{inspectionType}</span>
                            </div>
                            {locationLabel && (
                                <div className="meta-pair">
                                    <span className="meta-k">LOCATION</span>
                                    <span className="meta-v">{locationLabel}</span>
                                </div>
                            )}
                            <div className="meta-pair">
                                <span className="meta-k">STATUS</span>
                                <span className={`status-pill ${currentStatus.toLowerCase()}`}>
                                    {currentStatus === "COMPLETE"
                                        ? "COMPLETE"
                                        : currentStatus === "REVIEW_REQUIRED"
                                        ? "REVIEW REQUIRED"
                                        : "PARTIAL"}
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* DISCLAIMER BANNER */}
                    <aside className="doc-disclaimer-banner">
                        <AlertTriangle size={15} />
                        <span>
                            <strong>Notice:</strong> This prototype rule engine is not a certified workplace safety compliance system.
                            All observations reflect camera-based automated rule checks against reference guidance.
                        </span>
                    </aside>

                    {/* SUMMARY METRICS SECTION */}
                    <section className="doc-section">
                        <h3 className="section-title">SUMMARY</h3>
                        <div className="report-summary-grid">
                            <div className="summary-metric-card">
                                <span className="metric-label">TOTAL CHECKS</span>
                                <strong className="metric-value">{summary.totalChecks}</strong>
                            </div>
                            <div className="summary-metric-card highlight-pass">
                                <span className="metric-label">VERIFIED</span>
                                <strong className="metric-value">{summary.verifiedCount}</strong>
                            </div>
                            <div className={`summary-metric-card ${summary.issuesCount > 0 ? "highlight-issue" : ""}`}>
                                <span className="metric-label">ISSUES</span>
                                <strong className="metric-value">{summary.issuesCount}</strong>
                            </div>
                            <div className={`summary-metric-card ${summary.reviewCount > 0 ? "highlight-review" : ""}`}>
                                <span className="metric-label">REVIEW REQUIRED</span>
                                <strong className="metric-value">{summary.reviewCount}</strong>
                            </div>
                            <div className="summary-metric-card">
                                <span className="metric-label">RESCANS</span>
                                <strong className="metric-value">{summary.rescanCount}</strong>
                            </div>
                        </div>
                    </section>

                    {/* OVERALL VERDICT BANNER */}
                    <section className="doc-verdict-banner">
                        <div className="verdict-score-box">
                            <strong>{summary.verifiedCount} / {summary.totalChecks}</strong>
                            <span>{currentStatus === "COMPLETE" ? "VERIFIED" : "AUDITED"}</span>
                        </div>

                        <div className="verdict-details">
                            <div className="verdict-title-row">
                                <h2>
                                    {currentStatus === "COMPLETE"
                                        ? "ALL REQUIREMENTS VERIFIED"
                                        : currentStatus === "REVIEW_REQUIRED"
                                        ? "SUPERVISOR REVIEW REQUIRED"
                                        : "INSPECTION PARTIAL — FURTHER INSPECTION NEEDED"}
                                </h2>
                                <span className={`badge-resolved ${currentStatus === "COMPLETE" ? "" : "pending"}`}>
                                    {currentStatus === "COMPLETE" ? <ShieldCheck size={14} /> : <Clock size={14} />}
                                    {currentStatus === "COMPLETE" ? "ALL CHECKS SATISFIED" : "ACTION / REVIEW REQUIRED"}
                                </span>
                            </div>
                            <p>
                                {currentStatus === "COMPLETE"
                                    ? "All workplace safety inspection standards have been evaluated with verified evidence. Any identified access corridor obstructions were resolved and verified via camera re-scan."
                                    : currentStatus === "REVIEW_REQUIRED"
                                    ? "Inspection detected one or more items requiring attention or moderate confidence review. Automatic certified completion is held to prevent a false pass."
                                    : "Inspection is partial. Point camera at workplace fixtures and access corridor to complete required observations."}
                            </p>
                        </div>
                    </section>

                    {/* CHECK RESULTS TABLE */}
                    <section className="doc-section">
                        <h3 className="section-title">CHECK RESULTS</h3>
                        <table className="doc-table">
                            <thead>
                                <tr>
                                    <th>CHECK</th>
                                    <th>STATUS</th>
                                    <th>EVIDENCE</th>
                                    <th>CONFIDENCE</th>
                                    <th>REASON</th>
                                    <th>TIMESTAMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {checks.map((c) => {
                                    const isIssue = c.status === "issue";
                                    const isReview = c.status === "review";
                                    const isRescan = c.status === "rescan";
                                    const isPending = c.status === "pending" || c.status === "not_supported";
                                    const reasonText = getBusinessFriendlyCheckSummary(c);

                                    return (
                                        <tr key={c.id}>
                                            <td>
                                                <strong>{c.title}</strong>
                                                <div style={{ fontSize: "11px", color: "#8a9692" }}>{c.ruleStandard}</div>
                                            </td>
                                            <td>
                                                <span
                                                    className={`table-pass-badge ${
                                                        isIssue
                                                            ? "issue"
                                                            : isReview
                                                            ? "review"
                                                            : isRescan
                                                            ? "rescan"
                                                            : isPending
                                                            ? "pending"
                                                            : "pass"
                                                    }`}
                                                >
                                                    {isIssue ? (
                                                        "ISSUE"
                                                    ) : isReview ? (
                                                        "REVIEW"
                                                    ) : isRescan ? (
                                                        "RE-SCAN"
                                                    ) : isPending ? (
                                                        "PENDING"
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 size={12} />
                                                            PASS
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                {c.evidence?.boundingBox ? (
                                                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                                                        Box localized (W: {Math.round(c.evidence.boundingBox.width * 100)}%, H: {Math.round(c.evidence.boundingBox.height * 100)}%)
                                                        {c.spatialOverlap !== undefined && ` · ${Math.round(c.spatialOverlap * 100)}% corridor overlap`}
                                                    </span>
                                                ) : c.confidence > 0 ? (
                                                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Feature activation verified</span>
                                                ) : (
                                                    <span style={{ fontSize: "11px", color: "#71717a" }}>Awaiting visual localization</span>
                                                )}
                                            </td>
                                            <td>
                                                {c.confidence > 0 ? (
                                                    <>
                                                        <strong>{Math.round(c.confidence * 100)}%</strong>
                                                        <span style={{ fontSize: "10px", color: "#889691", marginLeft: "4px" }}>
                                                            ({c.confidenceTier || "HIGH"})
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span style={{ color: "#71717a" }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ maxWidth: "240px", fontSize: "12px", lineHeight: "1.4" }}>
                                                {reasonText}
                                            </td>
                                            <td style={{ fontSize: "11px", color: "#889691", whiteSpace: "nowrap" }}>
                                                {c.timestamp || startTimestamp}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </section>

                    {/* ISSUES SECTION */}
                    {issueChecks.length > 0 && (
                        <section className="doc-section">
                            <h3 className="section-title">ISSUES</h3>
                            <div className="issues-trail-list">
                                {issueChecks.map((issue) => {
                                    const initialEvidenceText =
                                        issue.initialEvidence?.reason ||
                                        issue.history?.find((h) => h.stage === "initial_scan")?.message ||
                                        issue.issueMessage ||
                                        "Obstruction candidate observed overlapping designated walking corridor.";
                                    const actionText =
                                        issue.correctiveAction ||
                                        "Remove physical item from access corridor and verify at least 1.0m width clearance.";
                                    const rescanStatusText =
                                        (issue.rescanCount || 0) > 0
                                            ? `Re-scan completed (${issue.rescanCount} observation)`
                                            : "Awaiting physical correction & re-scan";
                                    const finalResultText =
                                        issue.status === "verified"
                                            ? "Cleared & Verified Compliant"
                                            : issue.status === "review"
                                            ? "Pending Human Review"
                                            : "Issue Unresolved";

                                    return (
                                        <div key={issue.id} className="issue-trail-card">
                                            <div className="issue-trail-header">
                                                <div className="issue-trail-title">
                                                    {issue.status === "verified" ? (
                                                        <CheckCircle2 size={16} color="#00ff9d" />
                                                    ) : (
                                                        <ShieldAlert size={16} color="#ff4f5e" />
                                                    )}
                                                    <strong>Issue: {issue.title}</strong>
                                                </div>
                                                <span className={`issue-state-badge ${issue.status === "verified" ? "resolved" : "open"}`}>
                                                    {issue.status === "verified" ? "RESOLVED" : "OPEN"}
                                                </span>
                                            </div>
                                            <div className="issue-trail-grid">
                                                <div className="issue-step">
                                                    <span className="step-label">INITIAL EVIDENCE</span>
                                                    <p>{initialEvidenceText}</p>
                                                </div>
                                                <div className="issue-step">
                                                    <span className="step-label">RECOMMENDED ACTION</span>
                                                    <p>{actionText}</p>
                                                </div>
                                                <div className="issue-step">
                                                    <span className="step-label">RESCAN STATUS</span>
                                                    <p>{rescanStatusText}</p>
                                                </div>
                                                <div className="issue-step">
                                                    <span className="step-label">FINAL RESULT</span>
                                                    <p className={issue.status === "verified" ? "result-pass" : "result-issue"}>
                                                        {finalResultText}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* EVIDENCE SECTION */}
                    <section className="doc-section">
                        <h3 className="section-title">EVIDENCE</h3>
                        <div className="doc-evidence-grid">
                            {/* INITIAL SCAN EVIDENCE */}
                            <div className="doc-evidence-card">
                                <div className="card-badge violation">INITIAL SCAN EVIDENCE</div>
                                {beforeFrame ? (
                                    <>
                                        <div className="card-img-wrap">
                                            <img src={beforeFrame} alt="Initial scan frame" />
                                        </div>
                                        <div className="card-caption">
                                            <strong>Observation:</strong> Localized bounding box capture at initial scan.
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-evidence-fallback">
                                        <CameraOff size={28} />
                                        <span>Visual evidence not captured.</span>
                                    </div>
                                )}
                            </div>

                            {/* RE-SCAN EVIDENCE */}
                            <div className="doc-evidence-card">
                                <div className="card-badge verified">FINAL RE-SCAN EVIDENCE</div>
                                {afterFrame ? (
                                    <>
                                        <div className="card-img-wrap">
                                            <img src={afterFrame} alt="Re-scan frame" />
                                        </div>
                                        <div className="card-caption">
                                            <strong>Observation:</strong> Pathway verified unobstructed upon re-scan.
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-evidence-fallback">
                                        <CameraOff size={28} />
                                        <span>Visual evidence not captured.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* SIGN-OFF FOOTER */}
                    <footer className="doc-footer">
                        <div className="sign-block">
                            <span className="sign-label">VERIFIED BY</span>
                            <span className="sign-value">VERIFYX Autonomous Vision Agent</span>
                        </div>
                        <div className="sign-block">
                            <span className="sign-label">AUDIT PLATFORM</span>
                            <span className="sign-value">On-Device Offline Rules Engine</span>
                        </div>
                        <div className="sign-block right">
                            <span className="sign-label">DIGITAL AUDIT HASH</span>
                            <span className="sign-value mono">SHA256: 8f9b2a...e71c</span>
                        </div>
                    </footer>
                </article>

                {/* BOTTOM ACTIONS */}
                <div className="report-bottom-bar no-print">
                    <button className="new-verify-btn" onClick={onNewVerification}>
                        <RotateCcw size={16} />
                        START NEW VERIFICATION
                    </button>
                </div>
            </div>
        </main>
    );
}
