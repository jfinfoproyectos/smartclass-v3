import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { InstructorScheduleProfile, ScheduleClassSlot } from "../types";
import { DAYS_CONFIG, INSTITUTION_COLORS } from "../constants/defaults";
import { 
  toFormat12h, 
  calculateSlotDurationHours, 
  computeScheduleStats, 
  timeToMinutes, 
  detectScheduleConflicts 
} from "../utils/storage";

export interface InstructorSchedulePDFProps {
  profile: InstructorScheduleProfile;
}

const HOUR_HEIGHT = 16.5; // Altura en puntos por cada franja de 1 hora
const MIN_HOUR = 6;       // 06:00 a.m.
const MAX_HOUR = 22;      // 10:00 p.m.
const TOTAL_HOURS = MAX_HOUR - MIN_HOUR; // 16 horas

const styles = StyleSheet.create({
  page: {
    padding: 22,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0284c7",
    paddingBottom: 6,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 1.5,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  mainTitle: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 7.5,
    color: "#475569",
  },
  badge: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
  },
  metaText: {
    fontSize: 6.5,
    color: "#64748b",
  },

  // KPI Row
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    padding: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  kpiLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  kpiSub: {
    fontSize: 5,
    color: "#94a3b8",
  },

  // Institutions Bar
  instRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
    padding: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  instChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  instDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  instName: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  instHours: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },

  // Weekly Grid Matrix
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: "#ffffff",
  },
  gridHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    height: 15,
  },
  gridHeaderTimeCell: {
    width: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#334155",
  },
  gridHeaderDayCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#334155",
  },
  gridHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    textAlign: "center",
  },

  gridBodyRow: {
    flexDirection: "row",
    height: TOTAL_HOURS * HOUR_HEIGHT,
    backgroundColor: "#ffffff",
  },
  timeAxisColumn: {
    width: 44,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  timeAxisCell: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  timeAxisText: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
  },

  dayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    position: "relative",
    height: TOTAL_HOURS * HOUR_HEIGHT,
    backgroundColor: "#ffffff",
  },
  hourGuideline: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },

  // Slot card placed chronologically
  slotCard: {
    position: "absolute",
    borderRadius: 3,
    borderWidth: 1,
    paddingVertical: 1.5,
    paddingHorizontal: 2.5,
    overflow: "hidden",
  },
  slotCardTitle: {
    fontSize: 5.2,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
  },
  slotCardGroup: {
    fontSize: 4.8,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
    marginTop: 0.5,
  },
  slotCardTime: {
    fontSize: 4.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 0.5,
  },
  slotCardRoom: {
    fontSize: 4.2,
    color: "#64748b",
    marginTop: 0.5,
  },

  // Table (Page 2)
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 6.5,
    color: "#1e293b",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 3,
  },
  footerText: {
    fontSize: 5.8,
    color: "#94a3b8",
  },
});

function formatHourLabel(hour: number): string {
  if (hour === 12) return "12:00 m.";
  if (hour === 0 || hour === 24) return "12:00 am";
  if (hour < 12) return `${String(hour).padStart(2, "0")}:00 am`;
  const h12 = hour - 12;
  return `${String(h12).padStart(2, "0")}:00 pm`;
}

export function InstructorSchedulePDF({ profile }: InstructorSchedulePDFProps) {
  const stats = computeScheduleStats(profile.slots, profile.institutions);
  const instMap = new Map(profile.institutions.map(i => [i.id, i]));
  const conflicts = detectScheduleConflicts(profile.slots, profile.institutions);
  const conflictingSlotIds = new Set<string>();
  conflicts.forEach(c => {
    conflictingSlotIds.add(c.slotA.id);
    conflictingSlotIds.add(c.slotB.id);
  });

  // Agrupar slots por día
  const slotsByDay: Record<string, ScheduleClassSlot[]> = {};
  DAYS_CONFIG.forEach(d => {
    slotsByDay[d.key] = profile.slots
      .filter(s => s.dayOfWeek === d.key)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Horas del eje vertical (6 a 21)
  const hoursArray = Array.from({ length: TOTAL_HOURS }, (_, i) => MIN_HOUR + i);

  // Slots ordenados cronológicamente para la tabla de la página 2
  const dayOrder: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };
  const sortedSlots = [...profile.slots].sort((a, b) => {
    const dayDiff = (dayOrder[a.dayOfWeek] ?? 0) - (dayOrder[b.dayOfWeek] ?? 0);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const currentDateFormatted = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={`Horario Semanal - ${profile.instructorName || "Instructor"}`} author="SmartClass Academic Engine">
      {/* PÁGINA 1: MATRIZ CRONOLÓGICA SEMANAL (HORARIO GRÁFICO OFICIAL) */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header Oficial */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>HORARIO SEMANAL CONSOLIDADO DEL INSTRUCTOR</Text>
            <Text style={styles.subTitle}>
              Docente: {profile.instructorName || "Instructor"} • Período: {profile.periodTitle || "Período Académico"} ({profile.academicYear || "2026"})
            </Text>
            {profile.notes ? <Text style={styles.metaText}>{profile.notes}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SMARTCLASS ACADEMIC SUITE</Text>
            </View>
            <Text style={styles.metaText}>Emitido: {currentDateFormatted}</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Carga Semanal Total</Text>
            <Text style={styles.kpiValue}>{stats.totalWeeklyHours} hrs</Text>
            <Text style={styles.kpiSub}>Horas cronológicas dictadas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Instituciones</Text>
            <Text style={styles.kpiValue}>{stats.activeInstitutionsCount}</Text>
            <Text style={styles.kpiSub}>Entidades académicas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Sesiones de Clase</Text>
            <Text style={styles.kpiValue}>{stats.totalClassesCount} bloques</Text>
            <Text style={styles.kpiSub}>En la semana académica</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Días Activos</Text>
            <Text style={styles.kpiValue}>{stats.activeDaysCount} de 7</Text>
            <Text style={styles.kpiSub}>Disponibilidad semanal</Text>
          </View>
        </View>

        {/* Leyenda de Instituciones */}
        {stats.institutionBreakdown.length > 0 && (
          <View style={styles.instRow}>
            <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#475569", alignSelf: "center", marginRight: 3 }}>
              INSTITUCIONES:
            </Text>
            {stats.institutionBreakdown.map(item => {
              const colorScheme = INSTITUTION_COLORS[item.institution.color] || INSTITUTION_COLORS.emerald;
              return (
                <View 
                  key={item.institution.id} 
                  style={[
                    styles.instChip, 
                    { borderColor: colorScheme.pdfBorderHex, backgroundColor: colorScheme.pdfBgHex }
                  ]}
                >
                  <View style={[styles.instDot, { backgroundColor: colorScheme.pdfHex }]} />
                  <Text style={[styles.instName, { color: colorScheme.pdfHex }]}>
                    {item.institution.shortName || item.institution.name}
                  </Text>
                  <Text style={styles.instHours}>
                    ({item.hours}h • {item.percentage}%)
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Matriz Semanal Cronológica que RESPETA LOS HORARIOS DE CADA GRUPO */}
        <Text style={styles.sectionTitle}>
          DISTRIBUCIÓN HORARIA SEMANAL (CRONOGRAMA EN TIEMPO REAL POR FRANJAS HORARIAS)
        </Text>

        <View style={styles.gridContainer}>
          {/* Fila de Encabezados: Columna de Hora + 7 Días */}
          <View style={styles.gridHeaderRow}>
            <View style={styles.gridHeaderTimeCell}>
              <Text style={styles.gridHeaderText}>HORA</Text>
            </View>
            {DAYS_CONFIG.map((day, idx) => (
              <View 
                key={day.key} 
                style={[
                  styles.gridHeaderDayCell, 
                  idx === DAYS_CONFIG.length - 1 ? { borderRightWidth: 0 } : {}
                ]}
              >
                <Text style={styles.gridHeaderText}>
                  {day.label.toUpperCase()} ({slotsByDay[day.key]?.length || 0})
                </Text>
              </View>
            ))}
          </View>

          {/* Cuerpo: Eje de Horas + 7 Columnas Cronológicas */}
          <View style={styles.gridBodyRow}>
            {/* Eje de Horas a la izquierda */}
            <View style={styles.timeAxisColumn}>
              {hoursArray.map((hour) => (
                <View key={hour} style={styles.timeAxisCell}>
                  <Text style={styles.timeAxisText}>{formatHourLabel(hour)}</Text>
                </View>
              ))}
            </View>

            {/* Columnas de los 7 días de la semana */}
            {DAYS_CONFIG.map((day, dIdx) => {
              const daySlots = slotsByDay[day.key] || [];
              const isLast = dIdx === DAYS_CONFIG.length - 1;

              return (
                <View
                  key={day.key}
                  style={[
                    styles.dayColumn,
                    isLast ? { borderRightWidth: 0 } : {},
                  ]}
                >
                  {/* Líneas guía horizontales por cada hora */}
                  {hoursArray.map((h) => (
                    <View key={h} style={styles.hourGuideline} />
                  ))}

                  {/* Tarjetas de Clases posicionadas en su horario y duración EXACTOS */}
                  {daySlots.map((slot) => {
                    const startMins = timeToMinutes(slot.startTime);
                    const endMins = timeToMinutes(slot.endTime);
                    const baseMins = MIN_HOUR * 60;

                    // Posicionamiento vertical exacto según la hora de inicio y duración
                    const top = ((startMins - baseMins) / 60) * HOUR_HEIGHT;
                    const height = Math.max(16, ((endMins - startMins) / 60) * HOUR_HEIGHT);

                    const inst = instMap.get(slot.institutionId);
                    const colorScheme = INSTITUTION_COLORS[inst?.color || "emerald"] || INSTITUTION_COLORS.emerald;
                    const duration = calculateSlotDurationHours(slot.startTime, slot.endTime);
                    const isConflict = conflictingSlotIds.has(slot.id);

                    // Si hay dos clases con solapamiento en el mismo día, ubicarlas lado a lado
                    const overlaps = daySlots.filter((o) => {
                      if (o.id === slot.id) return false;
                      const oStart = timeToMinutes(o.startTime);
                      const oEnd = timeToMinutes(o.endTime);
                      return startMins < oEnd && endMins > oStart;
                    });

                    let leftVal = "2%";
                    let widthVal = "96%";
                    if (overlaps.length > 0) {
                      const allGroup = [slot, ...overlaps].sort((a, b) => a.id.localeCompare(b.id));
                      const myIdx = allGroup.findIndex((s) => s.id === slot.id);
                      if (myIdx === 0) {
                        leftVal = "1%";
                        widthVal = "48%";
                      } else {
                        leftVal = "50%";
                        widthVal = "48%";
                      }
                    }

                    return (
                      <View
                        key={slot.id}
                        style={[
                          styles.slotCard,
                          {
                            top: top + 0.5,
                            left: leftVal,
                            width: widthVal,
                            height: height - 1,
                            backgroundColor: colorScheme.pdfBgHex,
                            borderColor: isConflict ? "#ef4444" : colorScheme.pdfBorderHex,
                            borderWidth: isConflict ? 1.5 : 0.8,
                          },
                        ]}
                      >
                        {/* Institución & Asignatura */}
                        <Text
                          style={[
                            styles.slotCardTitle,
                            { color: isConflict ? "#b91c1c" : colorScheme.pdfHex },
                          ]}
                        >
                          {inst?.shortName || inst?.name || "INST"} • {slot.subject}
                        </Text>

                        {/* Ficha / Grupo y Aula */}
                        <Text style={styles.slotCardGroup}>
                          {slot.groupCode}{slot.classroom ? ` • ${slot.classroom}` : ""}
                        </Text>

                        {/* Horario Exacto */}
                        <Text
                          style={[
                            styles.slotCardTime,
                            { color: isConflict ? "#ef4444" : colorScheme.pdfHex },
                          ]}
                        >
                          {toFormat12h(slot.startTime)} - {toFormat12h(slot.endTime)} ({duration}h)
                        </Text>

                        {/* Modalidad si la altura del bloque lo permite */}
                        {height >= 34 ? (
                          <Text style={styles.slotCardRoom}>
                            {slot.modality}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        {/* Pie de Página 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            SmartClass Academic Platform • Matriz Horaria Consolidada del Instructor (Página 1: Vista Semanal en Tiempo Real)
          </Text>
          <Text 
            style={styles.footerText} 
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
          />
        </View>
      </Page>

      {/* PÁGINA 2: AUDITORÍA DETALLADA DE ASIGNATURAS, FICHAS Y FIRMAS INSTITUCIONALES */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>AUDITORÍA DETALLADA DE ASIGNATURAS Y SESIONES</Text>
            <Text style={styles.subTitle}>
              Docente: {profile.instructorName || "Instructor"} • Consolidado de franjas y grupos programados
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.totalClassesCount} SESIONES • {stats.totalWeeklyHours} HORAS</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Relación Cronológica de Clases y Ambientes</Text>

        {sortedSlots.length === 0 ? (
          <View style={{ padding: 24, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, alignItems: "center" }}>
            <Text style={{ fontSize: 8, color: "#64748b" }}>No hay clases programadas en este período.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Día</Text>
              <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Horario (12h)</Text>
              <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Institución</Text>
              <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Asignatura / Módulo</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Ficha / Grupo</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Ambiente / Sede</Text>
              <Text style={[styles.tableHeaderCell, { width: "8%", textAlign: "right" }]}>Horas</Text>
            </View>

            {sortedSlots.map(slot => {
              const inst = instMap.get(slot.institutionId);
              const dayConf = DAYS_CONFIG.find(d => d.key === slot.dayOfWeek);
              const duration = calculateSlotDurationHours(slot.startTime, slot.endTime);
              const isConflict = conflictingSlotIds.has(slot.id);

              return (
                <View 
                  key={slot.id} 
                  style={[
                    styles.tableRow,
                    isConflict ? { backgroundColor: "#fef2f2" } : {}
                  ]}
                  wrap={false}
                >
                  <Text style={[styles.tableCell, { width: "12%", fontFamily: "Helvetica-Bold" }]}>
                    {dayConf?.label || slot.dayOfWeek}
                  </Text>
                  <Text style={[styles.tableCell, { width: "16%", fontFamily: isConflict ? "Helvetica-Bold" : "Helvetica", color: isConflict ? "#b91c1c" : "#1e293b" }]}>
                    {toFormat12h(slot.startTime)} - {toFormat12h(slot.endTime)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "16%" }]}>
                    {inst?.shortName || inst?.name || "-"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "22%", fontFamily: "Helvetica-Bold" }]}>
                    {slot.subject}
                  </Text>
                  <Text style={[styles.tableCell, { width: "12%" }]}>
                    {slot.groupCode}
                  </Text>
                  <Text style={[styles.tableCell, { width: "14%", color: "#64748b" }]}>
                    {slot.classroom || slot.modality}
                  </Text>
                  <Text style={[styles.tableCell, { width: "8%", textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                    {duration}h
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Pie de Página 2 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            SmartClass Academic Platform • Auditoría y Detalle Institucional de Carga Docente (Página 2)
          </Text>
          <Text 
            style={styles.footerText} 
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
          />
        </View>
      </Page>
    </Document>
  );
}
