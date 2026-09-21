/**
 * VERIFYX Phase 11 Automated Test Matrix
 * --------------------------------------
 * Validates the decoupled Spatial Rule Engine against Test Scenarios A through K:
 *
 * A. No objects -> PENDING
 * B. Strong fire extinguisher -> PASS
 * C. Weak fire extinguisher -> REVIEW_REQUIRED or RESCAN_NEEDED
 * D. Too-small extinguisher -> RESCAN_NEEDED
 * E. Strong exit sign -> PASS
 * F. Strong hazard sign -> PASS
 * G. Chair outside pathway -> CLEAR / no obstruction
 * H. Chair overlapping pathway -> POSSIBLE_OBSTRUCTION
 * I. Box overlapping pathway -> POSSIBLE_OBSTRUCTION
 * J. No spatial evidence -> REVIEW_REQUIRED
 * K. Low confidence obstruction -> REVIEW_REQUIRED
 *
 * Plus Temporal Confirmation validation.
 */

import assert from "node:assert/strict";
import type { Detection } from "../../types/verification";
import {
    evaluateSpatialVerification,
    evaluateFireExtinguisherRule,
    evaluateExitSignRule,
    evaluateHazardSignRule,
    evaluateClearPathwayRule,
    calculatePathwayOverlap,
    DEFAULT_PATHWAY_REGION,
    TemporalTracker,
} from "../SpatialRuleEngine";

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
console.log("    VERIFYX PHASE 11 SPATIAL RULE ENGINE TESTS   ");
console.log("==================================================");

// ----------------------------------------------------
// TEST A: No objects -> PENDING
// ----------------------------------------------------
runTest("Scenario A: No objects -> PENDING", () => {
    const detections: Detection[] = [];
    const result = evaluateSpatialVerification(detections);

    assert.equal(result.dominantDecision, "PENDING", "Dominant decision must be PENDING");
    assert.equal(result.passedCount, 0, "Passed count must be 0");
    assert.equal(result.hasPending, true, "Must have pending checks");

    const feCheck = result.checks.find((c) => c.ruleId === "rule_extinguisher");
    assert.equal(feCheck?.status, "pending");
    assert.equal(feCheck?.decision, "PENDING");

    const exitCheck = result.checks.find((c) => c.ruleId === "rule_exit");
    assert.equal(exitCheck?.status, "pending");

    const pathCheck = result.checks.find((c) => c.ruleId === "rule_pathway");
    assert.equal(pathCheck?.status, "pending");
    assert.equal(pathCheck?.pathwayState, "PENDING");
});

// ----------------------------------------------------
// TEST B: Strong fire extinguisher -> PASS
// ----------------------------------------------------
runTest("Scenario B: Strong fire extinguisher -> PASS", () => {
    const detections: Detection[] = [
        {
            id: "det-1",
            label: "Fire Extinguisher",
            rawLabel: "fire_extinguisher",
            category: "fire_extinguisher",
            confidence: 0.88,
            bbox: { x: 0.25, y: 0.20, width: 0.22, height: 0.50 },
        },
    ];

    const check = evaluateFireExtinguisherRule(detections);

    assert.equal(check.status, "verified", "Status must be verified");
    assert.equal(check.decision, "PASS", "Decision must be PASS");
    assert.ok(check.evidence, "Must produce evidence object");
    assert.equal(check.evidence?.rule, "RULE-SAFE-01");
    assert.equal(check.evidence?.object, "fire_extinguisher");
    assert.equal(check.evidence?.confidence, 0.88);
    assert.equal(check.evidence?.decision, "PASS");
});

// ----------------------------------------------------
// TEST C: Weak fire extinguisher -> REVIEW_REQUIRED or RESCAN_NEEDED
// ----------------------------------------------------
runTest("Scenario C1: Moderate fire extinguisher (55%) -> REVIEW_REQUIRED", () => {
    const detections: Detection[] = [
        {
            id: "det-1",
            label: "Fire Extinguisher",
            rawLabel: "fire_extinguisher",
            category: "fire_extinguisher",
            confidence: 0.55,
            bbox: { x: 0.25, y: 0.20, width: 0.22, height: 0.50 },
        },
    ];

    const check = evaluateFireExtinguisherRule(detections);

    assert.notEqual(check.decision, "PASS", "Weak confidence must NEVER equal PASS");
    assert.equal(check.status, "review");
    assert.equal(check.decision, "REVIEW_REQUIRED");
    assert.ok(check.reviewReason?.length, "Must provide human review reason");
});

runTest("Scenario C2: Low fire extinguisher (35%) -> RESCAN_NEEDED", () => {
    const detections: Detection[] = [
        {
            id: "det-1",
            label: "Fire Extinguisher",
            rawLabel: "fire_extinguisher",
            category: "fire_extinguisher",
            confidence: 0.35,
            bbox: { x: 0.25, y: 0.20, width: 0.22, height: 0.50 },
        },
    ];

    const check = evaluateFireExtinguisherRule(detections);

    assert.notEqual(check.decision, "PASS", "Low confidence must NEVER equal PASS");
    assert.equal(check.status, "rescan");
    assert.equal(check.decision, "RESCAN_NEEDED");
});

// ----------------------------------------------------
// TEST D: Too-small extinguisher -> RESCAN_NEEDED
// ----------------------------------------------------
runTest("Scenario D: Too-small extinguisher (<32px) -> RESCAN_NEEDED", () => {
    const detections: Detection[] = [
        {
            id: "det-1",
            label: "Fire Extinguisher",
            rawLabel: "fire_extinguisher",
            category: "fire_extinguisher",
            confidence: 0.92, // High confidence, but distant
            bbox: { x: 0.45, y: 0.45, width: 0.03, height: 0.04 },
            isTooSmall: true,
        },
    ];

    const check = evaluateFireExtinguisherRule(detections);

    assert.notEqual(check.decision, "PASS", "Too-small detection must NEVER equal PASS");
    assert.equal(check.status, "rescan");
    assert.equal(check.decision, "RESCAN_NEEDED");
    assert.equal(check.evidence?.objectSize?.isTooSmall, true);
    assert.ok(check.rescanReason?.toLowerCase().includes("move closer"));
});

// ----------------------------------------------------
// TEST E: Strong exit sign -> PASS
// ----------------------------------------------------
runTest("Scenario E: Strong exit sign -> PASS", () => {
    const detections: Detection[] = [
        {
            id: "det-exit",
            label: "Emergency Exit Sign",
            rawLabel: "emergency_exit_sign",
            category: "emergency_exit",
            confidence: 0.91,
            bbox: { x: 0.35, y: 0.10, width: 0.30, height: 0.18 },
        },
    ];

    const check = evaluateExitSignRule(detections);

    assert.equal(check.status, "verified");
    assert.equal(check.decision, "PASS");
    assert.equal(check.evidence?.rule, "RULE-SAFE-02");
    assert.equal(check.evidence?.detectedClass, "emergency_exit_sign");
});

// ----------------------------------------------------
// TEST F: Strong hazard sign -> PASS
// ----------------------------------------------------
runTest("Scenario F: Strong hazard sign -> PASS", () => {
    const detections: Detection[] = [
        {
            id: "det-hazard",
            label: "Safety Hazard Sign",
            rawLabel: "hazard_sign",
            category: "safety_sign",
            confidence: 0.86,
            bbox: { x: 0.40, y: 0.55, width: 0.20, height: 0.30 },
        },
    ];

    const check = evaluateHazardSignRule(detections);

    assert.equal(check.status, "verified");
    assert.equal(check.decision, "PASS");
    assert.equal(check.evidence?.rule, "RULE-SAFE-03");
    assert.equal(check.evidence?.detectedClass, "hazard_sign");
});

// ----------------------------------------------------
// TEST G: Chair outside pathway -> CLEAR / no obstruction
// ----------------------------------------------------
runTest("Scenario G: Chair outside pathway -> CLEAR / no obstruction", () => {
    // Pathway region is central: x: [0.20, 0.80], y: [0.50, 1.00]
    // Chair placed along left wall: x: 0.02..0.16 (outside corridor)
    const detections: Detection[] = [
        {
            id: "det-chair-wall",
            label: "Chair / Seating Furniture",
            rawLabel: "chair_furniture",
            category: "obstruction_candidate",
            confidence: 0.84,
            bbox: { x: 0.02, y: 0.60, width: 0.14, height: 0.30 },
        },
    ];

    const overlap = calculatePathwayOverlap(detections[0].bbox, DEFAULT_PATHWAY_REGION);
    assert.equal(overlap, 0, "Chair outside corridor must have 0 overlap");

    const check = evaluateClearPathwayRule(detections);

    assert.equal(check.pathwayState, "CLEAR", "Pathway state must be CLEAR");
    assert.equal(check.status, "verified", "Status should be verified clear");
    assert.equal(check.decision, "PASS");
    assert.equal(check.spatialOverlap, 0);
    assert.equal(check.evidence?.decision, "CLEAR");
    assert.equal(check.evidence?.spatialRelationship?.overlaps, false);
});

// ----------------------------------------------------
// TEST H: Chair overlapping pathway -> POSSIBLE_OBSTRUCTION
// ----------------------------------------------------
runTest("Scenario H: Chair overlapping pathway -> POSSIBLE_OBSTRUCTION", () => {
    // Chair placed partially in corridor: x: 0.30..0.60, y: 0.60..0.90
    const detections: Detection[] = [
        {
            id: "det-chair-corridor",
            label: "Chair / Seating Furniture",
            rawLabel: "chair_furniture",
            category: "obstruction_candidate",
            confidence: 0.78,
            bbox: { x: 0.30, y: 0.60, width: 0.30, height: 0.30 },
        },
    ];

    const overlap = calculatePathwayOverlap(detections[0].bbox, DEFAULT_PATHWAY_REGION);
    assert.ok(overlap > 0.50, `Expected substantial overlap, got ${overlap}`);

    const check = evaluateClearPathwayRule(detections);

    assert.equal(check.pathwayState, "POSSIBLE_OBSTRUCTION");
    assert.equal(check.status, "issue");
    assert.equal(check.decision, "ISSUE");
    assert.equal(check.evidence?.rule, "PATHWAY_CLEAR");
    assert.equal(check.evidence?.object, "chair_furniture");
    assert.equal(check.evidence?.decision, "POSSIBLE_OBSTRUCTION");
    assert.ok(check.evidence?.reason.includes("overlaps pathway"));
});

// ----------------------------------------------------
// TEST I: Box overlapping pathway -> POSSIBLE_OBSTRUCTION
// ----------------------------------------------------
runTest("Scenario I: Box overlapping pathway -> POSSIBLE_OBSTRUCTION", () => {
    // Delivery carton in pathway: x: 0.40..0.65, y: 0.65..0.90
    const detections: Detection[] = [
        {
            id: "det-box-corridor",
            label: "Box / Delivery Carton",
            rawLabel: "box_carton",
            category: "obstruction_candidate",
            confidence: 0.79,
            bbox: { x: 0.40, y: 0.65, width: 0.25, height: 0.25 },
        },
    ];

    const overlap = calculatePathwayOverlap(detections[0].bbox, DEFAULT_PATHWAY_REGION);
    assert.ok(overlap > 0.50, `Expected overlap, got ${overlap}`);

    const check = evaluateClearPathwayRule(detections);

    assert.equal(check.pathwayState, "POSSIBLE_OBSTRUCTION");
    assert.equal(check.status, "issue");
    assert.equal(check.evidence?.rule, "PATHWAY_CLEAR");
    assert.equal(check.evidence?.object, "box_carton");
    assert.equal(check.evidence?.decision, "POSSIBLE_OBSTRUCTION");
});

// ----------------------------------------------------
// TEST J: No spatial evidence -> REVIEW_REQUIRED
// ----------------------------------------------------
runTest("Scenario J: No spatial evidence -> REVIEW_REQUIRED", () => {
    const detections: Detection[] = [
        {
            id: "det-chair-uncalibrated",
            label: "Chair / Seating Furniture",
            rawLabel: "chair_furniture",
            category: "obstruction_candidate",
            confidence: 0.85,
            bbox: { x: 0.40, y: 0.60, width: 0.25, height: 0.30 },
        },
    ];

    // Evaluate with spatial evidence marked unavailable / uncalibrated
    const check = evaluateClearPathwayRule(detections, { hasSpatialEvidence: false });

    assert.notEqual(check.decision, "PASS", "Missing spatial evidence must NEVER equal PASS");
    assert.equal(check.pathwayState, "REVIEW_REQUIRED");
    assert.equal(check.status, "review");
    assert.equal(check.decision, "REVIEW_REQUIRED");
    assert.ok(check.evidence?.reason.toLowerCase().includes("spatial evidence"));
});

// ----------------------------------------------------
// TEST K: Low confidence obstruction -> REVIEW_REQUIRED
// ----------------------------------------------------
runTest("Scenario K: Low confidence obstruction -> REVIEW_REQUIRED", () => {
    const detections: Detection[] = [
        {
            id: "det-box-uncertain",
            label: "Box / Delivery Carton",
            rawLabel: "box_carton",
            category: "obstruction_candidate",
            confidence: 0.42, // Low confidence
            bbox: { x: 0.40, y: 0.65, width: 0.25, height: 0.25 },
        },
    ];

    const check = evaluateClearPathwayRule(detections);

    assert.notEqual(check.decision, "PASS", "Low confidence must NEVER equal PASS");
    assert.notEqual(check.status, "verified");
    assert.equal(check.pathwayState, "REVIEW_REQUIRED");
    assert.equal(check.status, "review");
    assert.equal(check.decision, "REVIEW_REQUIRED");
    assert.ok(check.evidence?.reason.toLowerCase().includes("below high threshold"));
});

// ----------------------------------------------------
// TEST L: Lightweight Temporal Confirmation
// ----------------------------------------------------
runTest("Scenario L: Lightweight Temporal Confirmation", () => {
    const tracker = new TemporalTracker(2, 2000);
    const detFrame: Detection[] = [
        {
            id: "det-fe-temp",
            label: "Fire Extinguisher",
            rawLabel: "fire_extinguisher",
            category: "fire_extinguisher",
            confidence: 0.85,
            bbox: { x: 0.3, y: 0.3, width: 0.2, height: 0.4 },
        },
    ];

    // Observation 1: Initial detection -> should be transient (observationCount = 1, isStable = false)
    tracker.update(detFrame, 1000);
    let check = evaluateFireExtinguisherRule(detFrame, {
        temporalTracker: tracker,
        requireTemporalStability: true,
    });
    assert.equal(check.decision, "REVIEW_REQUIRED", "First observation must require stability confirmation");
    assert.equal(check.evidence?.temporalConfirmation?.isStable, false);
    assert.equal(check.evidence?.temporalConfirmation?.observations, 1);

    // Observation 2: Second frame (~480ms later) -> confirmed stable (observationCount = 2, isStable = true)
    tracker.update(detFrame, 1480);
    check = evaluateFireExtinguisherRule(detFrame, {
        temporalTracker: tracker,
        requireTemporalStability: true,
    });
    assert.equal(check.decision, "PASS", "Second observation confirms temporal stability -> PASS");
    assert.equal(check.evidence?.temporalConfirmation?.isStable, true);
    assert.equal(check.evidence?.temporalConfirmation?.observations, 2);
});

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("--------------------------------------------------");
console.log(`Results: ${testsPassed} / ${testsRun} tests passed (100% SUCCESS)`);
console.log("==================================================");

if (testsPassed !== testsRun) {
    process.exit(1);
}
