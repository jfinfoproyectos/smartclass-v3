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
  Check,
  Search,
  FolderGit2,
  ArrowRight,
  BookOpen,
  FileCode,
  Lock,
  RefreshCw,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { submitActivityAction } from "../actions/submissionActions";
import { verifyWorkshopGithubStepAction, VerifyStepResult } from "../actions/workshopActions";
import { FeedbackViewer } from "./FeedbackViewer";
import { cn } from "@/lib/utils";

interface WorkshopActivityDetailsProps {
  activity: any;
  userId: string;
  studentName: string;
  isTeacherPreview?: boolean;
  onClosePreview?: () => void;
}

function parseRepo(url: string) {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, "");
      return { owner, repo, fullName: `${owner}/${repo}` };
    }
  } catch {}
  return null;
}

function getMonacoLanguage(lang?: string, filePath?: string): string {
  if (filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "js" || ext === "jsx") return "javascript";
    if (ext === "ts" || ext === "tsx") return "typescript";
    if (ext === "py") return "python";
    if (ext === "java") return "java";
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "json") return "json";
    if (ext === "md") return "markdown";
    if (ext === "sql") return "sql";
    if (ext === "sh") return "shell";
  }
  if (!lang) return "javascript";
  const l = lang.toLowerCase();
  if (l === "node" || l === "js") return "javascript";
  if (l === "ts") return "typescript";
  return l;
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
        deliveryMode: "TUTORIAL",
        language: "javascript",
        estimatedMinutes: 45,
        milestones: []
      },
      rawDescription: activity?.description || ""
    };
  }, [activity?.description, activity?.type]);

  const milestones: any[] = workshopConfig.milestones || [];
  const isCodeLab = activity.type === "WORKSHOP_CODE";

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [codePerMilestone, setCodePerMilestone] = useState<Record<number, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  
  // GitHub específico
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Record<number, VerifyStepResult>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFilePath, setCopiedFilePath] = useState(false);
  const [copiedCmdIdx, setCopiedCmdIdx] = useState<number | null>(null);

  const submission = activity.submissions?.[0];
  const isSubmitted = !!submission;
  const isGraded = submission && submission.grade !== null && submission.grade !== undefined;

  // Cargar estado guardado en LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined" && activity?.id && userId) {
      try {
        const savedRepo = localStorage.getItem(`smartclass_w_repo_${activity.id}_${userId}`);
        if (savedRepo && !repoUrl) setRepoUrl(savedRepo);

        const savedBranch = localStorage.getItem(`smartclass_w_branch_${activity.id}_${userId}`);
        if (savedBranch && (!repoBranch || repoBranch === "main")) setRepoBranch(savedBranch);

        const savedCompleted = localStorage.getItem(`smartclass_w_steps_${activity.id}_${userId}`);
        if (savedCompleted) {
          const parsed = JSON.parse(savedCompleted);
          if (parsed && typeof parsed === "object") {
            setCompletedSteps(parsed);
          }
        }
      } catch (e) {
        console.warn("Error cargando caché local del taller:", e);
      }
    }
  }, [activity?.id, userId]);

  // Initialize milestone codes
  useEffect(() => {
    if (milestones.length > 0) {
      const initialCode: Record<number, string> = {};
      milestones.forEach((m, idx) => {
        initialCode[idx] = m.starterCode || m.targetFileContent || "";
      });
      setCodePerMilestone(initialCode);
    }
  }, [milestones]);

  const currentMilestone = milestones[activeStepIndex] || milestones[0] || {
    title: "Consigna",
    instructions: activity.statement || rawDescription || "Realiza los pasos indicados en la actividad.",
    starterCode: "",
    targetFilePath: "src/index.js",
    targetFileContent: "",
    gitCommands: [],
    hintText: ""
  };

  const currentFilePath = currentMilestone.targetFilePath || "src/index.js";
  const currentLanguage = getMonacoLanguage(workshopConfig.language, currentFilePath);

  // Comandos Git predeterminados si el paso no los define
  const currentGitCommands: Array<{ command: string; explanation: string }> = 
    (currentMilestone.gitCommands && currentMilestone.gitCommands.length > 0)
      ? currentMilestone.gitCommands
      : [
          { command: `git add ${currentFilePath || "."}`, explanation: "Prepara los cambios del archivo para el próximo commit." },
          { command: `git commit -m "feat: completar paso ${activeStepIndex + 1}"`, explanation: "Confirma los cambios en el historial de Git local." },
          { command: `git push origin ${repoBranch || "main"}`, explanation: "Sube los cambios confirmados a tu repositorio remoto en GitHub." }
        ];

  const parsedRepoInfo = useMemo(() => {
    return repoUrl ? parseRepo(repoUrl) : null;
  }, [repoUrl]);

  const handleUpdateRepoUrl = (val: string) => {
    setRepoUrl(val);
    if (typeof window !== "undefined" && activity?.id && userId) {
      localStorage.setItem(`smartclass_w_repo_${activity.id}_${userId}`, val);
    }
  };

  const handleUpdateRepoBranch = (val: string) => {
    setRepoBranch(val);
    if (typeof window !== "undefined" && activity?.id && userId) {
      localStorage.setItem(`smartclass_w_branch_${activity.id}_${userId}`, val);
    }
  };

  const markStepAsCompletedInStorage = (stepIdx: number) => {
    setCompletedSteps((prev) => {
      const updated = { ...prev, [stepIdx]: true };
      if (typeof window !== "undefined" && activity?.id && userId) {
        localStorage.setItem(`smartclass_w_steps_${activity.id}_${userId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success("Código copiado al portapapeles");
  };

  const handleCopyFilePath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedFilePath(true);
    setTimeout(() => setCopiedFilePath(false), 2000);
    toast.success("Ruta del archivo copiada");
  };

  const handleCopyGitCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdIdx(idx);
    setTimeout(() => setCopiedCmdIdx(null), 2000);
    toast.success(`Comando '${cmd}' copiado`);
  };

  const handleCopyAllGitCommands = () => {
    const all = currentGitCommands.map(c => c.command).join("\n");
    navigator.clipboard.writeText(all);
    toast.success("Secuencia completa de comandos copiada");
  };

  // Verificación en Codelab
  const handleValidateCodelabStep = (stepIdx: number) => {
    markStepAsCompletedInStorage(stepIdx);
    toast.success(`¡Paso ${stepIdx + 1} completado con éxito!`);
    if (stepIdx < milestones.length - 1) {
      setActiveStepIndex(stepIdx + 1);
    }
  };

  // Verificación en GitHub (Tutorial GitHub)
  const handleVerifyStepInGitHub = async (stepIdx: number) => {
    if (!repoUrl.trim()) {
      toast.error("Por favor ingresa primero la URL de tu repositorio GitHub.");
      return;
    }

    setIsVerifying(true);
    const toastId = toast.loading(`Verificando paso ${stepIdx + 1} en GitHub...`, {
      description: `Consultando repositorio y rama '${repoBranch || "main"}'...`
    });

    try {
      const result = await verifyWorkshopGithubStepAction({
        activityId: activity.id,
        repoUrl: repoUrl.trim(),
        branch: repoBranch.trim() || "main",
        stepIndex: stepIdx,
        milestone: currentMilestone
      });

      setVerificationResults((prev) => ({ ...prev, [stepIdx]: result }));

      if (result.success) {
        markStepAsCompletedInStorage(stepIdx);
        toast.success(`¡Paso ${stepIdx + 1} verificado con éxito en GitHub!`, {
          id: toastId,
          description: result.message
        });
      } else {
        toast.error(`Paso ${stepIdx + 1} no verificado`, {
          id: toastId,
          description: result.message
        });
      }
    } catch (err: any) {
      console.error("Error al verificar paso en GitHub:", err);
      toast.error("Error al consultar la API de GitHub", {
        id: toastId,
        description: err?.message || "Comprueba tu conexión e intenta de nuevo."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("activityId", activity.id);

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
        toast.success("¡Tutorial entregado exitosamente para evaluación docente!");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al entregar el tutorial.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCompleted = Object.keys(completedSteps).filter(k => !!completedSteps[Number(k)]).length;
  const isCurrentStepCompleted = !!completedSteps[activeStepIndex];
  const lastVerification = verificationResults[activeStepIndex];

  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 p-3.5 border-b border-border/80 bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-2 rounded-xl text-white font-bold shadow-xs",
            isCodeLab ? "bg-purple-600" : "bg-gradient-to-br from-orange-500 to-amber-600"
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
                  : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400"
              )}>
                {isCodeLab ? "Monaco Codelab" : "Tutorial GitHub"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Layers className="w-3 h-3 text-primary" />
                {totalCompleted} de {milestones.length} pasos completados
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
              className="text-xs h-8 px-2.5 font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
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
              className={cn(
                "gap-2 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer",
                totalCompleted >= milestones.length
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isCodeLab ? "Entregar Codelab" : "Entregar Tutorial GitHub"}</span>
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
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
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
        {/* Left Column: Instructions & Project Guidelines */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-border/70 bg-card/40 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider bg-muted/40">
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
              {currentMilestone.instructions || "Sigue las instrucciones del paso y realiza los avances correspondientes."}
            </ReactMarkdown>
          </div>

          {/* Expected Validation Rule */}
          {currentMilestone.validationRule && (
            <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Criterio de Validación Automática</span>
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
                className="flex items-center justify-between w-full text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
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

          {/* Codelab validation button (only for WORKSHOP_CODE) */}
          {isCodeLab && (
            <div className="pt-4 mt-auto">
              <Button
                onClick={() => handleValidateCodelabStep(activeStepIndex)}
                className={cn(
                  "w-full rounded-2xl font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer",
                  isCurrentStepCompleted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCurrentStepCompleted ? "Paso Completado (Revalidar)" : "Marcar Paso como Resuelto"}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Code Editor (Codelab) OR Interactive GitHub Step Runner */}
        <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-card overflow-hidden">
          {isCodeLab ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Editor Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-muted/40 shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono font-bold uppercase text-[11px]">{currentLanguage}</span>
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
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    title="Restablecer código base"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(codePerMilestone[activeStepIndex] || "")}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </Button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={currentLanguage}
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
            /* Tutorial GitHub Runner */
            <div className="flex flex-col h-full min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
              
              {/* Tarjeta 1: Vinculación de Repositorio GitHub del Estudiante */}
              <div className="p-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.04] to-amber-500/[0.02] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Repositorio GitHub del Estudiante
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        Vincula tu repositorio para que la plataforma verifique tus avances en cada paso.
                      </p>
                    </div>
                  </div>

                  {parsedRepoInfo && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-mono gap-1 px-2 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{parsedRepoInfo.fullName}</span>
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">URL del Repositorio</label>
                    <Input
                      value={repoUrl}
                      onChange={(e) => handleUpdateRepoUrl(e.target.value)}
                      placeholder="https://github.com/usuario/mi-proyecto"
                      className="h-8 text-xs bg-background/80"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Rama (Branch)</label>
                    <Input
                      value={repoBranch}
                      onChange={(e) => handleUpdateRepoBranch(e.target.value)}
                      placeholder="main"
                      className="h-8 text-xs font-mono bg-background/80"
                    />
                  </div>
                </div>

                {repoUrl && (
                  <div className="flex items-center justify-between pt-1 border-t border-orange-500/15 text-[11px]">
                    <span className="text-muted-foreground text-[10px]">
                      Los avances se comprobarán en la rama <strong className="font-mono text-foreground">{repoBranch || "main"}</strong>
                    </span>
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
                    >
                      <span>Abrir en GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Tarjeta 2: Archivo a Crear o Modificar en el Repositorio */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block">
                        Archivo a crear o modificar en tu proyecto
                      </span>
                      <code className="text-[11px] text-primary font-mono font-bold truncate block">
                        {currentFilePath}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyFilePath(currentFilePath)}
                      className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                      title="Copiar ruta del archivo"
                    >
                      {copiedFilePath ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Ruta</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(currentMilestone.targetFileContent || currentMilestone.starterCode || "")}
                      disabled={!(currentMilestone.targetFileContent || currentMilestone.starterCode)}
                      className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                      title="Copiar código del archivo"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Código</span>
                    </Button>
                  </div>
                </div>

                {/* Visor de Código Fuente de Referencia / Plantilla */}
                {(currentMilestone.targetFileContent || currentMilestone.starterCode) ? (
                  <div className="rounded-xl border border-border/80 overflow-hidden bg-muted/20">
                    <div className="px-3 py-1.5 border-b border-border/60 bg-muted/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{currentFilePath}</span>
                      <span>{currentLanguage.toUpperCase()}</span>
                    </div>
                    <div className="h-44">
                      <Editor
                        height="100%"
                        language={currentLanguage}
                        theme={editorTheme}
                        value={currentMilestone.targetFileContent || currentMilestone.starterCode || ""}
                        options={{
                          readOnly: true,
                          fontSize: 12,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                          domReadOnly: true,
                          wordWrap: "on"
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                    Crea el archivo <code className="font-mono text-foreground">{currentFilePath}</code> según las instrucciones del panel izquierdo.
                  </div>
                )}
              </div>

              {/* Tarjeta 3: Comandos Git Paso a Paso con Explicación Didáctica */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Comandos Git a Ejecutar en tu Terminal
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Ejecuta estos comandos en tu proyecto local antes de presionar verificar.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllGitCommands}
                    className="h-7 text-[11px] px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar Todos</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentGitCommands.map((cmdObj, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/30 transition-colors space-y-1.5"
                    >
                      {/* Fila del Comando Terminal */}
                      <div className="flex items-center justify-between gap-2 bg-background/80 rounded-lg p-2 border border-border/60 font-mono text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-muted-foreground select-none font-bold text-[11px]">$</span>
                          <span className="font-bold text-foreground break-all select-all">{cmdObj.command}</span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyGitCommand(cmdObj.command, idx)}
                          className="h-6 px-2 text-[10px] shrink-0 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {copiedCmdIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>Copiar</span>
                        </Button>
                      </div>

                      {/* Explicación Pedagógica del Comando */}
                      {cmdObj.explanation && (
                        <div className="flex items-start gap-1.5 px-1 text-[11px] text-muted-foreground leading-relaxed">
                          <span className="text-amber-500 text-xs mt-0.5">💡</span>
                          <div>
                            <strong className="text-foreground/90 font-medium">¿Qué hace este comando? </strong>
                            <span>{cmdObj.explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Retroalimentación de la Última Verificación */}
              {lastVerification && (
                <div className={cn(
                  "p-3.5 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200",
                  lastVerification.success
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                )}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {lastVerification.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>{lastVerification.success ? "¡Paso Cumplido con Éxito!" : "Pendiente de Verificación"}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {lastVerification.message}
                  </p>
                  {lastVerification.details?.hint && (
                    <div className="pt-1 text-[10px] opacity-90 border-t border-current/20">
                      <strong>Orientación:</strong> {lastVerification.details.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Botones de Acción de Verificación e Interacción */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => handleVerifyStepInGitHub(activeStepIndex)}
                  disabled={isVerifying || !repoUrl.trim()}
                  className={cn(
                    "w-full rounded-2xl font-bold text-xs h-11 gap-2 shadow-md transition-all cursor-pointer",
                    isCurrentStepCompleted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-500/20"
                  )}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando en GitHub (comprobando archivos y commits)...</span>
                    </>
                  ) : isCurrentStepCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Paso Verificado en GitHub (Volver a Comprobar)</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Verificar en Repositorio GitHub</span>
                    </>
                  )}
                </Button>

                {isCurrentStepCompleted && activeStepIndex < milestones.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveStepIndex(activeStepIndex + 1)}
                    className="w-full rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted/40 cursor-pointer"
                  >
                    <span>Avanzar al Paso {activeStepIndex + 2}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
