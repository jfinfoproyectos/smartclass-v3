import { repairFeedbackText } from "./src/features/teacher/services/ai/client";
import prisma from "./src/lib/prisma";

async function main() {
    const subs = await prisma.submission.findMany({
        where: {
            feedback: { not: null }
        }
    });
    
    let updatedCount = 0;
    
    for (const sub of subs) {
        if (sub.feedback) {
            const repaired = repairFeedbackText(sub.feedback);
            if (repaired !== sub.feedback) {
                await prisma.submission.update({
                    where: { id: sub.id },
                    data: { feedback: repaired }
                });
                updatedCount++;
            }
        }
    }
    console.log(`Successfully updated ${updatedCount} submissions to fix markdown newline formatting.`);
}
main().finally(() => prisma.$disconnect());
