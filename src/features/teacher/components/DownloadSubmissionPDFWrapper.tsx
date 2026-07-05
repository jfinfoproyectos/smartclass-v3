"use client";

import dynamic from "next/dynamic";
import type { DownloadSubmissionPDFProps } from "./DownloadSubmissionPDF";

// This wrapper exists solely to allow next/dynamic with ssr:false
// inside a Client Component (required by Next.js App Router).
const DownloadSubmissionPDFInner = dynamic(
    () => import("./DownloadSubmissionPDF").then(mod => mod.DownloadSubmissionPDF),
    { ssr: false }
);

export function DownloadSubmissionPDFWrapper(props: DownloadSubmissionPDFProps) {
    return <DownloadSubmissionPDFInner {...props} />;
}
