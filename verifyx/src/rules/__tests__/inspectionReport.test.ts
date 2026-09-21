/**
 * VERIFYX Phase 12 Automated Test Matrix
 * --------------------------------------
 * Validates the Evidence, Inspection Session, and Report Generation:
 *
 * A. New inspection session
 * B. Five successful checks -> COMPLETE
 * C. One unresolved issue -> REVIEW REQUIRED
 * D. Rescan changes issue to verified -> evidence history preserved
 * E. Low confidence check -> remains unresolved/review
 * F. No evidence -> not PASS
 * G. Report contains correct check count
 * H. Report contains timestamps
 * I. Report contains evidence when available
 * J. Report does not fabricate evidence
 */

import assert from "node:assert/strict";
import type {
    CheckObservation,
    InspectionCheck,
    InspectionSession,
    RuleEvidence,
    VerificationCheck,
} from "../../types/verification";
import {
    createInspectionSession,
    determineSessionStatus,
    calculateSessionSummary,
    applyScanResultsToSession,
    recordRescanResolution,
    getBusinessFriendlyCheckSummary,
} from "../inspectionSession";
import {
    MockOfficeKitTransferAdapter,
    createReportTransferPayload,
} from "../../services/ReportTransferAdapter";

let testsRun = 0;
let testsPassed = 0;

function runTest(name: string, fn: () => void) {
    testsRun++;
    try {
        fn();
        testsPassed++;
        console.log(`  ✓ PASS: ${name}`);
    } catch (err: unknown) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

console.log("==================================================");
console.log("    VERIFYX PHASE 12 EVIDENCE & REPORT TESTS      ");
console.log("==================================================");

// ----------------------------------------------------
// TEST A: New inspection session
// ----------------------------------------------------
runTest("Scenario A: New inspection session initialization", () => {
    const session = createInspectionSession("Zone B Warehouse", "Workplace Safety Inspection");

    assert.ok(session.inspectionId.startsWith("VX-INSP-"), "Inspection ID should start with VX-INSP-");
    assert.ok(session.startTimestamp, "Start timestamp must exist");
    assert.strictEqual(session.completedTimestamp, undefined, "Session should not be completed initially");
    assert.strictEqual(session.inspectionType, "Workplace Safety Inspection");
    assert.strictEqual(session.locationLabel, "Zone B Warehouse");
    assert.strictEqual(session.status, "PARTIAL", "Initial status should be PARTIAL before evaluation");
    assert.strictEqual(session.checks.length, 0, "Initial checks should be empty");
    assert.strictEqual(session.summary.totalChecks, 0);

    // Verify NO GPS data is required or fabricated
    assert.strictEqual((session as unknown as Record<string, unknown>).gps, undefined);
    assert.strictEqual((session as unknown as Record<string, unknown>).latitude, undefined);
});

// ----------------------------------------------------
// TEST B: Five successful checks -> COMPLETE
// ----------------------------------------------------
runTest("Scenario B: Five successful checks -> COMPLETE", () => {
    const checks: VerificationCheck[] = [
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "Mounting & clearance verified",
            ruleStandard: "NFPA 10 / OSHA 1910.157",
            status: "verified",
            decision: "PASS",
            confidence: 0.94,
            confidenceTier: "HIGH",
            timestamp: new Date().toISOString(),
        },
        {
            id: "chk_es",
            ruleId: "rule_exit_sign",
            title: "Emergency Exit Sign",
            description: "Illuminated exit sign in field of view",
            ruleStandard: "OSHA 1910.37",
            status: "verified",
            decision: "PASS",
            confidence: 0.91,
            confidenceTier: "HIGH",
            timestamp: new Date().toISOString(),
        },
        {
            id: "chk_hs",
            ruleId: "rule_hazard_sign",
            title: "Hazard Warning Sign",
            description: "Floor hazard sign present",
            ruleStandard: "OSHA 1910.145",
            status: "verified",
            decision: "PASS",
            confidence: 0.88,
            confidenceTier: "HIGH",
            timestamp: new Date().toISOString(),
        },
        {
            id: "chk_pw",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "Walking corridor free from hazards",
            ruleStandard: "OSHA 1910.22",
            status: "verified",
            decision: "PASS",
            confidence: 0.96,
            confidenceTier: "HIGH",
            timestamp: new Date().toISOString(),
        },
        {
            id: "chk_fa",
            ruleId: "rule_first_aid",
            title: "First Aid Kit",
            description: "Station marked and accessible",
            ruleStandard: "ANSI/ISEA Z308.1",
            status: "verified",
            decision: "PASS",
            confidence: 0.85,
            confidenceTier: "HIGH",
            timestamp: new Date().toISOString(),
        },
    ];

    const initial = createInspectionSession("Sector 4");
    const updated = applyScanResultsToSession(initial, checks, "data:image/jpeg;base64,mockframe");

    assert.strictEqual(updated.status, "COMPLETE", "5/5 verified checks must evaluate to COMPLETE");
    assert.strictEqual(updated.summary.totalChecks, 5);
    assert.strictEqual(updated.summary.verified, 5);
    assert.strictEqual(updated.summary.issues, 0);
    assert.strictEqual(updated.summary.reviewRequired, 0);
    assert.ok(updated.completedTimestamp, "Session should set completedTimestamp when COMPLETE");
});

// ----------------------------------------------------
// TEST C: One unresolved issue -> REVIEW REQUIRED
// ----------------------------------------------------
runTest("Scenario C: One unresolved issue -> REVIEW REQUIRED", () => {
    const checks: VerificationCheck[] = [
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "Mounting & clearance verified",
            ruleStandard: "NFPA 10 / OSHA 1910.157",
            status: "verified",
            decision: "PASS",
            confidence: 0.94,
        },
        {
            id: "chk_es",
            ruleId: "rule_exit_sign",
            title: "Emergency Exit Sign",
            description: "Illuminated exit sign in field of view",
            ruleStandard: "OSHA 1910.37",
            status: "verified",
            decision: "PASS",
            confidence: 0.91,
        },
        {
            id: "chk_hs",
            ruleId: "rule_hazard_sign",
            title: "Hazard Warning Sign",
            description: "Floor hazard sign present",
            ruleStandard: "OSHA 1910.145",
            status: "verified",
            decision: "PASS",
            confidence: 0.88,
        },
        {
            id: "chk_fa",
            ruleId: "rule_first_aid",
            title: "First Aid Kit",
            description: "Station marked and accessible",
            ruleStandard: "ANSI/ISEA Z308.1",
            status: "verified",
            decision: "PASS",
            confidence: 0.85,
        },
        {
            id: "chk_pw",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "Walking corridor obstructed",
            ruleStandard: "OSHA 1910.22",
            status: "issue",
            decision: "ISSUE",
            confidence: 0.89,
            issueMessage: "Chair blocking emergency egress pathway",
            correctiveAction: "Move chair out of marked walkway",
        },
    ];

    const initial = createInspectionSession("Sector 4");
    const updated = applyScanResultsToSession(initial, checks);

    assert.strictEqual(
        updated.status,
        "REVIEW_REQUIRED",
        "4 verified + 1 unresolved issue MUST result in REVIEW_REQUIRED"
    );
    assert.notStrictEqual(updated.status, "COMPLETE", "Must NOT be marked COMPLETE with unresolved issue");
    assert.strictEqual(updated.summary.issues, 1);
    assert.strictEqual(updated.summary.verified, 4);
});

// ----------------------------------------------------
// TEST D: Rescan changes issue to verified -> history preserved
// ----------------------------------------------------
runTest("Scenario D: Rescan changes issue to verified with history preserved", () => {
    const initialEvidence: RuleEvidence = {
        rule: "Clear Pathway",
        ruleId: "rule_pathway",
        detectedClass: "chair",
        confidence: 0.92,
        decision: "ISSUE",
        reason: "Obstruction in primary pathway (62% overlap)",
        boundingBox: { x: 0.35, y: 0.45, width: 0.3, height: 0.4 },
        timestamp: "2026-09-21T17:00:00.000Z",
    };

    const initialChecks: VerificationCheck[] = [
        {
            id: "chk_pw",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "Pathway safety",
            ruleStandard: "OSHA 1910.22",
            status: "issue",
            decision: "ISSUE",
            confidence: 0.92,
            confidenceTier: "HIGH",
            issueMessage: "Chair blocking pathway",
            correctiveAction: "Remove chair from marked walkway",
            evidence: initialEvidence,
        },
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "Extinguisher check",
            ruleStandard: "NFPA 10",
            status: "verified",
            decision: "PASS",
            confidence: 0.95,
        },
    ];

    const session = applyScanResultsToSession(
        createInspectionSession("Main Hall"),
        initialChecks,
        "data:image/jpeg;base64,beforeFrameData"
    );

    assert.strictEqual(session.summary.issues, 1);
    const pathwayCheckBefore = session.checks.find((c) => c.ruleId === "rule_pathway")!;
    assert.strictEqual(pathwayCheckBefore.status, "issue");
    assert.strictEqual(pathwayCheckBefore.rescanCount, 0);

    // Perform Rescan
    const rescanEvidence: RuleEvidence = {
        rule: "Clear Pathway",
        ruleId: "rule_pathway",
        detectedClass: undefined,
        confidence: 0.96,
        decision: "PASS",
        reason: "Pathway clear; no obstructions detected in designated zone",
        timestamp: "2026-09-21T17:05:00.000Z",
    };

    const resolvedCheck: VerificationCheck = {
        id: "chk_pw",
        ruleId: "rule_pathway",
        title: "Clear Pathway",
        description: "Pathway safety",
        ruleStandard: "OSHA 1910.22",
        status: "verified",
        decision: "PASS",
        confidence: 0.96,
        confidenceTier: "HIGH",
        detectionLabel: "Pathway Clearance Confirmed (Re-scan)",
        evidence: rescanEvidence,
    };

    const updatedSession = recordRescanResolution(
        session,
        "rule_pathway",
        resolvedCheck,
        "data:image/jpeg;base64,afterFrameData"
    );

    const pathwayCheckAfter = updatedSession.checks.find((c) => c.ruleId === "rule_pathway")!;

    // 1. Status updated to verified
    assert.strictEqual(pathwayCheckAfter.status, "verified");
    assert.strictEqual(pathwayCheckAfter.decision, "PASS");

    // 2. Rescan count incremented
    assert.strictEqual(pathwayCheckAfter.rescanCount, 1);
    assert.strictEqual(updatedSession.summary.rescans, 1);

    // 3. History is preserved and NOT overwritten
    assert.ok(pathwayCheckAfter.history, "History trail must exist");
    assert.strictEqual(pathwayCheckAfter.history.length, 2, "History must contain both initial and rescan observations");

    const initialObs = pathwayCheckAfter.history[0];
    const rescanObs = pathwayCheckAfter.history[1];

    assert.strictEqual(initialObs.stage, "initial");
    assert.strictEqual(initialObs.decision, "ISSUE");
    assert.strictEqual(initialObs.detectedClass, "chair");

    assert.strictEqual(rescanObs.stage, "rescan");
    assert.strictEqual(rescanObs.decision, "PASS");

    // 4. Before and after frames preserved on session
    assert.strictEqual(updatedSession.beforeFrame, "data:image/jpeg;base64,beforeFrameData");
    assert.strictEqual(updatedSession.afterFrame, "data:image/jpeg;base64,afterFrameData");
});

// ----------------------------------------------------
// TEST E: Low confidence check -> remains unresolved/review
// ----------------------------------------------------
runTest("Scenario E: Low confidence check -> remains unresolved/review", () => {
    const checks: VerificationCheck[] = [
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "Extinguisher check",
            ruleStandard: "NFPA 10",
            status: "review",
            decision: "REVIEW_REQUIRED",
            confidence: 0.42,
            confidenceTier: "LOW",
            reviewReason: "Low confidence detection (0.42); manual inspection recommended",
        },
    ];

    const session = applyScanResultsToSession(createInspectionSession("Warehouse"), checks);

    assert.strictEqual(session.status, "REVIEW_REQUIRED");
    assert.strictEqual(session.summary.reviewRequired, 1);
    assert.strictEqual(session.summary.verified, 0);

    const check = session.checks[0];
    assert.strictEqual(check.status, "review");
    assert.strictEqual(check.decision, "REVIEW_REQUIRED");
    assert.notStrictEqual(check.decision, "PASS", "Low confidence check must not pass");
});

// ----------------------------------------------------
// TEST F: No evidence -> not PASS
// ----------------------------------------------------
runTest("Scenario F: No evidence -> not PASS", () => {
    const checks: VerificationCheck[] = [
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "No fire extinguisher in sight",
            ruleStandard: "NFPA 10",
            status: "pending",
            decision: "NO_DETECTION",
            confidence: 0,
        },
    ];

    const session = applyScanResultsToSession(createInspectionSession("Corridor A"), checks);

    assert.notStrictEqual(session.status, "COMPLETE");
    assert.strictEqual(session.checks[0].decision, "NO_DETECTION");
    assert.notStrictEqual(session.checks[0].decision, "PASS", "No evidence must never evaluate to PASS");
});

// ----------------------------------------------------
// TEST G: Report contains correct check count
// ----------------------------------------------------
runTest("Scenario G: Report contains correct check count", () => {
    const checks: VerificationCheck[] = [
        { id: "1", ruleId: "r1", title: "C1", description: "", ruleStandard: "", status: "verified", confidence: 0.9 },
        { id: "2", ruleId: "r2", title: "C2", description: "", ruleStandard: "", status: "verified", confidence: 0.9 },
        { id: "3", ruleId: "r3", title: "C3", description: "", ruleStandard: "", status: "issue", confidence: 0.8 },
        { id: "4", ruleId: "r4", title: "C4", description: "", ruleStandard: "", status: "review", confidence: 0.5 },
        { id: "5", ruleId: "r5", title: "C5", description: "", ruleStandard: "", status: "pending", confidence: 0 },
    ];

    const summary = calculateSessionSummary(checks);

    assert.strictEqual(summary.totalChecks, 5);
    assert.strictEqual(summary.verified, 2);
    assert.strictEqual(summary.issues, 1);
    assert.strictEqual(summary.reviewRequired, 1);
    assert.strictEqual(summary.pending, 1);
    assert.strictEqual(
        summary.verified + summary.issues + summary.reviewRequired + summary.pending,
        summary.totalChecks
    );
});

// ----------------------------------------------------
// TEST H: Report contains timestamps
// ----------------------------------------------------
runTest("Scenario H: Report contains timestamps", () => {
    const session = createInspectionSession("Floor 3");
    assert.ok(session.startTimestamp, "Session must have startTimestamp");
    assert.ok(!isNaN(Date.parse(session.startTimestamp)), "startTimestamp must be valid ISO date");

    const checks: VerificationCheck[] = [
        {
            id: "chk_1",
            ruleId: "r1",
            title: "Check 1",
            description: "",
            ruleStandard: "",
            status: "verified",
            confidence: 0.95,
        },
    ];
    const updated = applyScanResultsToSession(session, checks);

    assert.ok(updated.checks[0].timestamp, "Check must have timestamp");
    assert.ok(!isNaN(Date.parse(updated.checks[0].timestamp)), "Check timestamp must be valid ISO date");
});

// ----------------------------------------------------
// TEST I: Report contains evidence when available
// ----------------------------------------------------
runTest("Scenario I: Report contains evidence when available", () => {
    const evidence: RuleEvidence = {
        rule: "Fire Extinguisher",
        ruleId: "rule_fire_extinguisher",
        detectedClass: "fire_extinguisher",
        confidence: 0.93,
        boundingBox: { x: 0.12, y: 0.25, width: 0.2, height: 0.5 },
        objectSize: { widthNorm: 0.2, heightNorm: 0.5, areaNorm: 0.1, isTooSmall: false },
        decision: "PASS",
        reason: "Mounted fire extinguisher verified with clear frontal access",
        timestamp: new Date().toISOString(),
    };

    const checks: VerificationCheck[] = [
        {
            id: "chk_fe",
            ruleId: "rule_fire_extinguisher",
            title: "Fire Extinguisher",
            description: "",
            ruleStandard: "",
            status: "verified",
            confidence: 0.93,
            evidence,
            boundingBox: evidence.boundingBox,
        },
    ];

    const session = applyScanResultsToSession(createInspectionSession("Main"), checks, "data:image/jpeg;base64,realFrame");

    const check = session.checks[0];
    assert.ok(check.evidence);
    assert.strictEqual(check.evidence?.detectedClass, "fire_extinguisher");
    assert.strictEqual(check.evidence?.confidence, 0.93);
    assert.ok(check.evidence?.boundingBox);
    assert.strictEqual(check.evidence?.boundingBox?.width, 0.2);
    assert.strictEqual(session.beforeFrame, "data:image/jpeg;base64,realFrame");

    const friendly = getBusinessFriendlyCheckSummary(check);
    assert.ok(friendly.includes("Fire Extinguisher verified"), "Must translate technical detection to business text");
    assert.ok(!friendly.includes("YOLO class 0"), "Must not display raw YOLO class indices to supervisor");
});

// ----------------------------------------------------
// TEST J: Report does not fabricate evidence
// ----------------------------------------------------
runTest("Scenario J: Report does not fabricate evidence", () => {
    const checks: VerificationCheck[] = [
        {
            id: "chk_no_evidence",
            ruleId: "rule_exit_sign",
            title: "Emergency Exit Sign",
            description: "No visual target captured",
            ruleStandard: "OSHA 1910.37",
            status: "pending",
            confidence: 0,
        },
    ];

    const session = applyScanResultsToSession(createInspectionSession("Site A"), checks, undefined);

    // Frame must be undefined, not populated with dummy or fabricated image URL
    assert.strictEqual(session.beforeFrame, undefined);
    assert.strictEqual(session.afterFrame, undefined);

    const check = session.checks[0];
    assert.strictEqual(check.boundingBox, undefined);
    assert.strictEqual(check.evidence?.boundingBox, undefined);

    // Verify Office Kit transfer payload accurately represents absent evidence
    const adapter = new MockOfficeKitTransferAdapter();
    const payload = createReportTransferPayload(session);

    assert.strictEqual(payload.report.evidenceFrameCaptured, false);
    assert.strictEqual(payload.report.rescanFrameCaptured, false);
});

// ----------------------------------------------------
// BONUS: Office Kit Transfer Adapter Verification
// ----------------------------------------------------
runTest("Bonus: Office Kit Adapter mock transfer succeeds", async () => {
    const session = createInspectionSession("Zone C");
    const adapter = new MockOfficeKitTransferAdapter();

    assert.strictEqual(adapter.getAdapterName(), "Office Kit Mock Adapter (Local/Dev)");
    const available = await adapter.isAvailable();
    assert.strictEqual(available, true);

    const transferResult = await adapter.transferReport(session);
    assert.strictEqual(transferResult.success, true);
    assert.ok(transferResult.transferId.startsWith("OK-TX-"));
    assert.strictEqual(transferResult.metadata?.inspectionId, session.inspectionId);
});

console.log("==================================================");
console.log(`TOTAL PHASE 12 TESTS: ${testsRun}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsRun - testsPassed}`);
console.log("==================================================");
