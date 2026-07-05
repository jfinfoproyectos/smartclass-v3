"use server";

import { updateStudentStatusAction } from "./studentActions";

export async function approveEnrollmentAction(enrollmentId: string) {
    return await updateStudentStatusAction(enrollmentId, 'APPROVED');
}

export async function rejectEnrollmentAction(enrollmentId: string) {
    return await updateStudentStatusAction(enrollmentId, 'REJECTED');
}
