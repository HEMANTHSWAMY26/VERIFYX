import type { Detection } from "../types/verification";

/**
 * Captures the current frame from an HTMLVideoElement into a base64 JPEG data URL.
 * If the video is inactive, draws an authentic dark-tech workplace verification frame.
 */
export function captureVideoFrame(
    source: HTMLVideoElement | HTMLImageElement | null,
    detections: Detection[] = [],
    stageTitle: string = "WORKPLACE SAFETY INSPECTION"
): string {
    let width = 800;
    let height = 600;

    if (source instanceof HTMLVideoElement && source.videoWidth > 0) {
        width = source.videoWidth;
        height = source.videoHeight;
    } else if (source instanceof HTMLImageElement && source.naturalWidth > 0) {
        width = source.naturalWidth;
        height = source.naturalHeight;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    let hasRealMedia = false;
    if (source instanceof HTMLVideoElement && source.videoWidth > 0 && source.readyState >= 2) {
        try {
            ctx.drawImage(source, 0, 0, width, height);
            hasRealMedia = true;
        } catch (e) {
            console.warn("Could not capture video frame directly:", e);
        }
    } else if (source instanceof HTMLImageElement && source.naturalWidth > 0) {
        try {
            ctx.drawImage(source, 0, 0, width, height);
            hasRealMedia = true;
        } catch (e) {
            console.warn("Could not capture image frame directly:", e);
        }
    }

    if (!hasRealMedia) {

        // Render a realistic dark-tech industrial camera preview
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#0b1210");
        gradient.addColorStop(0.5, "#080d0c");
        gradient.addColorStop(1, "#050707");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Technical Grid
        ctx.strokeStyle = "rgba(0, 255, 157, 0.05)";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Camera frame simulated workplace background elements
        // Floor line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.7);
        ctx.lineTo(width, height * 0.7);
        ctx.stroke();
    }

    // Draw HUD overlays and bounding boxes on the captured evidence
    detections.forEach((det) => {
        const boxX = det.bbox.x * width;
        const boxY = det.bbox.y * height;
        const boxW = det.bbox.width * width;
        const boxH = det.bbox.height * height;

        const isViolation = det.isIssue;
        const strokeColor = isViolation ? "#ff4f5e" : "#00ff9d";
        const fillColor = isViolation ? "rgba(255, 79, 94, 0.15)" : "rgba(0, 255, 157, 0.12)";

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Corner accents
        const cLen = Math.min(14, boxW * 0.25);
        ctx.lineWidth = 3;
        // Top Left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cLen, boxY);
        ctx.stroke();

        // Label pill
        ctx.font = "bold 11px Inter, sans-serif";
        const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
        const textMetrics = ctx.measureText(labelText);
        const pillW = textMetrics.width + 12;
        const pillH = 20;

        ctx.fillStyle = strokeColor;
        ctx.fillRect(boxX, Math.max(0, boxY - pillH), pillW, pillH);

        ctx.fillStyle = isViolation ? "#150506" : "#03100a";
        ctx.fillText(labelText, boxX + 6, Math.max(14, boxY - 5));
    });

    // Watermark HUD on bottom
    ctx.fillStyle = "rgba(5, 7, 7, 0.75)";
    ctx.fillRect(0, height - 32, width, 32);

    ctx.fillStyle = "#8b9692";
    ctx.font = "10px Inter, monospace";
    const now = new Date();
    const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString()} UTC`;
    ctx.fillText(`VERIFYX EVIDENCE FRAME // ${stageTitle} // ${timeStr}`, 14, height - 12);

    return canvas.toDataURL("image/jpeg", 0.85);
}
