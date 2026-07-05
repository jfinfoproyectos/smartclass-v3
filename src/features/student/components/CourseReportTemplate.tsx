import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CourseReportTemplateProps {
    studentName: string;
    courseName: string;
    teacherName: string;
    averageGrade: number;
    activities: any[];
    categories?: any[];
    attendances: any[];
    remarks: any[];
}

export const CourseReportTemplate = React.forwardRef<HTMLDivElement, CourseReportTemplateProps>(
    ({ studentName, courseName, teacherName, averageGrade, activities, categories, attendances = [], remarks = [] }, ref) => {

        // Calculate Attendance Stats
        const totalClasses = attendances.length;
        const presentCount = attendances.filter(a => a.status === "PRESENT").length;
        const absentCount = attendances.filter(a => a.status === "ABSENT").length;
        const lateCount = attendances.filter(a => a.status === "LATE").length;
        const excusedCount = attendances.filter(a => a.status === "EXCUSED").length;
        const attendancePercentage = totalClasses > 0
            ? ((presentCount + lateCount) / totalClasses) * 100
            : 100;

        return (
            <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white text-black font-sans print:p-0 print:max-w-none">
                <style type="text/css" media="print">
                    {`
                        @page { 
                            size: auto; 
                            margin: 20mm; 
                        }
                        body { 
                            -webkit-print-color-adjust: exact; 
                        }
                        /* Hide browser headers and footers */
                        @media print {
                            @page { margin: 0; }
                            body { margin: 1.6cm; }
                        }
                    `}
                </style>
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-4 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Informe de Desempeño Académico</h1>
                        <h2 className="text-xl text-gray-700">{courseName}</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Fecha de generación</div>
                        <div className="font-medium">{format(new Date(), "PPP", { locale: es })}</div>
                    </div>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Estudiante</div>
                        <div className="text-lg font-bold text-gray-900">{studentName}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Profesor</div>
                        <div className="text-lg font-medium text-gray-900">{teacherName}</div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="mb-8 grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-blue-600 uppercase tracking-wider mb-1">Promedio Acumulado</div>
                            <div className="text-4xl font-bold text-blue-900">{averageGrade.toFixed(1)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-blue-600 mb-1">Actividades Evaluadas</div>
                            <div className="text-xl font-bold text-blue-900">
                                {activities.filter(a => a.submissions[0]?.grade !== null).length} / {activities.length}
                            </div>
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-emerald-600 uppercase tracking-wider mb-1">Asistencia</div>
                            <div className="text-4xl font-bold text-emerald-900">{attendancePercentage.toFixed(0)}%</div>
                        </div>
                        <div className="text-right text-sm text-emerald-800">
                            <div>Presente: {presentCount}</div>
                            <div>Tarde: {lateCount}</div>
                            <div>Ausente: {absentCount}</div>
                            <div>Excusado: {excusedCount}</div>
                        </div>
                    </div>
                </div>

                {/* Activities Detail */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Detalle de Calificaciones</h3>
                    
                    {categories && categories.length > 0 ? (
                        <div className="space-y-6">
                            {categories.map((cat: any) => (
                                <div key={cat.id} className="border rounded-lg overflow-hidden border-gray-300">
                                    <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
                                        <span className="font-bold uppercase text-sm tracking-wider">{cat.name}</span>
                                        <span className="text-sm font-bold">Corte: {cat.grade.toFixed(1)} ({cat.weight}%)</span>
                                    </div>
                                    <div className="p-0">
                                        {cat.groups.map((group: any) => (
                                            <div key={group.id} className="border-b last:border-0 border-gray-200">
                                                <div className="bg-gray-100 px-4 py-1.5 flex justify-between items-center text-xs font-bold text-gray-700">
                                                    <span>{group.name} ({group.weight}%)</span>
                                                    <span>Promedio: {group.grade.toFixed(1)}</span>
                                                </div>
                                                <table className="w-full text-left border-collapse">
                                                    <tbody>
                                                        {group.items.map((item: any) => (
                                                            <tr key={item.id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                                                                <td className="py-2 px-4 text-sm text-gray-900">
                                                                    {item.activityLink ? (
                                                                        <a href={item.activityLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                            {item.title}
                                                                        </a>
                                                                    ) : (
                                                                        item.title
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-4 text-center text-xs text-gray-500 w-24">Peso: {item.weight}%</td>
                                                                <td className="py-2 px-4 text-right font-bold text-sm text-gray-900 w-24">{item.grade.toFixed(1)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="py-3 px-2 font-bold text-gray-700 w-12">#</th>
                                    <th className="py-3 px-2 font-bold text-gray-700">Actividad</th>
                                    <th className="py-3 px-2 font-bold text-gray-700 text-center">Peso</th>
                                    <th className="py-3 px-2 font-bold text-gray-700 text-center">Estado</th>
                                    <th className="py-3 px-2 font-bold text-gray-700 text-center">Entrega(s)</th>
                                    <th className="py-3 px-2 font-bold text-gray-700 text-right">Nota</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((activity, index) => {
                                    const submission = activity.submissions[0];
                                    const isGraded = submission && submission.grade !== null;
                                    const isSubmitted = !!submission;

                                    return (
                                        <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-2 text-gray-500">{index + 1}</td>
                                            <td className="py-3 px-2 font-medium text-gray-900">
                                                {activity.statement ? (
                                                    <a href={activity.statement} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        {activity.title}
                                                    </a>
                                                ) : (
                                                    activity.title
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-center text-gray-600">{activity.weight.toFixed(1)}%</td>
                                            <td className="py-3 px-2 text-center">
                                                {isGraded ? (
                                                    <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                                                        Calificado
                                                    </span>
                                                ) : isSubmitted ? (
                                                    <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
                                                        Enviado
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                {submission?.url && (submission.url.startsWith('http://') || submission.url.startsWith('https://')) ? (
                                                    <a href={submission.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs block truncate max-w-[200px] mx-auto" title={submission.url}>
                                                        Ver Entrega
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-gray-900">
                                                {isGraded ? submission.grade.toFixed(1) : (!isSubmitted && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL') ? "0.0" : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Attendance Detail Table */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Historial de Asistencia</h3>
                    {attendances.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="py-3 px-2 font-bold text-gray-700">Fecha</th>
                                    <th className="py-3 px-2 font-bold text-gray-700">Estado</th>
                                    <th className="py-3 px-2 font-bold text-gray-700">Justificación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.map((record) => (
                                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-2 text-gray-900">
                                            {format(new Date(record.date), "PPP", { locale: es })}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${record.status === "PRESENT" ? "bg-green-100 text-green-800" :
                                                record.status === "ABSENT" ? "bg-red-100 text-red-800" :
                                                    record.status === "LATE" ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-blue-100 text-blue-800"
                                                }`}>
                                                {record.status === "PRESENT" ? "Presente" :
                                                    record.status === "ABSENT" ? "Ausente" :
                                                        record.status === "LATE" ? "Tarde" : "Excusado"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-gray-600 text-sm">
                                            <div>{record.justification || "-"}</div>
                                            {record.justificationUrl && (
                                                <a
                                                    href={record.justificationUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-xs mt-1 inline-flex items-center gap-1"
                                                >
                                                    Ver Soporte
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500 italic">No hay registros de asistencia.</p>
                    )}
                </div>

                {/* Remarks Section */}
                {remarks.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Observaciones</h3>
                        <div className="space-y-4">
                            {remarks.map((remark) => (
                                <div
                                    key={remark.id}
                                    className={`p-4 rounded-lg border ${remark.type === "ATTENTION"
                                        ? "bg-red-50 border-red-100"
                                        : "bg-green-50 border-green-100"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider mb-1 ${remark.type === "ATTENTION" ? "text-red-700 bg-red-100" : "text-green-700 bg-green-100"
                                                }`}>
                                                {remark.type === "ATTENTION" ? "Llamado de Atención" : "Felicitación"}
                                            </span>
                                            <h4 className="font-bold text-gray-900">{remark.title}</h4>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {format(new Date(remark.date), "PPP", { locale: es })}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 text-sm">{remark.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}

            </div>
        );
    }
);

CourseReportTemplate.displayName = "CourseReportTemplate";
