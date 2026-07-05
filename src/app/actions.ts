"use server";

// Bridge file to maintain compatibility during refactoring
// Explicit exports to avoid Turbopack errors with "export *"

// From ../features/teacher/actions/courseActions
export {
    createCourseAction,
    cloneCourseAction,
    updateCourseAction,
    deleteCourseAction,
    toggleCourseRegistrationAction,
    updateRegistrationSettingsAction
} from "../features/teacher/actions/courseActions";

// From ../features/teacher/actions/activityActions
export {
    createActivityAction,
    updateActivityAction,
    deleteActivityAction
} from "../features/teacher/actions/activityActions";

// From ../features/teacher/actions/studentActions
export {
    addStudentToCourseAction,
    searchStudentsAction,
    removeStudentFromCourseAction,
    getStudentsForTeacherAction,
    getStudentCourseEnrollmentAction,
    getMissingSubmissionsAction,
    getStudentMissingActivitiesAction,
    getCourseStudentsAction,
    updateStudentStatusAction
} from "../features/teacher/actions/studentActions";

// From ../features/teacher/actions/gradingActions
export {
    deleteSubmissionAction,
    validateUniqueLinksAction,
    analyzeGitHubFileAction,
    finalizeGitHubGradingAction,
    gradeManualActivityAction,
    rejectManualActivityAction,
    improveFeedbackAction,
    gradePdfReviewAction
} from "../features/teacher/actions/gradingActions";

// From ../features/teacher/actions/enrollmentActions
export {
    approveEnrollmentAction,
    rejectEnrollmentAction
} from "../features/teacher/actions/enrollmentActions";

// From ../features/teacher/actions/attendanceActions
export {
    recordAttendanceAction,
    deleteAttendanceAction,
    generateLateCodeAction,
    deleteLateCodeAction,
    deleteJustificationAction,
    deleteAttendanceRecordAction,
    getAbsentStudentsForTodayAction
} from "../features/teacher/actions/attendanceActions";

// From ../features/teacher/actions/remarkActions
export {
    createRemarkAction,
    updateRemarkAction,
    deleteRemarkAction
} from "../features/teacher/actions/remarkActions";

// From ../features/teacher/actions/dashboardActions
export {
    getTeacherDashboardStatsAction
} from "../features/teacher/actions/dashboardActions";

// From ../features/teacher/actions/reportActions
export {
    getCourseGradesReportAction,
    getCourseAttendanceReportAction,
    getMultiCourseGradesReportAction,
    getCourseCompleteDataAction,
    getStudentCompleteDataAction,
    getCourseStudentsCompleteDataAction,
    getCourseDuplicateLinksAction
} from "../features/teacher/actions/reportActions";

// From ../features/teacher/actions/evaluationActions
export {
    createEvaluationAction,
    updateEvaluationAction,
    deleteEvaluationAction,
    createQuestionAction,
    updateQuestionAction,
    updateQuestionsOrderAction,
    deleteQuestionAction,
    assignEvaluationAction,
    unassignEvaluationAction,
    testQuestionWithAIAction,
    generateQuestionAction,
    generateAnswerAction,
    getGroupAIInsightsAction,
    getPlagiarismAnalysisAction,
    exportEvaluationAction,
    importEvaluationAction,
    updateEvaluationAssignmentAction,
    deleteEvaluationSubmissionAction
} from "../features/teacher/actions/evaluationActions";

// From ../features/student/actions/enrollmentActions
export {
    enrollStudentAction
} from "../features/student/actions/enrollmentActions";

// From ../features/student/actions/submissionActions
export {
    submitActivityAction,
    submitGithubActivityAction
} from "../features/student/actions/submissionActions";

// From ../features/student/actions/attendanceActions
export {
    getStudentAttendanceStatsAction,
    registerLateArrivalAction,
    registerAbsenceJustificationAction
} from "../features/student/actions/attendanceActions";

// From ../features/student/actions/remarkActions
export {
    getStudentRemarksAction
} from "../features/student/actions/remarkActions";

// From ../features/student/actions/gradingActions
export {
    gradeGoogleColabAction
} from "../features/student/actions/gradingActions";

// From ../features/student/actions/evaluationActions
export {
    registerExpulsionAction,
    saveAnswerAction,
    submitEvaluationAction,
    evaluateAnswerWithAIAction,
    useAiHintAction,
    useSecondChanceAction
} from "../features/student/actions/evaluationActions";

// From ../features/github/actions/githubActions
export {
    scanRepositoryAction,
    fetchRepoFilesAction,
    getGitHubSubmissionDetailsAction,
    getRepoStructureAction
} from "../features/github/actions/githubActions";

// From ../features/profile/actions/profileActions
export {
    getProfileAction,
    updateProfileAction
} from "../features/profile/actions/profileActions";

// From ../features/admin/actions/settingsActions
export {
    getGeminiApiKeyModeAction,
    getSettingsAction,
    updateSettingsAction
} from "../features/admin/actions/settingsActions";

