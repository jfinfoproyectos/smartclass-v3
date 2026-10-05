export type RecordingMode = "screen-cam" | "screen-only" | "cam-only";

export type BubblePosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export type BubbleSize = "sm" | "md" | "lg";

export type RecordingStatus = 
    | "idle" 
    | "configuring" 
    | "countdown" 
    | "recording" 
    | "paused" 
    | "review";

export interface StoredRecording {
    id: string;
    title: string;
    blob: Blob;
    duration: number; // in seconds
    sizeBytes: number;
    createdAt: string; // ISO date string
    thumbnailDataUrl: string;
    mode: RecordingMode;
    resolution?: string;
    mimeType: string;
}

export type StoredRecordingMeta = Omit<StoredRecording, "blob">;

export interface RecorderSettings {
    mode: RecordingMode;
    selectedCameraId: string;
    selectedMicId: string;
    cameraEnabled: boolean;
    micEnabled: boolean;
    bubblePosition: BubblePosition;
    bubbleSize: BubbleSize;
    isMirrored: boolean;
    countdownDuration: number; // default 3 seconds
    maxDurationMinutes: number; // 0 = unlimited, 5, 10, 15
    audioQuality: "standard" | "high";
    screenCaptureType: "monitor" | "window" | "browser";
}

