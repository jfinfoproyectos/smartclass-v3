/**
 * Utility for detecting fraud, evasion, and explicit answer/solution solicitations
 * in student submissions (text and code questions).
 */

export interface FraudDetectionResult {
    isFraud: boolean;
    reason?: string;
    detectedPattern?: string;
    reflectionMessage: string;
}

export const FRAUD_DETENTION_TITLE = "Detención por Intento de Fraude e Integridad Académica";

export const FRAUD_REFLECTION_TEXT = `### 🚨 DETENCIÓN POR FALTA DE INTEGRIDAD ACADÉMICA

**Se ha detectado un intento explícito de solicitar la solución directa o evadir la evaluación académica.**

---

#### 🧠 Reflexión Ética sobre el Aprendizaje
La evaluación no es una competencia para burlar el sistema ni un trámite de copiado. Su propósito es **medir tu razonamiento genuino, comprensión profunda y capacidades profesionales**. 

Solicitar que el sistema o la inteligencia artificial te proporcione la respuesta o resuelva el ejercicio por ti atenta contra los principios de honestidad intelectual, demerita el valor de tu propio proceso formativo y vulnera el reglamento institucional. El verdadero aprendizaje se consolida al afrontar la incertidumbre y resolver problemas con tu propio criterio y esfuerzo.

---

#### 📋 Medidas Disciplinarias y de Auditoría Aplicadas
1. **Sin Solución:** En estricto apego a las normas académicas, **bajo ninguna circunstancia se te entregará la respuesta, código resuelto ni pistas de solución**.
2. **Evidencia Registrada:** Tu texto exacto ha sido archivado en la base de datos como **evidencia forense de intento de fraude**.
3. **Notificación al Profesor:** Este evento ha sido notificado en tiempo real al docente en su panel de supervisión con la fecha y hora exacta.
4. **Calificación:** Esta pregunta recibe automáticamente una calificación de **0.0 / 5.0**.

> *Te instamos a responder con honestidad utilizando tus propios conocimientos.*
`;


/**
 * Legacy stub: Semantic fraud detection is performed natively by the LLM (AI)
 * during evaluateStudentAnswer and getAiHint, without phrase dictionaries.
 */
export function detectFraudOrAnswerSolicitation(_studentAnswer?: string | null): FraudDetectionResult {
    return {
        isFraud: false,
        reflectionMessage: FRAUD_REFLECTION_TEXT
    };
}

