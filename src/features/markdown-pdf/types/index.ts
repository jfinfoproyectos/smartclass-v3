export type CoverStyle = "hero" | "cover-page" | "minimal" | "none";

export type CorporateColorScheme = 
  | "teal" 
  | "slate" 
  | "navy" 
  | "crimson" 
  | "emerald" 
  | "indigo" 
  | "amber" 
  | "cyber";

export type DocumentStatus = 
  | "OFFICIAL" 
  | "CONFIDENTIAL" 
  | "APPROVED" 
  | "DRAFT" 
  | "REVIEW";

export type PageSize = "A4" | "LETTER" | "LEGAL";
export type PageOrientation = "portrait" | "landscape";
export type FontFamily = "Helvetica" | "Times-Roman" | "Courier";

export interface SignatureConfig {
  id: string;
  label: string; // e.g., "Elaborado por", "Revisado por", "Aprobado por"
  name: string;
  role: string;
  entity?: string;
}

export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  institution: string;
  author: string;
  category: string;
  version: string;
  folioCode: string;
  dateStr: string;
  status: DocumentStatus;
}

export interface DocumentStyleConfig {
  coverStyle: CoverStyle;
  colorScheme: CorporateColorScheme;
  fontFamily: FontFamily;
  pageSize: PageSize;
  orientation: PageOrientation;
  showRunningHeader: boolean;
  showRunningFooter: boolean;
  showPageNumbers: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  customFooterText?: string;
  codeTheme: string;
  showLineNumbers: boolean;
  signatures: SignatureConfig[];
}

export interface MarkdownTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  defaultMetadata: Partial<DocumentMetadata>;
  defaultStyle?: Partial<DocumentStyleConfig>;
  content: string;
}
