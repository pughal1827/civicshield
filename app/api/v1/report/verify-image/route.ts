/**
 * Next.js API Route — AI Image Verification
 *
 * Proxies image uploads to the CivicShield AI microservice.
 * Returns structured verification results to the frontend.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────
const AI_SERVICE_URL = process.env.CIVICSHIELD_AI_URL || "http://localhost:8000";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// ── Ensure upload directory exists ────────────────────────────────────────────
async function ensureUploadDir() {
    try {
        await mkdir(UPLOAD_DIR, { recursive: true });
    } catch {
        // Directory may already exist
    }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        await ensureUploadDir();

        const formData = await request.formData();
        const image = formData.get("image") as File | null;
        const description = formData.get("description") as string | null;
        const claimed_category = formData.get("claimed_category") as string | null;

        if (!image) {
            return NextResponse.json(
                { error: "No image file provided" },
                { status: 400 }
            );
        }

        if (!description || !description.trim()) {
            return NextResponse.json(
                { error: "Description is required" },
                { status: 400 }
            );
        }

        // ── Save image locally (for demo display) ──────────────────────────────
        const imageBuffer = Buffer.from(await image.arrayBuffer());
        const fileExt = image.name.split(".").pop() || "jpg";
        const fileName = `${randomUUID()}.${fileExt}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        await writeFile(filePath, imageBuffer);

        const localImageUrl = `/uploads/${fileName}`;

        // ── Call AI microservice ───────────────────────────────────────────────
        const aiFormData = new FormData();
        const imageBlob = new Blob([imageBuffer], { type: image.type || "image/jpeg" });
        aiFormData.append("image", imageBlob, image.name || "upload.jpg");
        aiFormData.append("description", description.trim());
        aiFormData.append("claimed_category", claimed_category || "");

        let aiResult;
        try {
            const aiResponse = await fetch(
                `${AI_SERVICE_URL}/api/v1/verify-incident-image`,
                {
                    method: "POST",
                    body: aiFormData,
                    signal: AbortSignal.timeout(60000), // 60s timeout for GPU inference
                }
            );

            if (aiResponse.ok) {
                aiResult = await aiResponse.json();
            } else {
                const errorText = await aiResponse.text();
                console.error(`[AI Service Error ${aiResponse.status}]: ${errorText}`);
                aiResult = null;
            }
        } catch (aiError) {
            console.warn("[AI Service Unavailable]:", aiError);
            aiResult = null;
        }

        // ── Build report with AI results ───────────────────────────────────────
        const report = {
            id: randomUUID(),
            image_url: localImageUrl,
            description: description.trim(),
            claimed_category: claimed_category || "UNKNOWN",
            location: null,
            timestamp: new Date().toISOString(),
            status: "submitted",
            verification: aiResult ? {
                decision_action: aiResult.decision_action,
                match_status: aiResult.match_status,
                similarity_score: aiResult.similarity_score,
                is_anomaly: aiResult.is_anomaly,
                is_fraud_or_spam: aiResult.is_fraud_or_spam,
                anomaly_flags: aiResult.anomaly_flags,
                yolo_detections: aiResult.yolo_detections,
                predicted_category: aiResult.ml_predictions?.predicted_category,
                predicted_severity: aiResult.ml_predictions?.predicted_severity,
                category_confidence: aiResult.ml_predictions?.category_confidence,
                processing_time_ms: aiResult.processing_time_ms,
                models_used: aiResult.models_used,
            } : null,
        };

        return NextResponse.json(report, { status: 201 });

    } catch (error) {
        console.error("[API Route Error]:", error);
        return NextResponse.json(
            { error: "Internal server error", detail: String(error) },
            { status: 500 }
        );
    }
}

// ── GET handler (list reports) ────────────────────────────────────────────────
export async function GET() {
    // Placeholder — in production this would fetch from database
    return NextResponse.json({
        reports: [],
        message: "GET endpoint — implement database integration for production",
    });
}
