import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import VerifyXHome from "./components/VerifyXHome";
import VerificationSetup from "./components/VerificationSetup";
import LiveScan from "./components/LiveScan";
import VerificationResults from "./components/VerificationResults";
import IssueDetails from "./components/IssueDetails";
import Rescan from "./components/Rescan";
import Verified from "./components/Verified";
import ReportView from "./components/ReportView";

import type { InspectionSession, VerificationCheck } from "./types/verification";
import {
    createInspectionSession,
    applyScanResultsToSession,
    recordRescanResolution,
} from "./rules/inspectionSession";

import "./components/VerifyXHome.css";
import "./components/VerificationSetup.css";
import "./components/LiveScan.css";
import "./components/VerificationResults.css";
import "./components/IssueDetails.css";
import "./components/Rescan.css";
import "./components/Verified.css";
import "./components/ReportView.css";
import { OnnxBenchmark } from "./components/OnnxBenchmark";

type Screen =
    | "home"
    | "setup"
    | "scan"
    | "results"
    | "issue"
    | "rescan"
    | "verified"
    | "report"
    | "benchmark";

const pageVariants: Record<string, { opacity: number; y: number; transition?: { duration: number } }> = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

function App() {
    const [screen, setScreen] = useState<Screen>(() => {
        if (typeof window !== "undefined" && (window.location.search.includes("benchmark") || window.location.hash.includes("benchmark"))) {
            return "benchmark";
        }
        return "home";
    });
    const [startInDemoMode, setStartInDemoMode] = useState<boolean>(false);
    const [session, setSession] = useState<InspectionSession>(() => createInspectionSession("Main Facility Floor"));
    const [beforeFrame, setBeforeFrame] = useState<string>("");
    const [afterFrame, setAfterFrame] = useState<string>("");
    const [reportReturnScreen, setReportReturnScreen] = useState<Screen>("verified");

    const startNewVerification = () => {
        const newSession = createInspectionSession("Main Facility Floor");
        setSession(newSession);
        setBeforeFrame("");
        setAfterFrame("");
        setStartInDemoMode(false);
        setScreen("home");
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={screen}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ width: "100%", minHeight: "100vh" }}
            >
                {/* ─── BENCHMARK ─── */}
                {screen === "benchmark" && (
                    <OnnxBenchmark onBack={() => setScreen("home")} />
                )}

                {/* ─── HOME ─── */}
                {screen === "home" && (
                    <VerifyXHome
                        onStart={() => {
                            setStartInDemoMode(false);
                            setScreen("setup");
                        }}
                        onDatasetDemo={() => {
                            setStartInDemoMode(true);
                            setScreen("scan");
                        }}
                        onBenchmark={() => setScreen("benchmark")}
                    />
                )}

                {/* ─── SETUP ─── */}
                {screen === "setup" && (
                    <VerificationSetup
                        onBack={() => setScreen("home")}
                        onStartScan={() => {
                            setStartInDemoMode(false);
                            setScreen("scan");
                        }}
                    />
                )}

                {/* ─── LIVE SCAN ─── */}
                {screen === "scan" && (
                    <LiveScan
                        initialDemoMode={startInDemoMode}
                        onBack={() => setScreen("setup")}
                        onResults={(data) => {
                            if (data.frameDataUrl) {
                                setBeforeFrame(data.frameDataUrl);
                            }
                            if (data.checks) {
                                const checksList = data.checks;
                                setSession((prev) =>
                                    applyScanResultsToSession(prev, checksList, data.frameDataUrl)
                                );
                            }
                            setScreen("results");
                        }}
                    />
                )}

                {/* ─── RESULTS ─── */}
                {screen === "results" && (
                    <VerificationResults
                        onBack={() => setScreen("scan")}
                        onIssue={() => setScreen("issue")}
                        onRescan={() => setScreen("rescan")}
                        onConfirmManualReview={() => {
                            setSession((prev) => {
                                const updatedChecks = prev.checks.map((c) =>
                                    c.status === "review"
                                        ? {
                                              ...c,
                                              status: "verified" as const,
                                              decision: "PASS" as const,
                                              issueMessage: undefined,
                                              reviewReason: undefined,
                                              detectionLabel: c.detectionLabel
                                                  ? `${c.detectionLabel} (Manually Confirmed)`
                                                  : "Compliant (Manual Review Confirmed)",
                                          }
                                        : c
                                );
                                return {
                                    ...prev,
                                    checks: updatedChecks,
                                    summary: {
                                        ...prev.summary,
                                        verified: updatedChecks.filter((c) => c.status === "verified").length,
                                        reviewRequired: updatedChecks.filter((c) => c.status === "review").length,
                                    },
                                };
                            });
                        }}
                        onReport={() => {
                            setReportReturnScreen("results");
                            setScreen("report");
                        }}
                        checks={session.checks}
                        evidenceFrame={beforeFrame || session.beforeFrame}
                    />
                )}

                {/* ─── ISSUE DETAILS ─── */}
                {screen === "issue" && (
                    <IssueDetails
                        onBack={() => setScreen("results")}
                        onFix={() => setScreen("rescan")}
                        issueCheck={session.checks.find((c) => c.status === "issue")}
                        evidenceFrame={beforeFrame || session.beforeFrame}
                    />
                )}

                {/* ─── RE-SCAN ─── */}
                {screen === "rescan" && (
                    <Rescan
                        beforeFrame={beforeFrame || session.beforeFrame}
                        onBack={() => setScreen("issue")}
                        onComplete={(data) => {
                            if (data.afterFrameDataUrl) {
                                setAfterFrame(data.afterFrameDataUrl);
                            }
                            const pathwayResolvedCheck: VerificationCheck = {
                                id: "check_pathway",
                                ruleId: "rule_pathway",
                                title: "Clear Pathway",
                                description: "Pathway unobstructed; hazard removed upon re-scan",
                                ruleStandard: "OSHA 1910.22 / ISO 45001",
                                status: "verified",
                                decision: "PASS",
                                confidence: 0.96,
                                confidenceTier: "HIGH",
                                detectionLabel: "Pathway Clearance Confirmed (Re-scan)",
                            };
                            setSession((prev) =>
                                recordRescanResolution(
                                    prev,
                                    "rule_pathway",
                                    pathwayResolvedCheck,
                                    data.afterFrameDataUrl
                                )
                            );
                            setScreen("verified");
                        }}
                    />
                )}

                {/* ─── VERIFIED ─── */}
                {screen === "verified" && (
                    <Verified
                        onBack={() => setScreen("home")}
                        onReport={() => {
                            setReportReturnScreen("verified");
                            setScreen("report");
                        }}
                        onNewVerification={startNewVerification}
                        finalChecks={session.checks}
                        beforeFrame={beforeFrame || session.beforeFrame}
                        afterFrame={afterFrame || session.afterFrame}
                    />
                )}

                {/* ─── REPORT ─── */}
                {screen === "report" && (
                    <ReportView
                        onBack={() => setScreen(reportReturnScreen)}
                        onNewVerification={startNewVerification}
                        session={session}
                        checks={session.checks}
                        beforeFrame={beforeFrame || session.beforeFrame}
                        afterFrame={afterFrame || session.afterFrame}
                        verificationId={session.inspectionId}
                        locationLabel={session.locationLabel}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export default App;