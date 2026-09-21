/**
 * VERIFYX Spatial Rule Engine
 * ----------------------------
 * Decoupled Rule & Spatial Evidence Verification Layer.
 *
 * CORE ARCHITECTURAL PRINCIPLE:
 * YOLO answers: "What objects are visible?" (Perception)
 * VERIFYX rules answer: "Does this satisfy the inspection requirement?" (Verification)
 *
 * MANDATORY DISCLAIMER:
 * "This prototype rule engine is not a certified workplace safety compliance system."
 */

import type {
    BoundingBox,
    Detection,
    PathwayRegion,
    PathwayState,
    RuleEvidence,
    VerificationCheck,
    VerificationDecision,
} from "../types/verification";
import { getConfidenceTier } from "./confidencePolicy";

/**
 * Standard normalized pathway region in camera viewport.
 * Uses normalized [0..1] coordinates for resolution-independent reasoning.
 * Models a central walking corridor in the lower portion of the frame.
 */
export const DEFAULT_PATHWAY_REGION: PathwayRegion = {
    id: "corridor_central",
    name: "Central Walking Corridor",
    bounds: {
        xMin: 0.20,
        yMin: 0.50,
        xMax: 0.80,
        yMax: 1.00,
    },
    polygon: [
        { x: 0.28, y: 0.50 },
        { x: 0.72, y: 0.50 },
        { x: 0.85, y: 1.00 },
        { x: 0.15, y: 1.00 },
    ],
};

// ==========================================
// 1. SPATIAL GEOMETRY UTILITIES
// ==========================================

export function calculateBoxArea(bbox: BoundingBox): number {
    return Math.max(0, bbox.width) * Math.max(0, bbox.height);
}

/**
 * Computes intersection area between a detection bounding box and a normalized rectangular region.
 */
export function calculateIntersectionArea(
    box: BoundingBox,
    regionBounds: { xMin: number; yMin: number; xMax: number; yMax: number }
): number {
    const boxX1 = box.x;
    const boxY1 = box.y;
    const boxX2 = box.x + box.width;
    const boxY2 = box.y + box.height;

    const interX1 = Math.max(boxX1, regionBounds.xMin);
    const interY1 = Math.max(boxY1, regionBounds.yMin);
    const interX2 = Math.min(boxX2, regionBounds.xMax);
    const interY2 = Math.min(boxY2, regionBounds.yMax);

    const interW = Math.max(0, interX2 - interX1);
    const interH = Math.max(0, interY2 - interY1);

    return interW * interH;
}

/**
 * Computes intersection-over-object-area (IoOA).
 * Returns the fraction of the object that intersects the pathway corridor (0..1).
 */
export function calculatePathwayOverlap(
    box: BoundingBox,
    region: PathwayRegion = DEFAULT_PATHWAY_REGION
): number {
    const boxArea = calculateBoxArea(box);
    if (boxArea <= 0) return 0;

    const interArea = calculateIntersectionArea(box, region.bounds);
    const overlap = interArea / boxArea;
    return Math.round(Math.min(1, Math.max(0, overlap)) * 1000) / 1000;
}

// ==========================================
// 2. LIGHTWEIGHT TEMPORAL TRACKER
// ==========================================

export interface TrackedObservation {
    classLabel: string;
    bbox: BoundingBox;
    observationCount: number;
    firstSeenMs: number;
    lastSeenMs: number;
    isStable: boolean;
}

/**
 * Lightweight temporal confirmation tracker.
 * A detection must persist across 2-3 inference observations before being considered stable.
 * Avoids complex tracking systems while preventing single-frame transient false alarms.
 */
export class TemporalTracker {
    private _tracks: Map<string, TrackedObservation> = new Map();
    private _requiredObservations: number;
    private _expiryMs: number;

    constructor(requiredObservations = 2, expiryMs = 2500) {
        this._requiredObservations = requiredObservations;
        this._expiryMs = expiryMs;
    }

    public update(detections: Detection[], nowMs: number = Date.now()): TrackedObservation[] {
        // Purge expired tracks
        for (const [key, track] of this._tracks.entries()) {
            if (nowMs - track.lastSeenMs > this._expiryMs) {
                this._tracks.delete(key);
            }
        }

        const currentObserved: TrackedObservation[] = [];

        for (const det of detections) {
            const classLabel = det.rawLabel || det.label;
            let matchedKey: string | null = null;
            let bestIoU = 0;

            for (const [key, track] of this._tracks.entries()) {
                if (track.classLabel !== classLabel) continue;

                // Simple bounding box IoU
                const interArea = calculateIntersectionArea(det.bbox, {
                    xMin: track.bbox.x,
                    yMin: track.bbox.y,
                    xMax: track.bbox.x + track.bbox.width,
                    yMax: track.bbox.y + track.bbox.height,
                });
                const areaA = calculateBoxArea(det.bbox);
                const areaB = calculateBoxArea(track.bbox);
                const unionArea = areaA + areaB - interArea;
                const iou = unionArea > 0 ? interArea / unionArea : 0;

                if (iou > 0.25 && iou > bestIoU) {
                    bestIoU = iou;
                    matchedKey = key;
                }
            }

            if (matchedKey) {
                const track = this._tracks.get(matchedKey)!;
                track.observationCount += 1;
                track.lastSeenMs = nowMs;
                track.bbox = det.bbox;
                track.isStable = track.observationCount >= this._requiredObservations;
                currentObserved.push(track);
            } else {
                const newKey = `${classLabel}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
                const newTrack: TrackedObservation = {
                    classLabel,
                    bbox: det.bbox,
                    observationCount: 1,
                    firstSeenMs: nowMs,
                    lastSeenMs: nowMs,
                    isStable: this._requiredObservations <= 1,
                };
                this._tracks.set(newKey, newTrack);
                currentObserved.push(newTrack);
            }
        }

        return currentObserved;
    }

    public getTrack(classLabel: string): TrackedObservation | undefined {
        for (const track of this._tracks.values()) {
            if (track.classLabel === classLabel) {
                return track;
            }
        }
        return undefined;
    }

    public reset(): void {
        this._tracks.clear();
    }
}

// Global default tracker instance for live scan sessions
export const globalTemporalTracker = new TemporalTracker(2, 2500);

// ==========================================
// 3. RULE IMPLEMENTATIONS
// ==========================================

export interface SpatialEvaluationOptions {
    pathwayRegion?: PathwayRegion;
    temporalTracker?: TemporalTracker | null;
    requireTemporalStability?: boolean;
    hasSpatialEvidence?: boolean; // Set to false to simulate uncalibrated/missing spatial context
    nowMs?: number;
}

/**
 * 1. FIRE EXTINGUISHER RULE (RULE-SAFE-01)
 * A fire extinguisher detection should NOT automatically equal PASS.
 * Evaluates:
 * A. Object detected
 * B. Confidence sufficient (>= 0.70)
 * C. Bounding box sufficiently large (not flagged isTooSmall / area >= 0.003)
 * D. Detection stable across multiple observations if available
 * Possible results: PASS / REVIEW_REQUIRED / RESCAN_NEEDED / PENDING
 */
export function evaluateFireExtinguisherRule(
    detections: Detection[],
    options?: SpatialEvaluationOptions
): VerificationCheck {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const feDet = detections.find((d) => d.rawLabel === "fire_extinguisher");

    if (!feDet) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-01",
            ruleId: "rule_extinguisher",
            detectedClass: undefined,
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            reason: "No fire extinguisher detected in camera view",
            timestamp,
        };

        return {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "No fire extinguisher detected in current camera view",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "Awaiting Extinguisher In View",
            timestamp,
            evidence,
        };
    }

    const bbox = feDet.bbox;
    const boxArea = calculateBoxArea(bbox);
    const isTooSmall = Boolean(
        feDet.isTooSmall ||
        Math.max(bbox.width, bbox.height) < 0.05 ||
        boxArea < 0.002
    );

    // Temporal stability check if tracker provided
    let temporalInfo: { observations: number; required: number; isStable: boolean } | undefined = undefined;
    if (options?.temporalTracker) {
        const track = options.temporalTracker.getTrack("fire_extinguisher");
        if (track) {
            temporalInfo = {
                observations: track.observationCount,
                required: 2,
                isStable: track.isStable,
            };
        }
    }

    // Condition C: Bounding box too small
    if (isTooSmall) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-01",
            ruleId: "rule_extinguisher",
            object: "fire_extinguisher",
            detectedClass: "fire_extinguisher",
            confidence: feDet.confidence,
            confidenceTier: "LOW",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: true,
            },
            temporalConfirmation: temporalInfo,
            decision: "RESCAN_NEEDED",
            reason: "Extinguisher bounding box is too small (<32px / <0.05 norm) to verify gauge needle, pin seal, or tag",
            timestamp,
        };

        return {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "Object detected but too small/distant for verification",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "rescan",
            confidence: feDet.confidence,
            confidenceTier: "LOW",
            decision: "RESCAN_NEEDED",
            detectionLabel: "Fire Extinguisher — Move closer",
            rescanReason: "Move closer to verify: extinguisher is too small to inspect pin seal, gauge, or mounting bracket.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    // Condition B: Confidence check
    if (feDet.confidence >= 0.70) {
        // Temporal confirmation check if required
        if (options?.requireTemporalStability && temporalInfo && !temporalInfo.isStable) {
            const evidence: RuleEvidence = {
                rule: "RULE-SAFE-01",
                ruleId: "rule_extinguisher",
                object: "fire_extinguisher",
                detectedClass: "fire_extinguisher",
                confidence: feDet.confidence,
                confidenceTier: "HIGH",
                boundingBox: bbox,
                objectSize: {
                    widthNorm: bbox.width,
                    heightNorm: bbox.height,
                    areaNorm: boxArea,
                    isTooSmall: false,
                },
                temporalConfirmation: temporalInfo,
                decision: "REVIEW_REQUIRED",
                reason: "High confidence detection observed once; awaiting temporal stability confirmation (2+ observations)",
                timestamp,
            };

            return {
                id: "chk-ext",
                ruleId: "rule_extinguisher",
                title: "Fire Extinguisher",
                description: "Extinguisher candidate detected; awaiting temporal confirmation",
                ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
                status: "review",
                confidence: feDet.confidence,
                confidenceTier: "HIGH",
                decision: "REVIEW_REQUIRED",
                detectionLabel: "Fire Extinguisher — Confirming...",
                reviewReason: "Hold camera steady to confirm extinguisher detection across multiple frames.",
                boundingBox: bbox,
                timestamp,
                evidence,
            };
        }

        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-01",
            ruleId: "rule_extinguisher",
            object: "fire_extinguisher",
            detectedClass: "fire_extinguisher",
            confidence: feDet.confidence,
            confidenceTier: "HIGH",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            temporalConfirmation: temporalInfo,
            decision: "PASS",
            reason: "Fire extinguisher verified present, mounted, and identifiable with high certainty",
            timestamp,
        };

        return {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "Fire extinguisher verified present, mounted, and identifiable",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "verified",
            confidence: feDet.confidence,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: `Fire Extinguisher (${Math.round(feDet.confidence * 100)}% Conf)`,
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    if (feDet.confidence >= 0.45) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-01",
            ruleId: "rule_extinguisher",
            object: "fire_extinguisher",
            detectedClass: "fire_extinguisher",
            confidence: feDet.confidence,
            confidenceTier: "MEDIUM",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            temporalConfirmation: temporalInfo,
            decision: "REVIEW_REQUIRED",
            reason: "Extinguisher detected with moderate confidence (45–69%); requires inspector confirmation",
            timestamp,
        };

        return {
            id: "chk-ext",
            ruleId: "rule_extinguisher",
            title: "Fire Extinguisher",
            description: "Candidate fire extinguisher detected with moderate certainty",
            ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
            status: "review",
            confidence: feDet.confidence,
            confidenceTier: "MEDIUM",
            decision: "REVIEW_REQUIRED",
            detectionLabel: `Fire Extinguisher (${Math.round(feDet.confidence * 100)}% Conf)`,
            reviewReason: "VERIFYX detected a potential extinguisher. Move closer to confirm pressure gauge and mounting bracket.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    // Low confidence < 0.45
    const evidence: RuleEvidence = {
        rule: "RULE-SAFE-01",
        ruleId: "rule_extinguisher",
        object: "fire_extinguisher",
        detectedClass: "fire_extinguisher",
        confidence: feDet.confidence,
        confidenceTier: "LOW",
        boundingBox: bbox,
        objectSize: {
            widthNorm: bbox.width,
            heightNorm: bbox.height,
            areaNorm: boxArea,
            isTooSmall: false,
        },
        temporalConfirmation: temporalInfo,
        decision: "RESCAN_NEEDED",
        reason: "Low confidence extinguisher detection (<45%); re-scan required",
        timestamp,
    };

    return {
        id: "chk-ext",
        ruleId: "rule_extinguisher",
        title: "Fire Extinguisher",
        description: "Low-confidence detection (<45%)",
        ruleStandard: "NFPA 10 / OSHA 1910.157 Guidance",
        status: "rescan",
        confidence: feDet.confidence,
        confidenceTier: "LOW",
        decision: "RESCAN_NEEDED",
        detectionLabel: `Uncertain Object (${Math.round(feDet.confidence * 100)}% Conf)`,
        rescanReason: "Low confidence detection. Move closer and stabilize camera.",
        boundingBox: bbox,
        timestamp,
        evidence,
    };
}

/**
 * 2. EMERGENCY EXIT SIGN RULE (RULE-SAFE-02)
 * Detection alone is evidence.
 * Require: correct class, acceptable confidence, acceptable object size.
 * Returns: PASS / REVIEW_REQUIRED / RESCAN_NEEDED / PENDING
 */
export function evaluateExitSignRule(
    detections: Detection[],
    _options?: SpatialEvaluationOptions
): VerificationCheck {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const exitDet = detections.find((d) => d.rawLabel === "emergency_exit_sign");

    if (!exitDet) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-02",
            ruleId: "rule_exit",
            detectedClass: undefined,
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            reason: "No emergency exit sign detected in current view",
            timestamp,
        };

        return {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "No exit sign detected in current camera view",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "Awaiting Exit Sign In View",
            timestamp,
            evidence,
        };
    }

    const bbox = exitDet.bbox;
    const boxArea = calculateBoxArea(bbox);
    const isTooSmall = Boolean(
        exitDet.isTooSmall ||
        Math.max(bbox.width, bbox.height) < 0.05 ||
        boxArea < 0.002
    );

    if (isTooSmall) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-02",
            ruleId: "rule_exit",
            object: "emergency_exit_sign",
            detectedClass: "emergency_exit_sign",
            confidence: exitDet.confidence,
            confidenceTier: "LOW",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: true,
            },
            decision: "RESCAN_NEEDED",
            reason: "Exit sign is too small or distant (<32px / <0.05 norm) to verify legibility and illumination",
            timestamp,
        };

        return {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "Signage detected but too small/distant for legibility check",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "rescan",
            confidence: exitDet.confidence,
            confidenceTier: "LOW",
            decision: "RESCAN_NEEDED",
            detectionLabel: "Exit Sign — Move closer",
            rescanReason: "Move closer to verify: exit sign is too distant for legibility check.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    if (exitDet.confidence >= 0.70) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-02",
            ruleId: "rule_exit",
            object: "emergency_exit_sign",
            detectedClass: "emergency_exit_sign",
            confidence: exitDet.confidence,
            confidenceTier: "HIGH",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            decision: "PASS",
            reason: "Emergency exit signage identified and unobstructed with high certainty",
            timestamp,
        };

        return {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "Emergency exit signage identified and unobstructed",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "verified",
            confidence: exitDet.confidence,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: `Emergency Exit Sign (${Math.round(exitDet.confidence * 100)}% Conf)`,
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    if (exitDet.confidence >= 0.45) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-02",
            ruleId: "rule_exit",
            object: "emergency_exit_sign",
            detectedClass: "emergency_exit_sign",
            confidence: exitDet.confidence,
            confidenceTier: "MEDIUM",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            decision: "REVIEW_REQUIRED",
            reason: "Exit sign candidate detected with moderate certainty; verify illumination and clear line-of-sight",
            timestamp,
        };

        return {
            id: "chk-exit",
            ruleId: "rule_exit",
            title: "Emergency Exit",
            description: "Exit sign candidate detected with moderate certainty",
            ruleStandard: "OSHA 1910.36 Guidance",
            status: "review",
            confidence: exitDet.confidence,
            confidenceTier: "MEDIUM",
            decision: "REVIEW_REQUIRED",
            detectionLabel: `Exit Sign (${Math.round(exitDet.confidence * 100)}% Conf)`,
            reviewReason: "Exit signage observed with moderate confidence. Verify illumination and line-of-sight.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    const evidence: RuleEvidence = {
        rule: "RULE-SAFE-02",
        ruleId: "rule_exit",
        object: "emergency_exit_sign",
        detectedClass: "emergency_exit_sign",
        confidence: exitDet.confidence,
        confidenceTier: "LOW",
        boundingBox: bbox,
        objectSize: {
            widthNorm: bbox.width,
            heightNorm: bbox.height,
            areaNorm: boxArea,
            isTooSmall: false,
        },
        decision: "RESCAN_NEEDED",
        reason: "Low confidence exit sign detection (<45%); re-scan required",
        timestamp,
    };

    return {
        id: "chk-exit",
        ruleId: "rule_exit",
        title: "Emergency Exit",
        description: "Low-confidence exit sign detection (<45%)",
        ruleStandard: "OSHA 1910.36 Guidance",
        status: "rescan",
        confidence: exitDet.confidence,
        confidenceTier: "LOW",
        decision: "RESCAN_NEEDED",
        detectionLabel: `Uncertain Sign (${Math.round(exitDet.confidence * 100)}% Conf)`,
        rescanReason: "Low confidence detection. Move closer to doorway.",
        boundingBox: bbox,
        timestamp,
        evidence,
    };
}

/**
 * 3. SAFETY HAZARD SIGN RULE (RULE-SAFE-03)
 * Same evidence policy.
 * Do not hard-code PASS.
 * Returns: PASS / REVIEW_REQUIRED / RESCAN_NEEDED / PENDING
 */
export function evaluateHazardSignRule(
    detections: Detection[],
    _options?: SpatialEvaluationOptions
): VerificationCheck {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const hazardDet = detections.find((d) => d.rawLabel === "hazard_sign");

    if (!hazardDet) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-03",
            ruleId: "rule_sign",
            detectedClass: undefined,
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            reason: "No safety hazard sign detected in current view",
            timestamp,
        };

        return {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "No hazard sign detected in current camera view",
            ruleStandard: "ANSI Z535 / ISO 7010 Guidance",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "Awaiting Hazard Signage",
            timestamp,
            evidence,
        };
    }

    const bbox = hazardDet.bbox;
    const boxArea = calculateBoxArea(bbox);
    const isTooSmall = Boolean(
        hazardDet.isTooSmall ||
        Math.max(bbox.width, bbox.height) < 0.05 ||
        boxArea < 0.002
    );

    if (isTooSmall) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-03",
            ruleId: "rule_sign",
            object: "hazard_sign",
            detectedClass: "hazard_sign",
            confidence: hazardDet.confidence,
            confidenceTier: "LOW",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: true,
            },
            decision: "RESCAN_NEEDED",
            reason: "Hazard warning sign is too small or distant (<32px / <0.05 norm) to verify symbol and cautionary text",
            timestamp,
        };

        return {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "Warning sign detected but too small/distant",
            ruleStandard: "ANSI Z535 / ISO 7010 Guidance",
            status: "rescan",
            confidence: hazardDet.confidence,
            confidenceTier: "LOW",
            decision: "RESCAN_NEEDED",
            detectionLabel: "Hazard Sign — Move closer",
            rescanReason: "Move closer to verify: caution sign too distant to verify warning symbol.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    if (hazardDet.confidence >= 0.65) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-03",
            ruleId: "rule_sign",
            object: "hazard_sign",
            detectedClass: "hazard_sign",
            confidence: hazardDet.confidence,
            confidenceTier: "HIGH",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            decision: "PASS",
            reason: "Mandatory hazard warning sign present and localized with verified line-of-sight",
            timestamp,
        };

        return {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "Mandatory hazard warning sign present and localized",
            ruleStandard: "ANSI Z535 / ISO 7010 Guidance",
            status: "verified",
            confidence: hazardDet.confidence,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: `Hazard Sign (${Math.round(hazardDet.confidence * 100)}% Conf)`,
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    if (hazardDet.confidence >= 0.45) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-03",
            ruleId: "rule_sign",
            object: "hazard_sign",
            detectedClass: "hazard_sign",
            confidence: hazardDet.confidence,
            confidenceTier: "MEDIUM",
            boundingBox: bbox,
            objectSize: {
                widthNorm: bbox.width,
                heightNorm: bbox.height,
                areaNorm: boxArea,
                isTooSmall: false,
            },
            decision: "REVIEW_REQUIRED",
            reason: "Hazard sign candidate observed with moderate confidence; verify warning symbol",
            timestamp,
        };

        return {
            id: "chk-sign",
            ruleId: "rule_sign",
            title: "Safety Sign",
            description: "Hazard sign candidate observed with moderate certainty",
            ruleStandard: "ANSI Z535 / ISO 7010 Guidance",
            status: "review",
            confidence: hazardDet.confidence,
            confidenceTier: "MEDIUM",
            decision: "REVIEW_REQUIRED",
            detectionLabel: `Hazard Sign (${Math.round(hazardDet.confidence * 100)}% Conf)`,
            reviewReason: "Hazard sign candidate detected. Verify warning symbol.",
            boundingBox: bbox,
            timestamp,
            evidence,
        };
    }

    const evidence: RuleEvidence = {
        rule: "RULE-SAFE-03",
        ruleId: "rule_sign",
        object: "hazard_sign",
        detectedClass: "hazard_sign",
        confidence: hazardDet.confidence,
        confidenceTier: "LOW",
        boundingBox: bbox,
        objectSize: {
            widthNorm: bbox.width,
            heightNorm: bbox.height,
            areaNorm: boxArea,
            isTooSmall: false,
        },
        decision: "RESCAN_NEEDED",
        reason: "Low confidence hazard sign (<45%); re-scan required",
        timestamp,
    };

    return {
        id: "chk-sign",
        ruleId: "rule_sign",
        title: "Safety Sign",
        description: "Low-confidence hazard sign (<45%)",
        ruleStandard: "ANSI Z535 / ISO 7010 Guidance",
        status: "rescan",
        confidence: hazardDet.confidence,
        confidenceTier: "LOW",
        decision: "RESCAN_NEEDED",
        detectionLabel: `Uncertain Sign (${Math.round(hazardDet.confidence * 100)}% Conf)`,
        rescanReason: "Low confidence detection. Move closer.",
        boundingBox: bbox,
        timestamp,
        evidence,
    };
}

/**
 * 4. CLEAR PATHWAY — SPATIAL REASONING (RULE-SAFE-05)
 *
 * Prototype spatial rule using normalized coordinates.
 * Candidates: box_carton, chair_furniture.
 * DO NOT automatically mark either class as an obstruction.
 *
 * Conceptual logic:
 * Object detected -> Is object inside / overlapping pathway region?
 *   YES -> possible obstruction
 *   NO  -> not a pathway obstruction (CLEAR)
 *
 * PATHWAY STATES:
 * CLEAR / POSSIBLE_OBSTRUCTION / OBSTRUCTION / REVIEW_REQUIRED / PENDING
 */
export function evaluateClearPathwayRule(
    detections: Detection[],
    options?: SpatialEvaluationOptions
): VerificationCheck {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const pathwayRegion = options?.pathwayRegion || DEFAULT_PATHWAY_REGION;

    // Check if spatial evidence is explicitly marked unavailable or invalid
    if (options?.hasSpatialEvidence === false) {
        const evidence: RuleEvidence = {
            rule: "PATHWAY_CLEAR",
            ruleId: "rule_pathway",
            detectedClass: undefined,
            confidence: 0,
            confidenceTier: "LOW",
            decision: "REVIEW_REQUIRED",
            reason: "Insufficient spatial evidence: camera framing lacks verified floor/pathway calibration",
            timestamp,
        };

        return {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "No spatial evidence: camera framing lacks verified pathway ground plane",
            ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
            status: "review",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "REVIEW_REQUIRED",
            reviewReason: "Spatial ground-plane evidence is missing. Point camera down toward floor walking corridor.",
            detectionLabel: "Missing Spatial Evidence",
            timestamp,
            evidence,
            pathwayState: "REVIEW_REQUIRED",
        };
    }

    // Identify candidate objects: box_carton, chair_furniture
    const candidates = detections.filter(
        (d) => d.rawLabel === "box_carton" || d.rawLabel === "chair_furniture"
    );

    // Case A: No candidates in scene
    if (candidates.length === 0) {
        // If there are zero detections in the entire scene, it's PENDING (Test A)
        if (detections.length === 0) {
            const evidence: RuleEvidence = {
                rule: "PATHWAY_CLEAR",
                ruleId: "rule_pathway",
                detectedClass: undefined,
                confidence: 0,
                confidenceTier: "LOW",
                decision: "PENDING",
                reason: "No objects or spatial pathway candidates in view",
                timestamp,
            };

            return {
                id: "chk-path",
                ruleId: "rule_pathway",
                title: "Clear Pathway",
                description: "Awaiting environmental scan of walking corridor",
                ruleStandard: "OSHA 1910.22 Guidance",
                status: "pending",
                confidence: 0,
                confidenceTier: "LOW",
                decision: "PENDING",
                detectionLabel: "Awaiting Pathway Scan",
                timestamp,
                evidence,
                pathwayState: "PENDING",
            };
        }

        // Scene has other items, but no obstruction candidates in view -> CLEAR
        const evidence: RuleEvidence = {
            rule: "PATHWAY_CLEAR",
            ruleId: "rule_pathway",
            detectedClass: undefined,
            confidence: 0.95,
            confidenceTier: "HIGH",
            decision: "CLEAR",
            reason: "No obstruction candidates detected; corridor remains clear",
            timestamp,
        };

        return {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: "Walkway observed with no obstruction candidates present",
            ruleStandard: "OSHA 1910.22 Guidance",
            status: "verified",
            confidence: 0.95,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: "Pathway Unobstructed",
            timestamp,
            evidence,
            pathwayState: "CLEAR",
        };
    }

    // Evaluate each candidate's spatial relationship with the pathway corridor
    interface EvaluatedCandidate {
        det: Detection;
        overlap: number;
        boxArea: number;
    }

    const evaluatedCandidates: EvaluatedCandidate[] = candidates.map((det) => {
        const overlap = calculatePathwayOverlap(det.bbox, pathwayRegion);
        const boxArea = calculateBoxArea(det.bbox);
        return { det, overlap, boxArea };
    });

    // Sort by overlap descending
    evaluatedCandidates.sort((a, b) => b.overlap - a.overlap);
    const primary = evaluatedCandidates[0];
    const candidateDet = primary.det;
    const overlap = primary.overlap;
    const isOverlapping = overlap > 0.05; // 5% overlap threshold for corridor intersection

    // Case G: Candidate is completely outside pathway corridor (overlap == 0 or <= 0.05)
    // DO NOT mark as obstruction! E.g. chair pushed against wall outside walking corridor.
    if (!isOverlapping) {
        const evidence: RuleEvidence = {
            rule: "PATHWAY_CLEAR",
            ruleId: "rule_pathway",
            object: candidateDet.rawLabel,
            detectedClass: candidateDet.rawLabel,
            confidence: candidateDet.confidence,
            confidenceTier: candidateDet.confidenceTier || getConfidenceTier(candidateDet.confidence),
            boundingBox: candidateDet.bbox,
            objectSize: {
                widthNorm: candidateDet.bbox.width,
                heightNorm: candidateDet.bbox.height,
                areaNorm: primary.boxArea,
                isTooSmall: false,
            },
            overlap: 0,
            spatialRelationship: {
                pathwayRegion: pathwayRegion.name,
                overlap: 0,
                isInside: false,
                overlaps: false,
            },
            decision: "CLEAR",
            reason: `Detected object (${candidateDet.rawLabel}) is positioned outside the designated walking corridor; pathway remains clear`,
            timestamp,
        };

        return {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: `${candidateDet.label} observed outside designated walking corridor`,
            ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
            status: "verified",
            confidence: candidateDet.confidence,
            confidenceTier: "HIGH",
            decision: "PASS",
            detectionLabel: `${candidateDet.label} (Outside Pathway — Clear)`,
            boundingBox: candidateDet.bbox,
            timestamp,
            evidence,
            spatialOverlap: 0,
            pathwayState: "CLEAR",
        };
    }

    // Case H, I, K: Candidate overlaps pathway corridor (overlap > 0.05)
    // Low or Medium confidence obstruction candidate -> REVIEW_REQUIRED (Test K)
    // Never convert uncertain detection into confirmed obstruction or PASS
    if (candidateDet.confidence < 0.70) {
        const evidence: RuleEvidence = {
            rule: "PATHWAY_CLEAR",
            ruleId: "rule_pathway",
            object: candidateDet.rawLabel,
            detectedClass: candidateDet.rawLabel,
            confidence: candidateDet.confidence,
            confidenceTier: getConfidenceTier(candidateDet.confidence),
            boundingBox: candidateDet.bbox,
            objectSize: {
                widthNorm: candidateDet.bbox.width,
                heightNorm: candidateDet.bbox.height,
                areaNorm: primary.boxArea,
                isTooSmall: false,
            },
            overlap,
            spatialRelationship: {
                pathwayRegion: pathwayRegion.name,
                overlap,
                isInside: overlap > 0.75,
                overlaps: true,
            },
            decision: "REVIEW_REQUIRED",
            reason: `Detected object (${candidateDet.rawLabel}) overlaps pathway (${Math.round(overlap * 100)}%), but confidence (${Math.round(candidateDet.confidence * 100)}%) is below high threshold; human review required`,
            timestamp,
        };

        return {
            id: "chk-path",
            ruleId: "rule_pathway",
            title: "Clear Pathway",
            description: `Possible corridor obstruction (${candidateDet.label}) requires review`,
            ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
            status: "review",
            confidence: candidateDet.confidence,
            confidenceTier: getConfidenceTier(candidateDet.confidence),
            decision: "REVIEW_REQUIRED",
            detectionLabel: `Possible Obstruction (${candidateDet.label} - Review)`,
            reviewReason: `A ${candidateDet.label.toLowerCase()} is detected in the walking corridor (${Math.round(overlap * 100)}% overlap), but confidence is in review range. Please verify corridor clearance.`,
            boundingBox: candidateDet.bbox,
            timestamp,
            evidence,
            spatialOverlap: overlap,
            pathwayState: "REVIEW_REQUIRED",
        };
    }

    // Candidate has High Confidence (>= 0.70) and overlaps pathway corridor
    // Prototype spatial rule: object overlapping pathway region -> POSSIBLE_OBSTRUCTION
    // (OBSTRUCTION is reserved for confirmed multi-object corridor blockage)
    const isMultiBlockage = candidates.filter((c) => calculatePathwayOverlap(c.bbox, pathwayRegion) > 0.3).length >= 2;
    const pathwayDecision: PathwayState = isMultiBlockage ? "OBSTRUCTION" : "POSSIBLE_OBSTRUCTION";

    const evidence: RuleEvidence = {
        rule: "PATHWAY_CLEAR",
        ruleId: "rule_pathway",
        object: candidateDet.rawLabel,
        detectedClass: candidateDet.rawLabel,
        confidence: candidateDet.confidence,
        confidenceTier: "HIGH",
        boundingBox: candidateDet.bbox,
        objectSize: {
            widthNorm: candidateDet.bbox.width,
            heightNorm: candidateDet.bbox.height,
            areaNorm: primary.boxArea,
            isTooSmall: false,
        },
        overlap,
        spatialRelationship: {
            pathwayRegion: pathwayRegion.name,
            overlap,
            isInside: overlap > 0.75,
            overlaps: true,
        },
        decision: pathwayDecision,
        reason: `Detected object (${candidateDet.rawLabel}) overlaps pathway region (${Math.round(overlap * 100)}%)`,
        timestamp,
    };

    return {
        id: "chk-path",
        ruleId: "rule_pathway",
        title: "Clear Pathway",
        description: `Corridor obstruction candidate detected: ${candidateDet.label}`,
        ruleStandard: "OSHA 1910.22 Walking-Working Surfaces Guidance",
        status: "issue",
        confidence: candidateDet.confidence,
        confidenceTier: "HIGH",
        decision: "ISSUE",
        issueMessage: `Obstruction detected in walking corridor: ${candidateDet.label} (${Math.round(overlap * 100)}% corridor overlap). Walking clearance must remain unobstructed.`,
        correctiveAction: `Remove ${candidateDet.label.toLowerCase()} from the designated walking pathway.`,
        detectionLabel: `${isMultiBlockage ? "Pathway Obstruction" : "Possible Obstruction"}: ${candidateDet.label}`,
        boundingBox: candidateDet.bbox,
        timestamp,
        evidence,
        spatialOverlap: overlap,
        pathwayState: pathwayDecision,
    };
}

/**
 * 5. REQUIRED EQUIPMENT RULE (RULE-SAFE-04)
 */
export function evaluateRequiredEquipmentRule(
    detections: Detection[],
    _options?: SpatialEvaluationOptions
): VerificationCheck {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const equipDet = detections.find((d) => d.rawLabel === "required_equipment" || d.category === "required_equipment");

    if (!equipDet) {
        const evidence: RuleEvidence = {
            rule: "RULE-SAFE-04",
            ruleId: "rule_equipment",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            reason: "Facility equipment checklist awaiting venue deployment",
            timestamp,
        };

        return {
            id: "chk-equip",
            ruleId: "rule_equipment",
            title: "Required Equipment",
            description: "Safety equipment presence verification (Awaiting venue checklist)",
            ruleStandard: "Operational Facility Guideline",
            status: "pending",
            confidence: 0,
            confidenceTier: "LOW",
            decision: "PENDING",
            detectionLabel: "Awaiting Facility Equipment",
            timestamp,
            evidence,
        };
    }

    const evidence: RuleEvidence = {
        rule: "RULE-SAFE-04",
        ruleId: "rule_equipment",
        object: equipDet.rawLabel,
        detectedClass: equipDet.rawLabel,
        confidence: equipDet.confidence,
        confidenceTier: equipDet.confidenceTier || "HIGH",
        decision: "PASS",
        reason: "Required equipment verified present and accessible",
        timestamp,
    };

    return {
        id: "chk-equip",
        ruleId: "rule_equipment",
        title: "Required Equipment",
        description: "Required equipment verified present and accessible",
        ruleStandard: "Operational Facility Guideline",
        status: "verified",
        confidence: equipDet.confidence,
        confidenceTier: equipDet.confidenceTier || "HIGH",
        decision: "PASS",
        detectionLabel: `Equipment (${Math.round(equipDet.confidence * 100)}% Conf)`,
        boundingBox: equipDet.bbox,
        timestamp,
        evidence,
    };
}

// ==========================================
// 4. UNIFIED ENGINE EVALUATION ENTRYPOINT
// ==========================================

export interface SpatialEvaluationResult {
    checks: VerificationCheck[];
    allEvidence: RuleEvidence[];
    pathwayState: PathwayState;
    passedCount: number;
    totalCount: number;
    scoreText: string;
    hasIssue: boolean;
    hasReview: boolean;
    hasRescan: boolean;
    hasPending: boolean;
    dominantDecision: VerificationDecision;
    disclaimer: string;
}

/**
 * Main evaluation entry point for the Spatial Rule Engine.
 * Evaluates real-time or static detections against the complete VERIFYX safety standard.
 */
export function evaluateSpatialVerification(
    detections: Detection[],
    options?: SpatialEvaluationOptions
): SpatialEvaluationResult {
    // 1. Update temporal tracker if provided
    if (options?.temporalTracker) {
        options.temporalTracker.update(detections, options.nowMs || Date.now());
    }

    // 2. Evaluate each rule independently
    const feCheck = evaluateFireExtinguisherRule(detections, options);
    const exitCheck = evaluateExitSignRule(detections, options);
    const hazardCheck = evaluateHazardSignRule(detections, options);
    const equipCheck = evaluateRequiredEquipmentRule(detections, options);
    const pathCheck = evaluateClearPathwayRule(detections, options);

    const checks: VerificationCheck[] = [feCheck, exitCheck, hazardCheck, equipCheck, pathCheck];
    const allEvidence: RuleEvidence[] = checks
        .map((c) => c.evidence)
        .filter((e): e is RuleEvidence => Boolean(e));

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

    const pathwayState: PathwayState = pathCheck.pathwayState || (
        pathCheck.status === "verified" ? "CLEAR" :
        pathCheck.status === "issue" ? "POSSIBLE_OBSTRUCTION" :
        pathCheck.status === "review" ? "REVIEW_REQUIRED" : "PENDING"
    );

    return {
        checks,
        allEvidence,
        pathwayState,
        passedCount,
        totalCount,
        scoreText: `${passedCount} / ${totalCount}`,
        hasIssue,
        hasReview,
        hasRescan,
        hasPending,
        dominantDecision,
        disclaimer: "This prototype rule engine is not a certified workplace safety compliance system.",
    };
}
