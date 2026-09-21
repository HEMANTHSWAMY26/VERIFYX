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
        description: "Present and accessible",
        icon: Flame,
    },
    {
        id: 2,
        title: "Emergency Exit",
        description: "Accessible and unobstructed",
        icon: DoorOpen,
    },
    {
        id: 3,
        title: "Safety Sign",
        description: "Visible and correctly placed",
        icon: ShieldCheck,
    },
    {
        id: 4,
        title: "Clear Pathway",
        description: "No obstruction in access area",
        icon: Route,
    },
    {
        id: 5,
        title: "Required Equipment",
        description: "Required equipment is present",
        icon: Wrench,
    },
];

export default function VerificationSetup({
    onBack,
    onStartScan,
}: VerificationSetupProps) {
    return (
        <main className="setup-page">
            <div className="setup-container">

                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={18} />
                    Back
                </button>

                <motion.div
                    className="setup-header"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="setup-eyebrow">
                        VERIFICATION PROFILE
                    </span>

                    <h1>Workplace Safety</h1>

                    <p>
                        VERIFYX will inspect the environment against
                        the selected safety requirements.
                    </p>
                </motion.div>

                <section className="checklist-card">

                    <div className="checklist-header">
                        <div>
                            <span className="section-label">
                                ACTIVE CHECKLIST
                            </span>

                            <h2>Safety Standards</h2>
                        </div>

                        <div className="check-count">
                            {checks.length}
                            <span>checks</span>
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
                                    transition={{ delay: index * 0.06 }}
                                >
                                    <div className="check-icon">
                                        <Icon size={20} />
                                    </div>

                                    <div className="check-info">
                                        <strong>{check.title}</strong>
                                        <span>{check.description}</span>
                                    </div>

                                    <div className="check-status">
                                        <Check size={15} />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="setup-footer">

                        <div className="offline-note">
                            <span className="status-dot" />
                            On-device verification
                        </div>

                        <button
                            className="start-scan-button"
                            onClick={onStartScan}
                        >
                            START SCAN
                            <ChevronRight size={20} />
                        </button>

                    </div>

                </section>

            </div>
        </main>
    );
}