import { getAIModel } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface PlagiarismMatch {
    studentA: { id: string; name: string };
    studentB: { id: string; name: string };
    similarityScore: number; // 0 to 1
    reason: string;
    isSuspicious: boolean;
}

/**
 * Basic Jaccard similarity for two strings.
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = new Set(str1.toLowerCase().split(/\s+/));
    const s2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    return intersection.size / union.size;
}

export async function analyzePlagiarism(
    evaluationTitle: string,
    submissions: Array<{
        userId: string;
        userName: string;
        answers: Array<{ questionId: string; content: string }>;
    }>,
    userId?: string
): Promise<PlagiarismMatch[]> {
    const matches: PlagiarismMatch[] = [];

    // 1. Initial heuristic check between all pairs
    for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
            const subA = submissions[i];
            const subB = submissions[j];

            let totalSimilarity = 0;
            let questionCount = 0;

            subA.answers.forEach(ansA => {
                const ansB = subB.answers.find(a => a.questionId === ansA.questionId);
                if (ansB) {
                    const sim = calculateSimilarity(ansA.content, ansB.content);
                    totalSimilarity += sim;
                    questionCount++;
                }
            });

            const avgSim = questionCount > 0 ? totalSimilarity / questionCount : 0;

            // If similarity is high (> 0.4), flag it for AI review or just reported
            if (avgSim > 0.4) {
                matches.push({
                    studentA: { id: subA.userId, name: subA.userName },
                    studentB: { id: subB.userId, name: subB.userName },
                    similarityScore: avgSim,
                    reason: "Alta coincidencia textual en múltiples respuestas.",
                    isSuspicious: avgSim > 0.7
                });
            }
        }
    }

    // 2. Optional: use AI to refine highly suspicious cases
    const highlySuspicious = matches.filter(m => m.similarityScore > 0.6);
    if (highlySuspicious.length > 0) {
        try {
            const model = await getAIModel(userId);
            const prompt = `
            Eres un experto en integridad académica. Analiza la similitud de respuestas entre pares de estudiantes para la evaluación "${evaluationTitle}".
            
            **CASOS A ANALIZAR**:
            ${highlySuspicious.map((m, idx) => `Caso ${idx + 1}: ${m.studentA.name} vs ${m.studentB.name} (Similitud base: ${(m.similarityScore * 100).toFixed(0)}%)`).join("\n")}
            
            **TU TAREA**:
            Para cada caso, determina si es un "Plagio Probable" (copiado directo o parafraseo mínimo) o una "Coincidencia Temática" (ambos usaron los mismos términos técnicos requeridos).
            `;

            const { object } = await generateObject({
                model,
                schema: z.object({
                    analysis: z.array(z.object({
                        index: z.number(),
                        isSuspicious: z.boolean(),
                        reason: z.string()
                    }))
                }),
                prompt,
            });

            if (object?.analysis) {
                object.analysis.forEach((a: any) => {
                    const match = highlySuspicious[a.index];
                    if (match) {
                        match.isSuspicious = a.isSuspicious;
                        match.reason = a.reason;
                    }
                });
            }
        } catch (error) {
            console.error("AI Plagiarism analysis failed:", error);
        }
    }

    return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}
