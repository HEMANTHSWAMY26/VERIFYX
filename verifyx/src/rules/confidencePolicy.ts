import type { ConfidenceTier, VerificationDecision } from "../types/verification";

/**
 * VERIFYX Confidence Policy
 *
 * PROTOTYPE THRESHOLDS NOTE:
 * These thresholds are initial prototype thresholds determined from empirical testing
 * with MobileNet-v2 SSD on web/phone cameras under typical indoor ambient illumination:
 * - High Confidence (>= 0.70): Strong bounding box overlap and feature activation.
 *   Eligible for automatic rule evaluation (PASS or confirmed ISSUE).
 * - Medium Confidence (0.45 - 0.69): Object detected with partial occlusion or suboptimal angle.
 *   Cannot be trusted for automatic compliance. Triggers REVIEW_REQUIRED.
 * - Low Confidence (< 0.45): Noise, blur, or transient detection.
 *   Cannot make a verification decision. Triggers RESCAN_NEEDED.
 *
 * IMPORTANT PRINCIPLE:
 * Uncertainty must NEVER become a false PASS.
 */
export const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.70,
    MEDIUM: 0.45,
} as const;

export function getConfidenceTier(confidence: number): ConfidenceTier {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
        return "HIGH";
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        return "MEDIUM";
    }
    return "LOW";
}

export function evaluateConfidenceDecision(
    confidence: number,
    isViolationCandidate: boolean
): {
    tier: ConfidenceTier;
    decision: VerificationDecision;
    userExplanation: string;
} {
    const tier = getConfidenceTier(confidence);

    if (tier === "HIGH") {
        return {
            tier,
            decision: isViolationCandidate ? "ISSUE" : "PASS",
            userExplanation: isViolationCandidate
                ? "Confirmed violation detected with high model confidence."
                : "Requirement satisfied with high confidence verification.",
        };
    }

    if (tier === "MEDIUM") {
        return {
            tier,
            decision: "REVIEW_REQUIRED",
            userExplanation:
                "VERIFYX needs a closer look. Object detected, but confidence is not high enough for automatic verification.",
        };
    }

    return {
        tier,
        decision: "RESCAN_NEEDED",
        userExplanation:
            "Re-scan required. Confidence is below reliable threshold. Move closer or change camera angle.",
    };
}

export function getDecisionBadgeInfo(decision: VerificationDecision): {
    label: string;
    badgeClass: string;
    accentColor: string;
} {
    switch (decision) {
        case "PASS":
            return {
                label: "PASS",
                badgeClass: "badge-pass",
                accentColor: "#00ff9d",
            };
        case "ISSUE":
            return {
                label: "ISSUE",
                badgeClass: "badge-issue",
                accentColor: "#ff4f5e",
            };
        case "REVIEW_REQUIRED":
            return {
                label: "REVIEW REQUIRED",
                badgeClass: "badge-review",
                accentColor: "#f59e0b",
            };
        case "RESCAN_NEEDED":
            return {
                label: "RE-SCAN NEEDED",
                badgeClass: "badge-rescan",
                accentColor: "#9ca3af",
            };
        case "PENDING":
            return {
                label: "PENDING",
                badgeClass: "badge-pending",
                accentColor: "#64748b",
            };
        case "NO_DETECTION":
            return {
                label: "NO DETECTION",
                badgeClass: "badge-no-detection",
                accentColor: "#64748b",
            };
    }
}
