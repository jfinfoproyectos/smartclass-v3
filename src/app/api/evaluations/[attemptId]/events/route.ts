import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { evaluationEventBus, EvaluationUpdatePayload } from "@/lib/evaluationEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ attemptId: string }> }
) {
    const { attemptId } = await context.params;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const attempt = await prisma.evaluationAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, evaluationId: true }
    });

    if (!attempt) {
        return new Response("Evaluation attempt not found", { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Initial connection handshake
            const connectPayload = {
                status: "connected",
                attemptId,
                timestamp: Date.now()
            };
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify(connectPayload)}\n\n`)
            );

            // Handler for evaluation updates
            const onUpdate = (data: EvaluationUpdatePayload) => {
                try {
                    if (data.type === "TEACHER_MESSAGE") {
                        controller.enqueue(
                            encoder.encode(`event: teacher-message\ndata: ${JSON.stringify(data)}\n\n`)
                        );
                    }
                    controller.enqueue(
                        encoder.encode(`event: evaluation-updated\ndata: ${JSON.stringify(data)}\n\n`)
                    );
                } catch {
                    // Controller may already be closed if stream disconnected
                }
            };

            const attemptChannel = `attempt:${attemptId}`;
            const evalChannel = `evaluation:${attempt.evaluationId}`;

            evaluationEventBus.on(attemptChannel, onUpdate);
            evaluationEventBus.on(evalChannel, onUpdate);

            // Keep-alive heartbeat comment every 25 seconds
            const keepAliveTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: keep-alive\n\n`));
                } catch {
                    clearInterval(keepAliveTimer);
                }
            }, 25000);

            // Clean up when client disconnects or aborts
            req.signal.addEventListener("abort", () => {
                clearInterval(keepAliveTimer);
                evaluationEventBus.off(attemptChannel, onUpdate);
                evaluationEventBus.off(evalChannel, onUpdate);
                try {
                    controller.close();
                } catch {
                    // Ignored
                }
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
