import { EventEmitter } from "events";

export interface EvaluationUpdatePayload {
    evaluationId?: string;
    attemptId?: string;
    submissionId?: string;
    studentId?: string;
    type: 
        | "ASSIGNMENT_UPDATED" 
        | "EVALUATION_UPDATED" 
        | "QUESTION_UPDATED" 
        | "PENALTY_UPDATED" 
        | "TIME_LIMIT_EXCEEDED"
        | "TEACHER_MESSAGE"
        | "SUBMISSION_UPDATED"
        | "EVALUATION_LOCKED"
        | "EVALUATION_UNLOCKED"
        | "PING";
    timestamp: number;
    message?: string;
    senderName?: string;
    isLocked?: boolean;
}

class EvaluationEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Allow multiple concurrent students to listen without node warning
        this.setMaxListeners(200);
    }
}

// Preserve bus across Next.js HMR in development
const globalForEvents = globalThis as unknown as {
    evaluationEventBus?: EvaluationEventEmitter;
};

export const evaluationEventBus =
    globalForEvents.evaluationEventBus || new EvaluationEventEmitter();

if (process.env.NODE_ENV !== "production") {
    globalForEvents.evaluationEventBus = evaluationEventBus;
}

/**
 * Emit an update notification to students listening via SSE.
 */
export function emitEvaluationUpdate(payload: EvaluationUpdatePayload) {
    if (payload.attemptId) {
        evaluationEventBus.emit(`attempt:${payload.attemptId}`, payload);
    }
    if (payload.evaluationId) {
        evaluationEventBus.emit(`evaluation:${payload.evaluationId}`, payload);
    }
    evaluationEventBus.emit("all", payload);
}
