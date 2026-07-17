import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface ActivityReportTemplateProps {
    activity: any;
    submission: any;
    studentName: string;
}

export const ActivityReportTemplate = React.forwardRef<HTMLDivElement, ActivityReportTemplateProps>(
    ({ activity, submission, studentName }, ref) => {
        const filePaths = activity.filePaths ? activity.filePaths.split(',') : [];

        return (
            <div ref={ref} className="bg-white text-slate-900 print:max-w-none">
                {/* Print Styles */}
                <style type="text/css" media="print">
                    {`
                        @page { 
                            size: A4; 
                            margin: 0mm; 
                        }
                        body { 
                            -webkit-print-color-adjust: exact; 
                            margin: 0mm;
                        }
                        /* Hide default browser header/footer */
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    `}
                </style>

                {/* Main Container with Padding for Print */}
                <div className="print:p-[20mm] p-8 max-w-[210mm] mx-auto">
                    <header className="border-b-2 border-blue-600 pb-6 mb-8 flex justify-between items-start">
                        <div>

                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{activity.title}</h1>
                            <h2 className="text-lg text-slate-600 font-medium">{activity.course.title}</h2>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-center min-w-[100px]">
                                <span className="block text-3xl font-bold text-blue-600">
                                    {submission?.grade?.toFixed(1) || '-'}
                                </span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Nota Final
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* Meta Info */}
                    <div className="grid grid-cols-3 gap-6 mb-10 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Estudiante
                            </div>
                            <div className="font-medium text-sm">{studentName}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Fecha de Entrega
                            </div>
                            <div className="font-medium text-sm">
                                {submission?.submittedAt ? format(new Date(submission.submittedAt), "PP p", { locale: es }) : 'N/A'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Repositorio
                            </div>
                            <div className="font-medium text-sm text-blue-600 break-all">
                                {submission?.url || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-10">

                        {/* Required Files */}
                        {filePaths.length > 0 && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 break-inside-avoid">
                                <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-slate-700">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    Archivos Requeridos para Evaluación
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {filePaths.map((path: string, index: number) => (
                                        <Badge key={index} variant="outline" className="font-mono text-xs bg-white text-slate-700 border-slate-300">
                                            {path.trim()}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Statement */}
                        <section>
                            <h3 className="text-lg font-bold text-blue-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide">
                                Enunciado / Rúbrica de Evaluación
                            </h3>
                            <div data-color-mode="light" className="prose prose-sm max-w-none prose-blue">
                                <MDEditor.Markdown source={activity.statement || "**No hay rúbrica disponible.**"} style={{ background: 'transparent', color: 'inherit' }} />
                            </div>
                        </section>

                        {/* 3. Feedback */}
                        <section className="break-before-page">
                            <h3 className="text-lg font-bold text-blue-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide">
                                Retroalimentación
                            </h3>
                            <div data-color-mode="light" className="prose prose-sm max-w-none prose-blue">
                                <MDEditor.Markdown source={submission?.feedback?.replace(/\\n/g, '\n') || "Sin comentarios adicionales."} style={{ background: 'transparent', color: 'inherit' }} />
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <footer className="mt-16 pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                        <div>Generado por EIA Learning System</div>
                        <div>{format(new Date(), "PP", { locale: es })}</div>
                    </footer>
                </div>
            </div>
        );
    }
);

ActivityReportTemplate.displayName = 'ActivityReportTemplate';
