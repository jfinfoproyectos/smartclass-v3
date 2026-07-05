
export interface GradeItem {
    id: string;
    activityId?: string | null;
    evaluationAttemptId?: string | null;
    weight: number;
    activity?: any;
    evaluationAttempt?: any;
}

export interface GradeGroup {
    id: string;
    name: string;
    weight: number;
    items: GradeItem[];
}

export interface GradeCategory {
    id: string;
    name: string;
    weight: number;
    groups: GradeGroup[];
}

export const calculateStudentGradeInGroup = (studentId: string, group: GradeGroup, activities: any[], evaluations: any[]) => {
    if (!group.items || group.items.length === 0) return { grade: 0, items: [] };
    
    let totalWeightedGrade = 0;
    let totalWeight = 0;

    const itemsWithGrades = group.items.map((item: any) => {
        let grade = 0;
        let title = "S/N";
        let link: string | null = null;
        let activityLink: string | null = null;
        
        if (item.activityId) {
            const activity = activities.find((a: any) => a.id === item.activityId);
            const submission = activity?.submissions?.find((s: any) => s.userId === studentId);
            grade = submission?.grade || 0;
            title = activity?.title || title;
            link = submission?.url || null;
            activityLink = activity?.statement || null;
        } else if (item.evaluationAttemptId) {
            const attempt = evaluations.find((e: any) => e.id === item.evaluationAttemptId);
            const submission = attempt?.submissions?.find((s: any) => s.userId === studentId);
            grade = submission?.score || 0; // Already in 0-5.0 scale
            title = attempt?.evaluation?.title || title;
            // Evaluacions don't have a simple direct submission URL for now
        }
        
        totalWeightedGrade += grade * item.weight;
        totalWeight += item.weight;

        return {
            id: item.id,
            title,
            weight: item.weight,
            grade,
            link,
            activityLink
        };
    });

    const groupAvg = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
    return { grade: groupAvg, items: itemsWithGrades };
};

export const calculateStudentGradeInCategory = (studentId: string, category: GradeCategory, activities: any[], evaluations: any[]) => {
    if (!category.groups || category.groups.length === 0) return { grade: 0, groups: [] };

    let totalWeightedGrade = 0;
    let totalWeight = 0;

    const groupsWithGrades = category.groups.map((group: any) => {
        const { grade, items } = calculateStudentGradeInGroup(studentId, group, activities, evaluations);
        totalWeightedGrade += grade * group.weight;
        totalWeight += group.weight;
        return {
            id: group.id,
            name: group.name,
            weight: group.weight,
            grade,
            items
        };
    });

    const catAvg = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
    return { grade: catAvg, groups: groupsWithGrades };
};

export const calculateFinalGrade = (studentId: string, categories: GradeCategory[], activities: any[], evaluations: any[]) => {
    let finalWeightedGrade = 0;
    let totalCategoryWeight = 0;

    const categoriesGrades = categories.map((category: any) => {
        const { grade, groups } = calculateStudentGradeInCategory(studentId, category, activities, evaluations);
        finalWeightedGrade += grade * category.weight;
        totalCategoryWeight += category.weight;
        return {
            id: category.id,
            name: category.name,
            weight: category.weight,
            grade,
            groups
        };
    });

    const finalGrade = totalCategoryWeight > 0 ? finalWeightedGrade / totalCategoryWeight : 0;
    return { finalGrade, categoriesGrades };
};
