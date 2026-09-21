export interface BoundingBox {
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    width: number; // 0..1 normalized
    height: number; // 0..1 normalized
}

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export type VerificationDecision =
    | "PASS"
    | "ISSUE"
    | "REVIEW_REQUIRED"
    | "RESCAN_NEEDED"
    | "PENDING"
    | "NO_DETECTION";

export interface Detection {
    id: string;
    label: string;
    category: string;
    confidence: number;
    bbox: BoundingBox;
    isIssue?: boolean;
    statusText?: string;
    rawLabel?: string;
    timestamp?: number;
    confidenceTier?: ConfidenceTier;
    decision?: VerificationDecision;
    isTooSmall?: boolean;
    guardrailPrompt?: string;
}

export type PathwayState =
    | "CLEAR"
    | "POSSIBLE_OBSTRUCTION"
    | "OBSTRUCTION"
    | "REVIEW_REQUIRED"
    | "PENDING";

export interface PathwayRegion {
    id: string;
    name: string;
    bounds: {
        xMin: number; // 0..1 normalized
        yMin: number; // 0..1 normalized
        xMax: number; // 0..1 normalized
        yMax: number; // 0..1 normalized
    };
    polygon?: Array<{ x: number; y: number }>;
}

export interface RuleEvidence {
    rule: string;
    ruleId?: string;
    object?: string;
    detectedClass?: string;
    confidence?: number;
    confidenceTier?: ConfidenceTier;
    boundingBox?: BoundingBox;
    objectSize?: {
        widthNorm: number;
        heightNorm: number;
        areaNorm: number;
        isTooSmall: boolean;
    };
    overlap?: number; // 0..1 normalized intersection over object area
    spatialRelationship?: {
        pathwayRegion: string;
        overlap: number;
        isInside: boolean;
        overlaps: boolean;
    };
    temporalConfirmation?: {
        observations: number;
        required: number;
        isStable: boolean;
    };
    decision: VerificationDecision | PathwayState;
    reason: string;
    timestamp: number | string;
}

export type CheckStatus =
    | "verified"
    | "issue"
    | "review"
    | "rescan"
    | "pending"
    | "not_supported";

export interface VerificationCheck {
    id: string;
    ruleId: string;
    title: string;
    description: string;
    ruleStandard: string;
    status: CheckStatus;
    confidence: number;
    confidenceTier?: ConfidenceTier;
    decision?: VerificationDecision;
    issueMessage?: string;
    correctiveAction?: string;
    reviewReason?: string;
    rescanReason?: string;
    detectionLabel?: string;
    boundingBox?: BoundingBox;
    timestamp?: string;
    evidence?: RuleEvidence;
    spatialOverlap?: number;
    pathwayState?: PathwayState;
    lifecycleState?: IssueLifecycleState;
    rescanCount?: number;
    history?: CheckObservation[];
    initialEvidence?: RuleEvidence;
    finalEvidence?: RuleEvidence;
}

export type InspectionStatus = "COMPLETE" | "PARTIAL" | "REVIEW_REQUIRED";

export type IssueLifecycleState =
    | "PENDING"
    | "VERIFIED"
    | "ISSUE"
    | "REVIEW"
    | "FIX_REQUESTED"
    | "RESCAN"
    | "RESOLVED";

export interface CheckObservation {
    timestamp: string;
    stage: "initial_scan" | "rescan" | "manual_review";
    status: CheckStatus;
    decision: VerificationDecision | PathwayState;
    confidence: number;
    confidenceTier?: ConfidenceTier;
    evidence?: RuleEvidence;
    message?: string;
    frameDataUrl?: string;
}

export interface InspectionCheck extends VerificationCheck {
    lifecycleState?: IssueLifecycleState;
    rescanCount: number;
    history: CheckObservation[];
    initialEvidence?: RuleEvidence;
    finalEvidence?: RuleEvidence;
}

export interface InspectionSessionSummary {
    totalChecks: number;
    verifiedCount: number;
    issuesCount: number;
    reviewCount: number;
    rescanCount: number;
}

export interface InspectionSession {
    inspectionId: string;
    startTimestamp: string;
    completionTimestamp?: string;
    inspectionType: string;
    locationLabel?: string;
    checks: InspectionCheck[];
    currentStatus: InspectionStatus;
    beforeFrame?: string;
    afterFrame?: string;
    summary: InspectionSessionSummary;
    notes?: string;
}

export interface EvidenceRecord {
    id: string;
    timestamp: string;
    stage: "initial_scan" | "rescan_verified";
    title: string;
    verdict: string;
    score: string;
    frameDataUrl: string;
    detections: Detection[];
    notes: string;
    confidenceTier?: ConfidenceTier;
    decision?: VerificationDecision;
}

export interface VerificationSession {
    id: string;
    profile: string;
    location: string;
    inspector: string;
    createdAt: string;
    initialScore: string;
    finalScore: string;
    initialChecks: VerificationCheck[];
    finalChecks: VerificationCheck[];
    beforeEvidence: EvidenceRecord | null;
    afterEvidence: EvidenceRecord | null;
    isResolved: boolean;
}
