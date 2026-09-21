import type {
    Detection,
    VerificationCheck,
    ConfidenceTier,
    VerificationDecision,
    PathwayState,
    RuleEvidence,
} from "../types/verification";
import { getConfidenceTier, evaluateConfidenceDecision } from "./confidencePolicy";
import {
    evaluateSpatialVerification,
    globalTemporalTracker,
} from "./SpatialRuleEngine";

export * from "./SpatialRuleEngine";

export interface RuleDefinition {
    id: string;
    code: string;
    title: string;
    description: string;
    standard: string;
    requiredClass: string;
    minConfidence: number;
    checkClearance?: boolean;
    correctiveAdvice: string;
}

export const WORKPLACE_SAFETY_RULES: RuleDefinition[] = [
    {
        id: "rule_extinguisher",
        code: "RULE-SAFE-01",
        title: "Fire Extinguisher",
        description: "Must be mounted, inspected, and unobstructed",
        standard: "Safety Standard Reference (NFPA 10 / OSHA 1910.157 Guidance) - Readily accessible mounting zone",
        requiredClass: "fire_extinguisher",
        minConfidence: 0.70,
        checkClearance: true,
        correctiveAdvice: "Ensure fire extinguisher is properly bracketed and access zone is completely clear.",
    },
    {
        id: "rule_exit",
        code: "RULE-SAFE-02",
        title: "Emergency Exit",
        description: "Must be clearly marked and unobstructed",
        standard: "Safety Standard Reference (OSHA 1910.36 Guidance) - Free and unobstructed egress route",
        requiredClass: "emergency_exit",
        minConfidence: 0.70,
        checkClearance: true,
        correctiveAdvice: "Clear all items within the emergency door swing and exit approach corridor.",
    },
    {
        id: "rule_sign",
        code: "RULE-SAFE-03",
        title: "Safety Sign",
        description: "Visible and correctly positioned",
        standard: "Safety Standard Reference (ANSI Z535 / ISO 7010 Guidance) - Visible warning signage",
        requiredClass: "safety_sign",
        minConfidence: 0.65,
        correctiveAdvice: "Ensure safety signage has direct line-of-sight and is not obscured.",
    },
    {
        id: "rule_equipment",
        code: "RULE-SAFE-04",
        title: "Required Equipment",
        description: "Required equipment is present and accessible",
        standard: "Operational Facility Guideline - Response unit / terminal present and operable",
        requiredClass: "required_equipment",
        minConfidence: 0.60,
        correctiveAdvice: "Place designated safety response equipment in its assigned location.",
    },
    {
        id: "rule_pathway",
        code: "RULE-SAFE-05",
        title: "Clear Pathway",
        description: "No obstruction in access corridor or walkway",
        standard: "Safety Standard Reference (OSHA 1910.22 Guidance) - Walking-working surfaces clear of obstacles",
        requiredClass: "clear_pathway",
        minConfidence: 0.65,
        checkClearance: true,
        correctiveAdvice: "Remove physical items, boxes, or furniture blocking the designated walkway.",
    },
];

export type TestConfidenceProfile = "high_confidence" | "medium_confidence" | "low_confidence";

/**
 * Evaluates initial scan detections against workplace safety rules.
 * Supports configurable confidence profiles for deterministic testing of:
 * - high_confidence (>= 0.70): automatic confirmed ISSUE
 * - medium_confidence (0.45 - 0.69): REVIEW_REQUIRED ("VERIFYX needs a closer look")
 * - low_confidence (< 0.45): RESCAN_NEEDED ("Move closer or change angle")
 */
export function evaluateInitialScan(testProfile: TestConfidenceProfile = "high_confidence"): {
    checks: VerificationCheck[];
    detections: Detection[];
    scoreText: string;
    passedCount: number;
    totalCount: number;
    decision: VerificationDecision;
} {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let obstacleConf = 0.93;
    let obstacleTier: ConfidenceTier = "HIGH";
    let obstacleDecision: VerificationDecision = "ISSUE";
    let obstacleStatus: "issue" | "review" | "rescan" = "issue";
    let reviewReason: string | undefined = undefined;
    let rescanReason: string | undefined = undefined;

    if (testProfile === "medium_confidence") {
        obstacleConf = 0.58;
        obstacleTier = "MEDIUM";
        obstacleDecision = "REVIEW_REQUIRED";
        obstacleStatus = "review";
        reviewReason = "VERIFYX needs a closer look. Object detected near access corridor, but confidence (58%) is in review range.";
    } else if (testProfile === "low_confidence") {
        obstacleConf = 0.36;
        obstacleTier = "LOW";
        obstacleDecision = "RESCAN_NEEDED";
        obstacleStatus = "rescan";
        rescanReason = "Low confidence detection (36%). Move closer or change camera angle to verify.";
    }

    const detections: Detection[] = [
        {
            id: "det-ext-01",
            label: "FIRE EXTINGUISHER",
            category: "fire_extinguisher",
            confidence: 0.94,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.15, y: 0.28, width: 0.22, height: 0.44 },
            statusText: "DETECTED & MOUNTED",
        },
        {
            id: "det-exit-02",
            label: "EMERGENCY EXIT",
            category: "emergency_exit",
            confidence: 0.91,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.68, y: 0.18, width: 0.26, height: 0.52 },
            statusText: "ILLUMINATED & CLEAR",
        },
        {
            id: "det-sign-03",
            label: "SAFETY SIGN",
            category: "safety_sign",
            confidence: 0.88,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.44, y: 0.12, width: 0.18, height: 0.2 },
            statusText: "COMPLIANT POSITION",
        },
        {
            id: "det-eq-04",
            label: "SAFETY EQUIPMENT",
            category: "required_equipment",
            confidence: 0.86,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.12, y: 0.72, width: 0.24, height: 0.22 },
            statusText: "STATION PRESENT",
        },
        {
            id: "det-obs-05",
            label: obstacleStatus === "review" ? "POSSIBLE OBSTACLE" : "ACCESS OBSTRUCTION",
            category: "obstruction",
            confidence: obstacleConf,
            confidenceTier: obstacleTier,
            decision: obstacleDecision,
            bbox: { x: 0.38, y: 0.58, width: 0.28, height: 0.32 },
            isIssue: obstacleStatus === "issue",
            statusText: obstacleStatus === "review" ? "REVIEW NEEDED" : obstacleStatus === "rescan" ? "UNCERTAIN" : "CORRIDOR BLOCKED",
        },
    ];

    const checks: VerificationCheck[] = [
        {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "Present and accessible",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "verified",
            confidence: 0.94,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Fire Extinguisher (Mounted)",
            timestamp,
        },
        {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "Accessible and unobstructed",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "verified",
            confidence: 0.91,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Emergency Egress Route",
            timestamp,
        },
        {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "Visible and correctly placed",
            ruleStandard: "ANSI Z535 Guidance",
            status: "verified",
            confidence: 0.88,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Hazard Signage Visible",
            timestamp,
        },
        {
            id: "chk-equip",
            ruleId: "rule_equipment",
            title: "Required Equipment",
            description: "Required equipment is present",
            ruleStandard: "Workplace Safety Guideline",
            status: "verified",
            confidence: 0.86,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "First-Aid Response Unit",
            timestamp,
        },
        {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: obstacleStatus === "review"
                ? "Possible obstacle detected in walkway (review required)"
                : obstacleStatus === "rescan"
                ? "Low confidence detection (re-scan required)"
                : "Obstruction detected in access corridor",
            ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
            status: obstacleStatus,
            confidence: obstacleConf,
            confidenceTier: obstacleTier,
            decision: obstacleDecision,
            issueMessage: obstacleStatus === "issue"
                ? "Obstruction detected in access pathway corridor (width clearance < 1.0m)."
                : undefined,
            correctiveAction: obstacleStatus === "issue"
                ? "Remove obstacle from access corridor and verify clear passage."
                : undefined,
            reviewReason,
            rescanReason,
            detectionLabel: obstacleStatus === "review"
                ? "Pathway Obstacle (58% Conf - Review Required)"
                : obstacleStatus === "rescan"
                ? "Pathway Item (36% Conf - Low Certainty)"
                : "Pathway Obstacle (Disallowed)",
            timestamp,
            spatialOverlap: 1.0,
            pathwayState: obstacleStatus === "issue" ? "POSSIBLE_OBSTRUCTION" : obstacleStatus === "review" ? "REVIEW_REQUIRED" : "REVIEW_REQUIRED",
            evidence: {
                rule: "PATHWAY_CLEAR",
                ruleId: "rule_pathway",
                object: "box_carton",
                detectedClass: "box_carton",
                confidence: obstacleConf,
                confidenceTier: obstacleTier,
                boundingBox: { x: 0.38, y: 0.58, width: 0.28, height: 0.32 },
                objectSize: {
                    widthNorm: 0.28,
                    heightNorm: 0.32,
                    areaNorm: 0.28 * 0.32,
                    isTooSmall: false,
                },
                overlap: 1.0,
                spatialRelationship: {
                    pathwayRegion: "Central Walking Corridor",
                    overlap: 1.0,
                    isInside: true,
                    overlaps: true,
                },
                decision: obstacleStatus === "issue" ? "POSSIBLE_OBSTRUCTION" : obstacleStatus === "review" ? "REVIEW_REQUIRED" : "RESCAN_NEEDED",
                reason: obstacleStatus === "issue"
                    ? "Detected object overlaps pathway region (100% overlap)"
                    : obstacleStatus === "review"
                    ? "Possible obstacle detected in walkway; confidence is in review range"
                    : "Low confidence detection near corridor; re-scan needed",
                timestamp,
            },
        },
    ];

    const passedCount = checks.filter((c) => c.status === "verified").length;

    return {
        checks,
        detections,
        scoreText: `${passedCount} / 5`,
        passedCount,
        totalCount: 5,
        decision: obstacleDecision,
    };
}

/**
 * Evaluates the re-scan after the user has cleared the obstruction.
 * Returns 5 / 5 all verified with HIGH confidence PASS.
 */
export function evaluateRescan(): {
    checks: VerificationCheck[];
    detections: Detection[];
    scoreText: string;
    passedCount: number;
    totalCount: number;
} {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const detections: Detection[] = [
        {
            id: "det-ext-01",
            label: "FIRE EXTINGUISHER",
            category: "fire_extinguisher",
            confidence: 0.96,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.15, y: 0.28, width: 0.22, height: 0.44 },
            statusText: "VERIFIED CLEAR",
        },
        {
            id: "det-exit-02",
            label: "EMERGENCY EXIT",
            category: "emergency_exit",
            confidence: 0.95,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.68, y: 0.18, width: 0.26, height: 0.52 },
            statusText: "CLEAR EGRESS",
        },
        {
            id: "det-sign-03",
            label: "SAFETY SIGN",
            category: "safety_sign",
            confidence: 0.92,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.44, y: 0.12, width: 0.18, height: 0.2 },
            statusText: "COMPLIANT",
        },
        {
            id: "det-eq-04",
            label: "SAFETY EQUIPMENT",
            category: "required_equipment",
            confidence: 0.90,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.12, y: 0.72, width: 0.24, height: 0.22 },
            statusText: "ACCESSIBLE",
        },
        {
            id: "det-path-05",
            label: "CLEAR PATHWAY",
            category: "clear_pathway",
            confidence: 0.96,
            confidenceTier: "HIGH",
            decision: "PASS",
            bbox: { x: 0.35, y: 0.55, width: 0.34, height: 0.38 },
            statusText: "CLEAR ZONE CONFIRMED",
        },
    ];

    const checks: VerificationCheck[] = [
        {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "Present and accessible",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "verified",
            confidence: 0.96,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Fire Extinguisher (Mounted)",
            timestamp,
        },
        {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "Accessible and unobstructed",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "verified",
            confidence: 0.95,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Emergency Egress Route",
            timestamp,
        },
        {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "Visible and correctly placed",
            ruleStandard: "ANSI Z535 Guidance",
            status: "verified",
            confidence: 0.92,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Hazard Signage Visible",
            timestamp,
        },
        {
            id: "chk-equip",
            ruleId: "rule_equipment",
            title: "Required Equipment",
            description: "Required equipment is present",
            ruleStandard: "Workplace Safety Guideline",
            status: "verified",
            confidence: 0.90,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "First-Aid Response Unit",
            timestamp,
        },
        {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "Obstruction cleared — 100% unobstructed corridor",
            ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
            status: "verified",
            confidence: 0.96,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Pathway Clearance Verified",
            timestamp,
            spatialOverlap: 0,
            pathwayState: "CLEAR",
            evidence: {
                rule: "PATHWAY_CLEAR",
                ruleId: "rule_pathway",
                detectedClass: undefined,
                confidence: 0.96,
                confidenceTier: "HIGH",
                overlap: 0,
                spatialRelationship: {
                    pathwayRegion: "Central Walking Corridor",
                    overlap: 0,
                    isInside: false,
                    overlaps: false,
                },
                decision: "CLEAR",
                reason: "Obstruction cleared — walking corridor verified clear",
                timestamp,
            },
        },
    ];

    return {
        checks,
        detections,
        scoreText: "5 / 5",
        passedCount: 5,
        totalCount: 5,
    };
}

/**
 * Evaluates real-time detections coming from the local vision engine.
 * Separates raw model perception from safety verification rules.
 *
 * CORE SAFETY PRINCIPLES:
 * 1. NO VALID DETECTION -> NO VERIFICATION DECISION (PENDING / NO_DETECTION, NOT PASS or 5/5).
 * 2. Generic COCO-SSD objects are NEVER treated as proof of safety compliance (extinguisher, exit, signage, equipment).
 * 3. An object is an obstruction candidate ONLY if:
 *    - It belongs to the explicit obstruction candidate classes (chair, couch, backpack, suitcase, box, etc.)
 *    - It intersects the designated walking corridor
 *    - Its confidence meets or exceeds evaluation thresholds
 * 4. If no obstruction candidate is detected in corridor, Clear Pathway remains PENDING until verified.
 */
export function evaluateRealDetectionsAgainstRules(
    realDetections: Detection[],
    engineType: "yolo" | "coco_ssd" | "simulation" = "yolo"
): {
    checks: VerificationCheck[];
    detections: Detection[];
    scoreText: string;
    passedCount: number;
    totalCount: number;
    hasIssue: boolean;
    hasReview: boolean;
    hasRescan: boolean;
    hasPending: boolean;
    issueObstacle?: string;
    dominantDecision: VerificationDecision;
    pathwayState?: PathwayState;
    allEvidence?: RuleEvidence[];
} {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Detect if detections originate from the custom YOLO model
    const isCustomYolo =
        engineType === "yolo" ||
        realDetections.some(
            (d) =>
                d.id.startsWith("yolo-det-") ||
                ["fire_extinguisher", "emergency_exit_sign", "hazard_sign", "box_carton", "chair_furniture"].includes(
                    d.rawLabel || ""
                )
        );

    // ==========================================
    // PATHWAY A: CUSTOM YOLO11n EVALUATION
    // ==========================================
    if (isCustomYolo) {
        const spatialResult = evaluateSpatialVerification(realDetections, {
            temporalTracker: globalTemporalTracker,
        });

        const pathwayItem = realDetections.find(
            (d) => d.rawLabel === "box_carton" || d.rawLabel === "chair_furniture"
        );

        return {
            checks: spatialResult.checks,
            detections: realDetections,
            scoreText: spatialResult.scoreText,
            passedCount: spatialResult.passedCount,
            totalCount: spatialResult.totalCount,
            hasIssue: spatialResult.hasIssue,
            hasReview: spatialResult.hasReview,
            hasRescan: spatialResult.hasRescan,
            hasPending: spatialResult.hasPending,
            issueObstacle: pathwayItem?.rawLabel,
            dominantDecision: spatialResult.dominantDecision,
            pathwayState: spatialResult.pathwayState,
            allEvidence: spatialResult.allEvidence,
        };
    }

    // ==========================================
    // PATHWAY B: COCO-SSD FALLBACK EVALUATION
    // ==========================================
    // Check for empty camera / no detections at all
    if (!realDetections || realDetections.length === 0) {
        const checks: VerificationCheck[] = [
            {
                id: "chk-ext",
                ruleId: "rule_extinguisher",
                title: "Fire Extinguisher",
                description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
                ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "NO_DETECTION",
                detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
                timestamp,
            },
            {
                id: "chk-exit",
                ruleId: "rule_exit",
                title: "Emergency Exit",
                description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
                ruleStandard: "OSHA 1910.36 Guidance",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "NO_DETECTION",
                detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
                timestamp,
            },
            {
                id: "chk-sign",
                ruleId: "rule_sign",
                title: "Safety Sign",
                description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
                ruleStandard: "ANSI Z535 Guidance",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "NO_DETECTION",
                detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
                timestamp,
            },
            {
                id: "chk-equip",
                ruleId: "rule_equipment",
                title: "Required Equipment",
                description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
                ruleStandard: "Operational Facility Guideline",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "NO_DETECTION",
                detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
                timestamp,
            },
            {
                id: "chk-path",
                ruleId: "rule_pathway",
                title: "Clear Pathway",
                description: "No relevant object detected in view. Point camera across corridor.",
                ruleStandard: "OSHA 1910.22 Guidance",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "NO_DETECTION",
                detectionLabel: "No Corridor Evidence",
                timestamp,
            },
        ];

        return {
            checks,
            detections: [],
            scoreText: "0 / 5",
            passedCount: 0,
            totalCount: 5,
            hasIssue: false,
            hasReview: false,
            hasRescan: false,
            hasPending: true,
            dominantDecision: "NO_DETECTION",
        };
    }

    // Identify potential corridor obstacle among COCO-SSD detections
    const corridorObstacle = realDetections.find(
        (d) => d.category === "obstruction_candidate" && d.isIssue
    );

    let pathStatus: "verified" | "issue" | "review" | "rescan" | "pending" = "pending";
    let pathDecision: VerificationDecision = "PENDING";
    let pathConf = 0;
    let pathTier: ConfidenceTier = "LOW";
    let pathReviewReason: string | undefined = undefined;
    let pathRescanReason: string | undefined = undefined;
    let pathIssueMsg: string | undefined = undefined;
    let pathCorrective: string | undefined = undefined;
    let pathDesc = "No obstruction candidate detected in corridor. Awaiting verified clearance evidence.";
    let pathLabel = "Awaiting Corridor Evidence";

    if (corridorObstacle) {
        pathConf = corridorObstacle.confidence;
        pathTier = getConfidenceTier(pathConf);
        const decisionResult = evaluateConfidenceDecision(pathConf, true);
        pathDecision = decisionResult.decision;

        if (pathDecision === "ISSUE") {
            pathStatus = "issue";
            pathDesc = `Obstruction detected in walkway: ${corridorObstacle.rawLabel?.toUpperCase() || "PHYSICAL OBSTACLE"}`;
            pathLabel = `Pathway Obstacle (${corridorObstacle.rawLabel?.toUpperCase() || "OBJECT"})`;
            pathIssueMsg = `Obstruction detected in access corridor: ${corridorObstacle.rawLabel?.toUpperCase() || "ITEM"} (${Math.round(pathConf * 100)}% conf). Minimum 1.0m width clearance required.`;
            pathCorrective = `Remove ${corridorObstacle.rawLabel || "obstacle"} from the pedestrian access corridor.`;
        } else if (pathDecision === "REVIEW_REQUIRED") {
            pathStatus = "review";
            pathDesc = `Possible obstruction detected: ${corridorObstacle.rawLabel?.toUpperCase() || "ITEM"} (${Math.round(pathConf * 100)}% conf)`;
            pathLabel = `Possible Obstacle (${Math.round(pathConf * 100)}% Conf - Review Required)`;
            pathReviewReason = `VERIFYX needs a closer look. Object (${corridorObstacle.rawLabel?.toUpperCase() || "item"}) detected near corridor, but confidence (${Math.round(pathConf * 100)}%) is in review range (45–69%).`;
        } else {
            pathStatus = "rescan";
            pathDesc = `Uncertain object detected near corridor (${Math.round(pathConf * 100)}% conf)`;
            pathLabel = `Uncertain Detection (${Math.round(pathConf * 100)}% Conf)`;
            pathRescanReason = `Low confidence detection (< 45%). Move closer or change camera angle to verify ${corridorObstacle.rawLabel || "item"}.`;
        }
    }

    const checks: VerificationCheck[] = [
        {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
            timestamp,
        },
        {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
            timestamp,
        },
        {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
            ruleStandard: "ANSI Z535 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
            timestamp,
        },
        {
            id: "chk-equip",
            ruleId: "rule_equipment",
            title: "Required Equipment",
            description: "COCO-SSD Fallback lacks safety class — Custom Safety Model required",
            ruleStandard: "Operational Facility Guideline",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "COCO-SSD Fallback (Safety Model Required)",
            timestamp,
        },
        {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: pathDesc,
            ruleStandard: "Safety Standard Reference (OSHA 1910.22 Guidance)",
            status: pathStatus,
            confidence: pathConf,
            confidenceTier: pathTier,
            decision: pathDecision,
            issueMessage: pathIssueMsg,
            correctiveAction: pathCorrective,
            reviewReason: pathReviewReason,
            rescanReason: pathRescanReason,
            detectionLabel: pathLabel,
            timestamp,
        },
    ];

    const passedCount = checks.filter((c) => c.status === "verified").length;
    const totalCount = checks.length;
    const hasIssue = checks.some((c) => c.status === "issue");
    const hasReview = checks.some((c) => c.status === "review");
    const hasRescan = checks.some((c) => c.status === "rescan");
    const hasPending = checks.some((c) => c.status === "pending" || c.status === "not_supported");

    let dominantDecision: VerificationDecision = "PENDING";
    if (hasIssue) dominantDecision = "ISSUE";
    else if (hasReview) dominantDecision = "REVIEW_REQUIRED";
    else if (hasRescan) dominantDecision = "RESCAN_NEEDED";
    else if (passedCount === totalCount) dominantDecision = "PASS";

    return {
        checks,
        detections: realDetections,
        scoreText: `${passedCount} / ${totalCount}`,
        passedCount,
        totalCount,
        hasIssue,
        hasReview,
        hasRescan,
        hasPending,
        issueObstacle: corridorObstacle?.rawLabel,
        dominantDecision,
    };
}
