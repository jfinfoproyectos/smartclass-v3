"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Terminal,
  GitBranch,
  CheckCircle2,
  Clock,
  Layers,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Code2,
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { submitActivityAction } from "../actions/submissionActions";
import { FeedbackViewer } from "./FeedbackViewer";
import { cn } from "@/lib/utils";

interface WorkshopActivityDetailsProps {
  activity: any;
  userId: string;
  studentName: string;
  isTeacherPreview?: boolean;
  onClosePreview?: () => void;
}

export function WorkshopActivityDetails({
  activity,
  userId,
  studentName,
  isTeacherPreview = false,
  onClosePreview
}: WorkshopActivityDetailsProps) {
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  // Parse workshopConfig from activity.description
  const { workshopConfig, rawDescription } = useMemo(() => {
    try {
      const parsed = JSON.parse(activity?.description || "{}");
      if (parsed.workshopConfig) {
        return {
          workshopConfig: parsed.workshopConfig,
          rawDescription: parsed.rawDescription || ""
        };
      }
    } catch {}
    return {
      workshopConfig: {
        type: activity?.type || "WORKSHOP_CODE",
        deliveryMode: "PRACTICE",
        language: "javascript",
        estimatedMinutes: 45,
        milestones: []
      },
      rawDescription: activity?.description || ""
    };
  }, [activity?.description, activity?.type]);

  const milestones: any[] = workshopConfig.milestones || [];
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [codePerMilestone, setCodePerMilestone] = useState<Record<number, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const submission = activity.submissions?.[0];
  const isSubmitted = !!submission;
  const isGraded = submission && submission.grade !== null && submission.grade !== undefined;

  // Initialize milestone codes
  useEffect(() => {
    if (milestones.length > 0) {
      const initialCode: Record<number, string> = {};
      milestones.forEach((m, idx) => {
        initialCode[idx] = m.starterCode || "";
      });
      setCodePerMilestone(initialCode);
    }
  }, [milestones]);

  const currentMilestone = milestones[activeStepIndex] || milestones[0] || {
    title: "Consigna",
    instructions: activity.statement || rawDescription || "Realiza los pasos indicados en la actividad.",
    starterCode: "",
    hintText: ""
  };

  const isCodeLab = activity.type === "WORKSHOP_CODE";
  const language = currentMilestone.language || workshopConfig.language || "javascript";

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código copiado al portapapeles");
  };

  const handleValidateStep = (stepIdx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepIdx]: true }));
    toast.success(`¡Paso ${stepIdx + 1} completado con éxito!`);
    if (stepIdx < milestones.length - 1) {
      setActiveStepIndex(stepIdx + 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("activityId", activity.id);
      
      // Submit repo url or serialized code
      if (!isCodeLab) {
        if (!repoUrl.trim()) {
          toast.error("Por favor ingresa la URL de tu repositorio GitHub.");
          setIsSubmitting(false);
          return;
        }
        formData.set("url", `${repoUrl.trim()}#${repoBranch.trim()}`);
      } else {
        const payload = JSON.stringify({
          completedMilestones: Object.keys(completedSteps).length,
          totalMilestones: milestones.length,
          solutions: codePerMilestone
        });
        formData.set("url", `code://${activity.id}?data=${encodeURIComponent(payload.slice(0, 500))}`);
      }

      const result = await submitActivityAction(null, formData);
      if (result?.error) {
        toast.error(result.message || "Error al enviar la actividad");
      } else {
        toast.success("¡Actividad entregada exitosamente!");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al entregar la actividad.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allCompleted = milestones.length > 0 && Object.keys(completedSteps).length >= milestones.length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 p-3.5 border-b border-border/80 bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-2 rounded-xl text-white font-bold",
            isCodeLab ? "bg-purple-600" : "bg-blue-600"
          )}>
            {isCodeLab ? <Terminal className="w-5 h-5" /> : <GitBranch className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-foreground truncate max-w-md">
                {activity.title}
              </h1>
              <Badge className={cn(
                "text-[10px] font-mono font-bold",
                isCodeLab
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              )}>
                {isCodeLab ? "Monaco Codelab" : "Taller GitHub"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {milestones.length} {milestones.length === 1 ? "Paso" : "Pasos"}
              </span>
              {workshopConfig.estimatedMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {workshopConfig.estimatedMinutes} min sugeridos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isTeacherPreview && onClosePreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClosePreview}
              className="text-xs h-8 px-2.5 font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            >
              Cerrar Vista Previa
            </Button>
          )}
          {isSubmitted ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold py-1 px-3 gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Entregado {isGraded ? `(Nota: ${submission.grade})` : "(En revisión)"}</span>
            </Badge>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              size="sm"
              className="gap-2 font-bold text-xs rounded-xl shadow-md shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Entregar Taller</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Step Navigator */}
      {milestones.length > 1 && (
        <div className="flex items-center gap-2 p-2 px-4 border-b border-border/60 bg-muted/20 overflow-x-auto scrollbar-none shrink-0">
          {milestones.map((m, idx) => {
            const isCompleted = !!completedSteps[idx];
            const isActive = activeStepIndex === idx;

            return (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : isCompleted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-background/80 text-muted-foreground border-border/60 hover:bg-muted/40"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-bold">
                    {idx + 1}
                  </span>
                )}
                <span>{m.title || `Paso ${idx + 1}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback Alert if Graded */}
      {isGraded && submission?.feedback && (
        <div className="p-3 border-b border-border/80 bg-primary/5">
          <FeedbackViewer feedback={submission.feedback} />
        </div>
      )}

      {/* Split Work Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Instructions & Hints */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-border/70 bg-card/40 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
                Paso {activeStepIndex + 1} de {milestones.length || 1}
              </Badge>
              {currentMilestone.suggestedMinutes && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{currentMilestone.suggestedMinutes} min
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-foreground">
              {currentMilestone.title || `Paso ${activeStepIndex + 1}`}
            </h2>
          </div>

          {/* Instructions Markdown */}
          <div className="prose dark:prose-invert prose-xs max-w-none leading-relaxed text-foreground/90 bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
            <ReactMarkdown>
              {currentMilestone.instructions || "Sigue las instrucciones del paso y escribe el código correspondiente."}
            </ReactMarkdown>
          </div>

          {/* Expected Validation Rule */}
          {currentMilestone.validationRule && (
            <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Criterio de Validación</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {currentMilestone.validationRule}
              </p>
            </div>
          )}

          {/* Hint Accordion */}
          {currentMilestone.hintText && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
              <button
                type="button"
                onClick={() => setShowHint((prev) => ({ ...prev, [activeStepIndex]: !prev[activeStepIndex] }))}
                className="flex items-center justify-between w-full text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>{showHint[activeStepIndex] ? "Ocultar Pista" : "💡 ¿Necesitas una pista?"}</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", showHint[activeStepIndex] && "rotate-90")} />
              </button>

              {showHint[activeStepIndex] && (
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-amber-500/10">
                  {currentMilestone.hintText}
                </p>
              )}
            </div>
          )}

          {/* Mark Milestone Completed Button */}
          <div className="pt-4 mt-auto">
            <Button
              onClick={() => handleValidateStep(activeStepIndex)}
              className={cn(
                "w-full rounded-2xl font-bold text-xs gap-2 shadow-sm transition-all",
                completedSteps[activeStepIndex]
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {completedSteps[activeStepIndex] ? "Paso Completado (Revalidar)" : "Marcar Paso como Resuelto"}
              </span>
            </Button>
          </div>
        </div>

        {/* Right Column: Monaco Code Editor or GitHub Connector */}
        <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-card overflow-hidden">
          {isCodeLab ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Editor Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-muted/40 shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono font-bold uppercase text-[11px]">{language}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (currentMilestone.starterCode) {
                        setCodePerMilestone((prev) => ({
                          ...prev,
                          [activeStepIndex]: currentMilestone.starterCode
                        }));
                        toast.info("Código base restaurado.");
                      }
                    }}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    title="Restablecer código base"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(codePerMilestone[activeStepIndex] || "")}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </Button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={language}
                  theme={editorTheme}
                  value={codePerMilestone[activeStepIndex] ?? currentMilestone.starterCode ?? ""}
                  onChange={(val) => {
                    setCodePerMilestone((prev) => ({
                      ...prev,
                      [activeStepIndex]: val || ""
                    }));
                  }}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    lineNumbers: "on",
                    wordWrap: "on"
                  }}
                />
              </div>
            </div>
          ) : (
            /* GitHub Repo Connector */
            <div className="flex flex-col h-full min-h-0 p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Repositorio GitHub del Estudiante</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conecta tu repositorio público o privado de GitHub. Desarrolla las consignas de cada paso en tu entorno local, realiza commits y haz push a tu rama.
                </p>
              </div>

              <div className="space-y-3 bg-card p-4 rounded-2xl border border-border/70">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">URL del Repositorio GitHub</label>
                  <Input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/usuario/mi-taller-logistica"
                    className="text-xs rounded-xl bg-background/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Rama de Trabajo (Branch)</label>
                  <Input
                    value={repoBranch}
                    onChange={(e) => setRepoBranch(e.target.value)}
                    placeholder="main"
                    className="text-xs rounded-xl bg-background/60 font-mono"
                  />
                </div>

                {repoUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5 rounded-xl border-border/80"
                  >
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Repositorio en GitHub</span>
                    </a>
                  </Button>
                )}
              </div>

              {/* Starter Code snippet for this milestone if available */}
              {currentMilestone.starterCode && (
                <div className="space-y-2 bg-card p-4 rounded-2xl border border-border/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Código Base para este Paso</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(currentMilestone.starterCode)}
                      className="h-6 px-2 text-[11px] gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono bg-muted/40 p-3 rounded-xl overflow-x-auto text-foreground">
                    {currentMilestone.starterCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
