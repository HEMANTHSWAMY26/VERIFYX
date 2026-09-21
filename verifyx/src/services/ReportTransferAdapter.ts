/**
 * VERIFYX Report Transfer Adapter
 * --------------------------------
 * Clean architectural abstraction for transferring verified inspection reports,
 * audit metadata, and evidence records to external office productivity suites
 * (such as iQOO Office Kit, PC companion apps, or local audit management tools).
 *
 * NOTE:
 * Does NOT invoke unverified private vendor APIs.
 * Implements a standards-compliant transfer interface with a verified development mock.
 */

import type {
    InspectionSession,
    InspectionSessionSummary,
    InspectionStatus,
} from "../types/verification";
import { getBusinessFriendlyCheckSummary } from "../rules/inspectionSession";

export interface EvidenceTransferSummaryItem {
    ruleId: string;
    title: string;
    status: string;
    decision: string;
    confidence: number;
    summary: string;
    rescanCount: number;
    hasEvidence: boolean;
}

export interface ReportTransferPayload {
    inspectionId: string;
    inspectionType: string;
    timestamp: string;
    status: InspectionStatus;
    location?: string;
    summary: InspectionSessionSummary;
    devicePlatform: string;
    evidenceSummary: EvidenceTransferSummaryItem[];
    disclaimer: string;
    rawReportJson: string;
}

export interface ReportTransferResult {
    success: boolean;
    transferId: string;
    timestamp: string;
    target: string;
    message: string;
    bytesTransferred: number;
    payloadSummary: string;
}

export interface ReportTransferAdapter {
    readonly name: string;
    isAvailable(): Promise<boolean>;
    transfer(session: InspectionSession): Promise<ReportTransferResult>;
}

/**
 * Development & Demonstration Office Kit Transfer Adapter.
 * Prepares the complete enterprise payload, syncs with local clipboard,
 * and emits a structured audit event.
 */
export class MockOfficeKitTransferAdapter implements ReportTransferAdapter {
    readonly name = "VERIFYX Office Kit Local Bridge (Dev Mock)";

    async isAvailable(): Promise<boolean> {
        return true;
    }

    async transfer(session: InspectionSession): Promise<ReportTransferResult> {
        const transferId = `OK-TX-${Date.now().toString(36).toUpperCase()}`;
        const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const evidenceSummary: EvidenceTransferSummaryItem[] = session.checks.map((c) => ({
            ruleId: c.ruleId,
            title: c.title,
            status: c.status,
            decision: c.decision || "PENDING",
            confidence: c.confidence,
            summary: getBusinessFriendlyCheckSummary(c),
            rescanCount: c.rescanCount || 0,
            hasEvidence: Boolean(c.evidence),
        }));

        const payload: ReportTransferPayload = {
            inspectionId: session.inspectionId,
            inspectionType: session.inspectionType,
            timestamp: session.startTimestamp,
            status: session.currentStatus,
            location: session.locationLabel,
            summary: session.summary,
            devicePlatform: "VERIFYX Phone-First Inspection Engine (Web/Mobile)",
            evidenceSummary,
            disclaimer: "This prototype rule engine is not a certified workplace safety compliance system.",
            rawReportJson: JSON.stringify(session, null, 2),
        };

        const payloadString = JSON.stringify(payload, null, 2);
        const bytesTransferred = new TextEncoder().encode(payloadString).length;

        // Clipboard bridge: allows instant pasting into desktop Word, Excel, or messaging
        const clipboardText = `[VERIFYX INSPECTION REPORT TRANSFER]
ID: ${session.inspectionId}
TYPE: ${session.inspectionType}
STATUS: ${session.currentStatus}
DATE: ${session.startTimestamp}
LOCATION: ${session.locationLabel || "Corridor Walkway"}
CHECKS: ${session.summary.verifiedCount} / ${session.summary.totalChecks} Verified
DISCLAIMER: This prototype rule engine is not a certified workplace safety compliance system.
TRANSFER ID: ${transferId}`;

        if (typeof navigator !== "undefined" && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(clipboardText);
            } catch (clipErr) {
                console.warn("[ReportTransferAdapter] Clipboard write warning:", clipErr);
            }
        }

        console.log(`[ReportTransferAdapter] Dispatched report ${session.inspectionId} via ${this.name} (${bytesTransferred} bytes):`, payload);

        return {
            success: true,
            transferId,
            timestamp: nowStr,
            target: "Office Kit Companion Bridge",
            message: `Report successfully staged for Office Kit transfer (${session.summary.verifiedCount}/${session.summary.totalChecks} verified). Summary copied to clipboard.`,
            bytesTransferred,
            payloadSummary: `${session.inspectionId} (${session.currentStatus})`,
        };
    }

    getAdapterName(): string {
        return "Office Kit Mock Adapter (Local/Dev)";
    }

    async transferReport(session: InspectionSession): Promise<ReportTransferResult & { metadata: { inspectionId: string } }> {
        const result = await this.transfer(session);
        return { ...result, metadata: { inspectionId: session.inspectionId } };
    }
}

export const defaultReportTransferAdapter = new MockOfficeKitTransferAdapter();

export function createReportTransferPayload(session: InspectionSession) {
    const evidenceSummary: EvidenceTransferSummaryItem[] = session.checks.map((c) => ({
        ruleId: c.ruleId,
        title: c.title,
        status: c.status,
        decision: c.decision || "PENDING",
        confidence: c.confidence,
        summary: getBusinessFriendlyCheckSummary(c),
        rescanCount: c.rescanCount || 0,
        hasEvidence: Boolean(c.evidence),
    }));

    const payload: ReportTransferPayload = {
        inspectionId: session.inspectionId,
        inspectionType: session.inspectionType,
        timestamp: session.startTimestamp,
        status: session.currentStatus,
        location: session.locationLabel,
        summary: session.summary,
        devicePlatform: "VERIFYX Phone-First Inspection Engine (Web/Mobile)",
        evidenceSummary,
        disclaimer: "This prototype rule engine is not a certified workplace safety compliance system.",
        rawReportJson: JSON.stringify(session, null, 2),
    };

    return {
        report: {
            ...payload,
            evidenceFrameCaptured: !!session.beforeFrame,
            rescanFrameCaptured: !!session.afterFrame,
        },
    };
}


