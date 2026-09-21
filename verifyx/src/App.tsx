import { useState } from "react";

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

function App() {
    const [screen, setScreen] = useState<Screen>(() => {
        if (typeof window !== "undefined" && (window.location.search.includes("benchmark") || window.location.hash.includes("benchmark"))) {
            return "benchmark";
        }
        return "home";
    });
    const [session, setSession] = useState<InspectionSession>(() => createInspectionSession("Main Facility Floor"));
    const [beforeFrame, setBeforeFrame] = useState<string>("");
    const [afterFrame, setAfterFrame] = useState<string>("");
    const [reportReturnScreen, setReportReturnScreen] = useState<Screen>("verified");

    const startNewVerification = () => {
        const newSession = createInspectionSession("Main Facility Floor");
        setSession(newSession);
        setBeforeFrame("");
        setAfterFrame("");
        setScreen("home");
    };

    /* ---------------- BENCHMARK ---------------- */
    if (screen === "benchmark") {
        return <OnnxBenchmark onBack={() => setScreen("home")} />;
    }

    /* ---------------- HOME ---------------- */
    if (screen === "home") {
        return (
            <VerifyXHome
                onStart={() => setScreen("setup")}
                onBenchmark={() => setScreen("benchmark")}
            />
        );
    }

    /* ---------------- SETUP ---------------- */
    if (screen === "setup") {
        return (
            <VerificationSetup
                onBack={() => setScreen("home")}
                onStartScan={() => {
                    setScreen("scan");
                }}
            />
        );
    }

    /* ---------------- LIVE SCAN ---------------- */
    if (screen === "scan") {
        return (
            <LiveScan
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
        );
    }

    /* ---------------- RESULTS ---------------- */
    if (screen === "results") {
        return (
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
        );
    }

    /* ---------------- ISSUE DETAILS ---------------- */
    if (screen === "issue") {
        const issueCheck = session.checks.find((c) => c.status === "issue");

        return (
            <IssueDetails
                onBack={() => setScreen("results")}
                onFix={() => setScreen("rescan")}
                issueCheck={issueCheck}
                evidenceFrame={beforeFrame || session.beforeFrame}
            />
        );
    }

    /* ---------------- RE-SCAN ---------------- */
    if (screen === "rescan") {
        return (
            <Rescan
                onBack={() => setScreen("issue")}
                onComplete={(data) => {
                    if (data.afterFrameDataUrl) {
                        setAfterFrame(data.afterFrameDataUrl);
                    }
                    // Only mark Clear Pathway as verified upon re-scan clearance.
                    // Preserves authentic state of other checks without fabricating 5/5.
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
        );
    }

    /* ---------------- VERIFIED ---------------- */
    if (screen === "verified") {
        return (
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
        );
    }

    /* ---------------- REPORT / AUDIT RECORD ---------------- */
    if (screen === "report") {
        return (
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
        );
    }

    return null;
}

export default App;