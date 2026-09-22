import { motion } from "framer-motion";
import {
    ArrowLeft,
    Check,
    ChevronRight,
    DoorOpen,
    Flame,
    Route,
    ShieldCheck,
    Wrench,
    Zap,
} from "lucide-react";
import "./VerificationSetup.css";

interface VerificationSetupProps {
    onBack: () => void;
    onStartScan: () => void;
}

const checks = [
    {
        id: 1,
        title: "Fire Extinguisher",
        standard: "OSHA 1910.157",
        description: "Wall-mounted, unobstructed, visible within 20m zone",
        icon: Flame,
    },
    {
        id: 2,
        title: "Emergency Exit Sign",
        standard: "OSHA 1910.37",
        description: "Illuminated / reflective egress indicator directly visible",
        icon: DoorOpen,
    },
    {
        id: 3,
        title: "Hazard Warning Sign",
        standard: "ANSI Z535 / ISO 7010",
        description: "Caution/warning placard mounted at designated hazard zone",
        icon: ShieldCheck,
    },
    {
        id: 4,
        title: "Clear Pathway",
        standard: "OSHA 1910.22",
        description: "Walking-working surface free of boxes, carts, and obstructions",
        icon: Route,
    },
    {
        id: 5,
        title: "Required Safety Equipment",
        standard: "Facility Protocol",
        description: "Designated first aid, AED, or safety station present in area",
        icon: Wrench,
    },
];

const stages = [
    { num: "01", label: "POINT", desc: "Target area with phone camera" },
    { num: "02", label: "VERIFY", desc: "On-device AI evaluates spatial rules" },
    { num: "03", label: "FIX", desc: "Remediate flagged non-compliances" },
    { num: "04", label: "VERIFY AGAIN", desc: "Instant closed-loop re-scan proof" },
];

export default function VerificationSetup({
    onBack,
    onStartScan,
}: VerificationSetupProps) {
    return (
        <main className="setup-page">
            <div className="setup-container">

                {/* BACK BUTTON */}
                <motion.button
                    className="back-button"
                    onClick={onBack}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                </motion.button>

                {/* SETUP HEADER */}
                <header className="setup-header">
                    <motion.div
                        className="setup-eyebrow-line"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="eyebrow-accent-tag">INSPECTION PROFILE</span>
                        <span className="profile-badge">ZONE C · ACTIVE</span>
                    </motion.div>

                    <div className="header-flex">
                        <motion.h1
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.05 }}
                        >
                            WORKPLACE SAFETY
                        </motion.h1>

                        <motion.div
                            className="checks-counter-pill"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.1 }}
                        >
                            <span className="count-number">5</span>
                            <span className="count-label">CHECKS</span>
                        </motion.div>
                    </div>

                    <motion.p
                        className="setup-lead"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.12 }}
                    >
                        Real-time AI physical verification against regulatory workplace safety standards.
                    </motion.p>
                </header>

                {/* THE 4 VERIFYX STAGES — SEQUENTIAL MOTION */}
                <motion.section
                    className="stages-carousel-card"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.09,
                                delayChildren: 0.18,
                            },
                        },
                    }}
                >
                    <div className="stages-label-bar">
                        <span>THE VERIFYX WORKFLOW</span>
                        <span className="stages-sub">CLOSED-LOOP INSPECTION</span>
                    </div>

                    <div className="stages-grid">
                        {stages.map((stage, idx) => (
                            <motion.div
                                key={stage.num}
                                className={`stage-step-item ${idx === 3 ? "highlight" : ""}`}
                                variants={{
                                    hidden: { opacity: 0, y: 14 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="step-header">
                                    <span className="step-num">{stage.num}</span>
                                    {idx < 3 && <span className="step-arrow">→</span>}
                                </div>
                                <strong className="step-title">{stage.label}</strong>
                                <span className="step-desc">{stage.desc}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ACTIVE STANDARDS CHECKLIST CARD */}
                <motion.section
                    className="checklist-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    <div className="checklist-card-header">
                        <div>
                            <span className="checklist-eyebrow">STANDARDS TO EVALUATE</span>
                            <h2>Mandatory Physical Checks</h2>
                        </div>
                        <div className="model-chip">
                            <Zap size={13} />
                            <span>YOLO11n + SPATIAL ENGINE</span>
                        </div>
                    </div>

                    <div className="checks-list">
                        {checks.map((check, index) => {
                            const Icon = check.icon;

                            return (
                                <motion.div
                                    key={check.id}
                                    className="check-row"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.35 + index * 0.05 }}
                                >
                                    <div className="check-icon-wrap">
                                        <Icon size={18} />
                                    </div>

                                    <div className="check-meta">
                                        <div className="check-title-row">
                                            <strong>{check.title}</strong>
                                            <span className="check-standard-tag">{check.standard}</span>
                                        </div>
                                        <span className="check-desc-text">{check.description}</span>
                                    </div>

                                    <div className="check-ready-badge" title="Ready to inspect">
                                        <Check size={14} />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* FOOTER CTA */}
                    <div className="setup-footer">
                        <div className="offline-pill">
                            <span className="status-dot-pulse" />
                            <span>ON-DEVICE DETERMINISTIC EVALUATION</span>
                        </div>

                        <button
                            className="start-scan-button"
                            onClick={onStartScan}
                            id="btn-start-scan"
                        >
                            <span>START SCAN</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </motion.section>

            </div>
        </main>
    );
}