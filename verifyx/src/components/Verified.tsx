import { motion } from "framer-motion";
import {
    CheckCircle2,
    FileText,
    RotateCcw,
    ShieldCheck,
    ArrowRight,
    Flame,
    DoorOpen,
    AlertCircle,
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

const checkIcons: Record<string, React.ElementType> = {
    rule_extinguisher: Flame,
    rule_exit: DoorOpen,
    rule_sign: AlertCircle,
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
                {/* TOP BRAND BAR */}
                <div className="verified-top-nav">
                    <span className="verified-brand">
                        VERIFY<span className="brand-accent">X</span>
                    </span>
                    <button className="verified-back-link" onClick={onBack}>
                        <RotateCcw size={14} />
                        Return to Setup
                    </button>
                </div>

                {/* HERO CELEBRATION */}
                <motion.header
                    className="verified-hero"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="verified-shield-glow">
                        <ShieldCheck size={52} className="shield-icon" />
                    </div>

                    <div className="verified-score-pill">
                        <span className="dot-pulse" />
                        {verifiedCount} / {totalCount} REQUIREMENTS COMPLIANT
                    </div>

                    <h1>
                        {isAllVerified ? (
                            <>
                                Environment
                                <br />
                                <span className="text-highlight">Verified.</span>
                            </>
                        ) : (
                            <>
                                Pathway Clearance
                                <br />
                                <span className="text-highlight">Confirmed.</span>
                            </>
                        )}
                    </h1>

                    <p className="verified-lead">
                        {isAllVerified
                            ? "All physical safety standards have been verified and confirmed. The detected pathway obstruction was successfully resolved."
                            : `${verifiedCount} of ${totalCount} requirements verified. Pathway clearance confirmed compliant. Additional rules require dedicated safety model inspection.`}
                    </p>
                </motion.header>

                {/* BEFORE & AFTER EVIDENCE STRIP */}
                {(beforeFrame || afterFrame) && (
                    <section className="evidence-strip-card">
                        <div className="evidence-strip-header">
                            <span>VERIFICATION EVIDENCE LOG (AUDIT READY)</span>
                            <span className="evidence-count-badge">2 FRAMES CAPTURED</span>
                        </div>

                        <div className="evidence-grid">
                            {beforeFrame && (
                                <div className="evidence-item before">
                                    <div className="evidence-tag red">INITIAL SCAN EVIDENCE</div>
                                    <div className="evidence-img-box">
                                        <img src={beforeFrame} alt="Before fix evidence" />
                                    </div>
                                    <span className="evidence-caption">Obstruction Flagged</span>
                                </div>
                            )}

                            {afterFrame && (
                                <div className="evidence-item after">
                                    <div className="evidence-tag green">RE-SCAN EVIDENCE</div>
                                    <div className="evidence-img-box">
                                        <img src={afterFrame} alt="After fix evidence" />
                                    </div>
                                    <span className="evidence-caption">Corridor Cleared & Confirmed</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* VERIFIED CHECKLIST */}
                <section className="verified-checklist-card">
                    <div className="checklist-card-header">
                        <span>STANDARDS AUDIT STATE</span>
                        <strong className={isAllVerified ? "all-pass-badge" : "all-pass-badge pending"}>
                            {isAllVerified ? "100% PASS" : `${verifiedCount}/${totalCount} VERIFIED`}
                        </strong>
                    </div>

                    <div className="checklist-items">
                        {finalChecks.map((check, index) => {
                            const Icon = checkIcons[check.ruleId] || CheckCircle2;
                            const isVerified = check.status === "verified";
                            const confPercent = Math.round(check.confidence * 100);

                            return (
                                <motion.div
                                    key={check.id}
                                    className="verified-row"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                >
                                    <div className="row-icon-box">
                                        <Icon size={18} />
                                    </div>

                                    <div className="row-content">
                                        <div className="row-title-line">
                                            <strong>{check.title}</strong>
                                            {isVerified && confPercent > 0 && (
                                                <span className="conf-tag">{confPercent}% conf</span>
                                            )}
                                        </div>
                                        <span className="row-desc">{check.description}</span>
                                    </div>

                                    <div className={isVerified ? "row-badge" : "row-badge pending"}>
                                        {isVerified ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                PASS
                                            </>
                                        ) : (
                                            "PENDING"
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* PRIMARY ACTIONS */}
                <section className="verified-actions-card">
                    <button className="verified-report-btn" onClick={onReport}>
                        <FileText size={19} />
                        GENERATE AUDIT REPORT
                        <ArrowRight size={18} />
                    </button>

                    <button className="verified-restart-btn" onClick={onNewVerification}>
                        <Camera size={18} />
                        NEW VERIFICATION
                    </button>
                </section>
            </div>
        </main>
    );
}
