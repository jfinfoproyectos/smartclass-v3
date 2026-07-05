import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{
        courseId: string;
    }>;
}

export default async function Page({ params }: PageProps) {
    const { courseId } = await params;
    redirect(`/dashboard/teacher/courses/${courseId}`);
}
