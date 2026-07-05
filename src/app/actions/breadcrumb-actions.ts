"use server";

import { courseService } from "@/features/teacher/services/courseService";
import { activityService } from "@/features/teacher/services/activityService";

export async function getCourseTitle(courseId: string): Promise<string | null> {
    try {
        const course = await courseService.getCourseById(courseId);
        return course?.title || null;
    } catch (error) {
        console.error("Error fetching course title:", error);
        return null;
    }
}

export async function getActivityTitle(activityId: string): Promise<string | null> {
    try {
        const activity = await activityService.getActivityWithSubmissions(activityId);
        return activity?.title || null;
    } catch (error) {
        console.error("Error fetching activity title:", error);
        return null;
    }
}
