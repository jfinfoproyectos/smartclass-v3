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
  Info,
  GitCommitVertical,
  Sparkles,
  ListOrdered
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { submitActivityAction } from "../actions/submissionActions";
import { verifyWorkshopGithubStepAction, VerifyStepResult } from "../actions/workshopActions";
import { FeedbackViewer } from "./FeedbackViewer";
import { cn } from "@/lib/utils";
import { formatCodeString } from "@/lib/codeFormatter";

function getSuggestedGitignore(lang?: string): string {
  const l = (lang || "").toLowerCase();
  if (l.includes("node") || l.includes("js") || l.includes("react") || l.includes("next") || l.includes("ts")) {
    return "node_modules/\n.env\n.env.local\ndist/\nbuild/\n.next/\n.DS_Store";
  }
  if (l.includes("py") || l.includes("fastapi") || l.includes("django")) {
    return "__pycache__/\n*.pyc\nvenv/\n.env\n.pytest_cache/\n.DS_Store";
  }
  if (l.includes("java") || l.includes("spring")) {
    return "target/\n*.class\n.gradle/\nbuild/\n.env\n.DS_Store";
  }
  return "node_modules/\n.env\ndist/\n.DS_Store";
}

interface WorkshopActivityDetailsProps {
  activity: any;
  userId: string;
  studentName: string;
  isTeacherPreview?: boolean;
  onClosePreview?: () => void;
}

function parseRepo(url: string) {
  try {
    let clean = url.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    const u = new URL(clean);
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

  const [activeTab, setActiveTab] = useState<"statement" | number>("statement");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [teacherBypassLock, setTeacherBypassLock] = useState(false);
  const [codePerMilestone, setCodePerMilestone] = useState<Record<number, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  
  // GitHub específico
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Record<number, VerifyStepResult>>({});
  const [latestDetectedCommit, setLatestDetectedCommit] = useState<{
    sha: string;
    message: string;
    author: string;
    date: string;
  } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showCodeExplanation, setShowCodeExplanation] = useState<Record<number, boolean>>({});
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [copiedGitignore, setCopiedGitignore] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFilePath, setCopiedFilePath] = useState(false);
  const [copiedCmdIdx, setCopiedCmdIdx] = useState<number | null>(null);
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  const submission = activity.submissions?.[0];
  const isSubmitted = !!submission;
  const isGraded = submission && submission.grade !== null && submission.grade !== undefined;

  // Restaurar URL, rama de repositorio y pasos completados desde entrega previa (cross-device)
  useEffect(() => {
    if (submission?.url) {
      let cleanUrl = submission.url.trim();
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && cleanUrl.includes("github.com")) {
        cleanUrl = `https://${cleanUrl}`;
      }
      if (cleanUrl.startsWith("http")) {
        const [urlPart, hashPart] = cleanUrl.split("#");
        if (urlPart) {
          setRepoUrl((prev) => prev || urlPart);
        }
        if (hashPart) {
          const [branchName, queryPart] = hashPart.split("?");
          if (branchName) {
            setRepoBranch((prev) => (!prev || prev === "main" ? branchName : prev));
          }
          if (queryPart && queryPart.includes("steps=")) {
            const params = new URLSearchParams(queryPart);
            const stepsVal = params.get("steps");
            if (stepsVal) {
              const stepIndices = stepsVal.split(",").map(Number).filter(n => !isNaN(n));
              setCompletedSteps((prev) => {
                const updated = { ...prev };
                stepIndices.forEach(idx => { updated[idx] = true; });
                return updated;
              });
            }
          }
        }
      }
    }
  }, [submission?.url]);

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
        const raw = m.starterCode || m.targetFileContent || "";
        initialCode[idx] = formatCodeString(raw, m.targetFilePath || "");
      });
      setCodePerMilestone(initialCode);
    }
  }, [milestones]);

  const hasMilestones = milestones && milestones.length > 0;

  const parsedRepoInfo = useMemo(() => {
    return repoUrl ? parseRepo(repoUrl) : null;
  }, [repoUrl]);

  // Verificación de repositorio configurado
  const isRepoConfigured = useMemo(() => {
    if (isCodeLab) return true;
    if (!repoUrl) return false;
    const clean = repoUrl.trim().toLowerCase();
    return clean.length >= 7 && (clean.includes("github.com") || !!parsedRepoInfo);
  }, [isCodeLab, repoUrl, parsedRepoInfo]);

  // Regla de desbloqueo secuencial:
  // Paso 1 (índice 0): se desbloquea al configurar el repositorio GitHub (o siempre en Codelab)
  // Paso i (índice > 0): se desbloquea cuando el paso anterior i - 1 está completado y desbloqueado
  const isStepUnlocked = (stepIdx: number): boolean => {
    if (isTeacherPreview && teacherBypassLock) return true;
    if (stepIdx === 0) {
      return isCodeLab || isRepoConfigured;
    }
    return isStepUnlocked(stepIdx - 1) && !!completedSteps[stepIdx - 1];
  };

  const currentMilestone = hasMilestones
    ? (milestones[activeStepIndex] || milestones[0])
    : {
        title: "",
        instructions: "",
        starterCode: "",
        targetFilePath: "",
        targetFileContent: "",
        gitCommands: [],
        hintText: ""
      };

  const currentRequiresFile = hasMilestones
    ? ((currentMilestone as any)?.requiresFile !== undefined
        ? (currentMilestone as any).requiresFile
        : Boolean(currentMilestone?.targetFilePath && currentMilestone.targetFilePath.trim().length > 0))
    : false;

  const currentRequiresGit = hasMilestones
    ? ((currentMilestone as any)?.requiresGitCommands !== undefined
        ? (currentMilestone as any).requiresGitCommands
        : Boolean(currentMilestone?.gitCommands && currentMilestone.gitCommands.length > 0))
    : false;

  const currentFilePath = (hasMilestones && currentRequiresFile) ? (currentMilestone.targetFilePath || "") : "";
  const currentLanguage = currentFilePath ? getMonacoLanguage(workshopConfig.language, currentFilePath) : "javascript";

  // Comandos Git predeterminados si el paso los requiere
  const currentGitCommands: Array<{ command: string; explanation: string }> = (hasMilestones && currentRequiresGit)
    ? (currentMilestone.gitCommands && currentMilestone.gitCommands.length > 0
        ? currentMilestone.gitCommands
        : [
            { command: `git add ${currentFilePath || "."}`, explanation: "Prepara los cambios del archivo para el próximo commit." },
            { command: `git commit -m "feat: completar paso ${activeStepIndex + 1}"`, explanation: "Confirma los cambios en el historial de Git local." },
            { command: `git push origin ${repoBranch || "main"}`, explanation: "Sube los cambios confirmados a tu repositorio remoto en GitHub." }
          ])
    : [];

  const handleUpdateRepoUrl = (val: string) => {
    let sanitized = val.trim();
    if (sanitized && !sanitized.startsWith("http://") && !sanitized.startsWith("https://") && sanitized.includes("github.com")) {
      sanitized = `https://${sanitized}`;
    }
    setRepoUrl(sanitized);
    if (typeof window !== "undefined" && activity?.id && userId) {
      localStorage.setItem(`smartclass_w_repo_${activity.id}_${userId}`, sanitized);
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

  const handleCopyInstructions = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 2000);
    toast.success("Instrucciones copiadas al portapapeles");
  };

  const handleCopyCode = (text: string, pathOrLang?: string) => {
    const formatted = formatCodeString(text, pathOrLang);
    navigator.clipboard.writeText(formatted);
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
      setActiveTab(stepIdx + 1);
      setActiveStepIndex(stepIdx + 1);
    }
  };

  // Verificación en GitHub (Tutorial GitHub)
  const handleVerifyStepInGitHub = async (stepIdx: number) => {
    const requiresF = (currentMilestone as any)?.requiresFile !== undefined
      ? (currentMilestone as any).requiresFile
      : Boolean(currentMilestone?.targetFilePath && currentMilestone.targetFilePath.trim().length > 0);
    const requiresG = (currentMilestone as any)?.requiresGitCommands !== undefined
      ? (currentMilestone as any).requiresGitCommands
      : Boolean(currentMilestone?.gitCommands && currentMilestone.gitCommands.length > 0);

    // Si el paso no requiere archivo ni comandos git (es solo de lectura / instrucciones)
    if (!requiresF && !requiresG) {
      markStepAsCompletedInStorage(stepIdx);
      setVerificationResults((prev) => ({
        ...prev,
        [stepIdx]: { success: true, message: `¡Paso ${stepIdx + 1} completado! Has leído las indicaciones del paso.` }
      }));
      toast.success(`¡Paso ${stepIdx + 1} completado!`, {
        description: "Paso instructivo registrado con éxito."
      });
      return;
    }

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

      if (result.details?.latestCommit) {
        setLatestDetectedCommit(result.details.latestCommit);
      }

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
        let cleanRepo = repoUrl.trim();
        if (!cleanRepo.startsWith("http://") && !cleanRepo.startsWith("https://")) {
          cleanRepo = `https://${cleanRepo}`;
        }
        const completedKeys = Object.keys(completedSteps).filter(k => !!completedSteps[Number(k)]).join(",");
        const stepsParam = completedKeys ? `?steps=${completedKeys}` : "";
        formData.set("url", `${cleanRepo}#${repoBranch.trim() || "main"}${stepsParam}`);
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
        toast.success(isSubmitted ? "¡Entrega actualizada exitosamente para evaluación docente!" : "¡Tutorial entregado exitosamente para evaluación docente!");
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
              {hasMilestones ? (
                <span className="flex items-center gap-1 font-medium">
                  <Layers className="w-3 h-3 text-primary" />
                  {totalCompleted} de {milestones.length} pasos completados
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Sin pasos configurados aún
                </span>
              )}
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
          {isTeacherPreview && (
            <button
              type="button"
              onClick={() => setTeacherBypassLock(!teacherBypassLock)}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer mr-1",
                teacherBypassLock
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
              )}
              title="Permite al docente navegar libremente por todos los pasos sin necesidad de completarlos secuencialmente"
            >
              {teacherBypassLock ? "🔓 Pasos Desbloqueados" : "🔒 Simular Bloqueo"}
            </button>
          )}
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
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold py-1 px-3 gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Entregado {isGraded ? `(Nota: ${submission.grade})` : "(En revisión)"}</span>
              </Badge>
              {!isGraded && (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 font-bold text-xs rounded-xl shadow-xs border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  title="Actualizar la entrega con los últimos cambios y pasos completados"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Actualizar Entrega</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : !hasMilestones ? (
            <Badge variant="outline" className="text-xs py-1 px-3 text-muted-foreground bg-muted/30 border-dashed border-border/80">
              En preparación
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

      {/* Step & Statement Navigator */}
      {hasMilestones && (
        <div className="flex items-center gap-2 p-2 px-4 border-b border-border/60 bg-muted/20 overflow-x-auto scrollbar-none shrink-0">
          {/* Pestaña 0: Enunciado General */}
          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
              activeTab === "statement"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background/80 text-foreground border-border/60 hover:bg-muted/40"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Enunciado General</span>
            {!isCodeLab && (
              isRepoConfigured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Repositorio configurado" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Pendiente vincular repositorio" />
              )
            )}
          </button>

          {/* Separador */}
          <div className="h-4 w-px bg-border/80 shrink-0 mx-0.5" />

          {/* Pasos */}
          {milestones.map((m, idx) => {
            const isUnlocked = isStepUnlocked(idx);
            const isCompleted = !!completedSteps[idx];
            const isActive = activeTab === idx;

            return (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => {
                  if (!isUnlocked) {
                    if (idx === 0) {
                      toast.warning("Configura tu repositorio GitHub en la pestaña de Enunciado para desbloquear el Paso 1.");
                      setActiveTab("statement");
                    } else {
                      toast.warning(`Debes completar y verificar el Paso ${idx} para desbloquear el Paso ${idx + 1}.`);
                    }
                    return;
                  }
                  setActiveTab(idx);
                  setActiveStepIndex(idx);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs cursor-pointer"
                    : isCompleted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer"
                    : isUnlocked
                    ? "bg-background/80 text-muted-foreground border-border/60 hover:bg-muted/40 cursor-pointer"
                    : "bg-muted/30 text-muted-foreground/50 border-border/40 cursor-not-allowed opacity-75"
                )}
                title={!isUnlocked ? (idx === 0 ? "Bloqueado: Configura el repositorio en la pestaña de Enunciado" : `Bloqueado: Completa el Paso ${idx}`) : undefined}
              >
                {!isUnlocked ? (
                  <Lock className="w-3 h-3 text-muted-foreground/70" />
                ) : isCompleted ? (
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
        <div className="p-4 border-b border-border/80 bg-primary/5">
          <FeedbackViewer
            feedback={submission.feedback}
            repoUrl={repoUrl}
            configuredPaths={milestones.map((m: any) => m.targetFilePath).filter(Boolean)}
          />
        </div>
      )}

      {/* Si no hay pasos configurados, mostrar vista informativa limpia con la Consigna General */}
      {!hasMilestones ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full custom-scrollbar">
          {/* Banner contextual */}
          {isTeacherPreview ? (
            <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Este tutorial aún no contiene pasos configurados
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Has redactado el enunciado general, pero todavía no has generado o añadido pasos a este tutorial. Cierra esta vista previa y dirígete a la pestaña <strong>"Configuración de Pasos"</strong> en el editor para planificar los pasos con IA o añadirlos manualmente.
                  </p>
                </div>
              </div>
              {onClosePreview && (
                <Button
                  type="button"
                  onClick={onClosePreview}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  Cerrar y Configurar Pasos
                </Button>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-200 flex items-start gap-3.5 shadow-xs">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Tutorial en preparación
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  El docente ha publicado los objetivos del proyecto y se encuentra configurando los pasos guiados. A continuación puedes consultar el enunciado y los requerimientos generales mientras se habilitan los pasos de entrega.
                </p>
              </div>
            </div>
          )}

          {/* Enunciado General / Consigna de la Actividad */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Enunciado General del Proyecto</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyInstructions(activity.statement || rawDescription || "")}
                disabled={!activity.statement && !rawDescription}
                className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {copiedInstructions ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Enunciado</span>
              </Button>
            </div>
            <div className="p-6 sm:p-8 prose dark:prose-invert prose-sm max-w-none leading-relaxed text-foreground/90">
              <ReactMarkdown>
                {activity.statement || rawDescription || "No hay un enunciado redactado para esta actividad."}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : activeTab === "statement" ? (
        /* Pestaña: Enunciado General y Configuración del Repositorio */
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Columna Izquierda: Enunciado General del Proyecto */}
          <div className="w-full md:w-1/2 flex flex-col border-r border-border/70 bg-card/40 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider bg-muted/40">
                Consigna y Especificación
              </Badge>
              <h2 className="text-lg font-black text-foreground">
                {activity.title}
              </h2>
            </div>

            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs flex flex-col flex-1">
              <div className="px-3.5 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2 text-xs flex-wrap">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 gap-1 font-semibold bg-background border-primary/30 text-primary">
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span>Enunciado General del Proyecto</span>
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyInstructions(activity.statement || rawDescription || "")}
                  disabled={!activity.statement && !rawDescription}
                  className="h-6 px-2 text-[11px] gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {copiedInstructions ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </Button>
              </div>

              <div className="p-4 sm:p-6 prose dark:prose-invert prose-xs max-w-none leading-relaxed text-foreground/90 bg-card">
                <ReactMarkdown>
                  {activity.statement || rawDescription || "No hay un enunciado redactado para esta actividad."}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Configuración de Repositorio GitHub o Codelab */}
          <div className="w-full md:w-1/2 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-background/50">
            {!isCodeLab ? (
              <div className="p-5 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.05] to-amber-500/[0.02] space-y-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Configuración de Repositorio GitHub
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Vincula tu repositorio para desbloquear las etapas y verificar tus avances.
                      </p>
                    </div>
                  </div>
                  {isRepoConfigured && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-mono gap-1 px-2.5 py-0.5 shrink-0 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Configurado</span>
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>URL del Repositorio en GitHub *</span>
                      {parsedRepoInfo && (
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {parsedRepoInfo.owner}/{parsedRepoInfo.repo}
                        </span>
                      )}
                    </label>
                    <Input
                      value={repoUrl || ""}
                      onChange={(e) => handleUpdateRepoUrl(e.target.value)}
                      placeholder="https://github.com/tu-usuario/nombre-del-repo"
                      className="h-9 text-xs bg-background/90"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Rama de Trabajo (Branch) *
                    </label>
                    <Input
                      value={repoBranch || ""}
                      onChange={(e) => handleUpdateRepoBranch(e.target.value)}
                      placeholder="main"
                      className="h-9 text-xs font-mono bg-background/90"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Asegúrate de que coincida con la rama donde subirás tus commits (por defecto <code className="font-mono">main</code>).
                    </p>
                  </div>

                  {/* Estado de Desbloqueo y Botón de Inicio */}
                  {isRepoConfigured ? (
                    <div className="pt-2 space-y-2">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>¡Repositorio vinculado con éxito! El <strong>Paso 1</strong> ya se encuentra desbloqueado.</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setActiveTab(0);
                          setActiveStepIndex(0);
                        }}
                        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-xs gap-2 cursor-pointer"
                      >
                        <span>Comenzar con el Paso 1: {milestones[0]?.title || "Paso Inicial"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block">Paso 1 Bloqueado</span>
                        <span className="text-[11px] text-muted-foreground block">
                          Ingresa la URL de tu repositorio GitHub arriba para desbloquear el Paso 1 y comenzar las verificaciones.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Último commit detectado */}
                  {latestDetectedCommit && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs mt-2">
                      <GitCommitVertical className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground text-[11px]">Último commit detectado:</span>
                        <span className="font-mono font-bold text-foreground bg-background/90 px-1.5 py-0.5 rounded text-[10px] border border-border/60">
                          {latestDetectedCommit.sha}
                        </span>
                        <span className="text-foreground font-medium text-[11px] truncate max-w-xs" title={latestDetectedCommit.message}>
                          {latestDetectedCommit.message}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 font-bold">
                        En vivo
                      </Badge>
                    </div>
                  )}

                  {/* Guía Asistida de Setup Inicial (Paso 0) */}
                  <div className="pt-2 border-t border-orange-500/15">
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                      className="flex items-center justify-between w-full text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer py-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-orange-500" />
                        <span>{showSetupGuide ? "Ocultar Guía de Inicio (Paso 0)" : "💡 ¿Primera vez con este proyecto? Ver Guía de Inicio (Paso 0)"}</span>
                      </div>
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showSetupGuide && "rotate-90")} />
                    </button>

                    {showSetupGuide && (
                      <div className="mt-2 p-3.5 rounded-xl bg-card border border-border/80 space-y-2.5 text-xs animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="font-bold text-[11px] text-foreground">Comandos para preparar tu repositorio local:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const gitignore = getSuggestedGitignore(workshopConfig.language);
                                navigator.clipboard.writeText(gitignore);
                                setCopiedGitignore(true);
                                setTimeout(() => setCopiedGitignore(false), 2000);
                                toast.success(".gitignore sugerido copiado al portapapeles");
                              }}
                              className="h-6 text-[10px] px-2 gap-1 border-border/70 cursor-pointer"
                              title="Copiar contenido recomendado para .gitignore"
                            >
                              {copiedGitignore ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                              <span>Copiar .gitignore</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const effectiveUrl = repoUrl.trim() || "https://github.com/tu-usuario/tu-repo.git";
                                const effectiveB = repoBranch.trim() || "main";
                                const cmds = `git init\ngit branch -M ${effectiveB}\ngit remote add origin ${effectiveUrl}`;
                                navigator.clipboard.writeText(cmds);
                                setCopiedSetup(true);
                                setTimeout(() => setCopiedSetup(false), 2000);
                                toast.success("Comandos de inicialización copiados");
                              }}
                              className="h-6 text-[10px] px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                            >
                              {copiedSetup ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                              <span>Copiar Comandos de Setup</span>
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted/40 p-2.5 rounded-lg font-mono text-[11px] space-y-1 select-all border border-border/60 text-foreground">
                          <div className="text-muted-foreground"># 1. Inicializar repositorio Git y rama de trabajo</div>
                          <div>git init</div>
                          <div>git branch -M {repoBranch || "main"}</div>
                          <div className="text-muted-foreground pt-1"># 2. Vincular con tu repositorio en GitHub</div>
                          <div>git remote add origin {repoUrl.trim() || "https://github.com/tu-usuario/tu-proyecto.git"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.05] to-indigo-500/[0.02] space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Entorno de Código en Vivo
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Codelab interactivo con Monaco Editor integrado en la plataforma.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  En este codelab avanzarás de forma guiada resolviendo cada hito de código directamente en tu navegador.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setActiveTab(0);
                    setActiveStepIndex(0);
                  }}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs gap-2 cursor-pointer"
                >
                  <span>Ir al Paso 1: {milestones[0]?.title || "Paso Inicial"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : typeof activeTab === "number" && !isStepUnlocked(activeTab) ? (
        /* Pantalla de Paso Bloqueado */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background/50">
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-foreground">
              Paso {activeTab + 1} Bloqueado
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeTab === 0
                ? "Para comenzar con este paso, primero debes vincular tu repositorio GitHub en la pestaña de Enunciado."
                : `Debes completar y verificar el Paso ${activeTab} antes de continuar con el Paso ${activeTab + 1}.`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === 0) {
                setActiveTab("statement");
              } else {
                setActiveTab(activeTab - 1);
                setActiveStepIndex(activeTab - 1);
              }
            }}
            className="gap-2 text-xs font-semibold rounded-xl cursor-pointer"
          >
            {activeTab === 0 ? (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ir a Configurar Repositorio en Enunciado</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Ir al Paso {activeTab}</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Split Work Area para los Pasos Desbloqueados */
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

          {/* 🎯 Hoja de Ruta Visual del Paso: ¿Qué tienes que hacer? */}
          <div className="p-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background to-primary/[0.02] space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    ¿Qué tienes que hacer en este paso?
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Sigue esta secuencia para completar la etapa correctamente:
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px] font-bold px-2 py-0.5",
                isCurrentStepCompleted
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
              )}>
                {isCurrentStepCompleted ? "✓ Paso Validado" : "🟡 En Progreso"}
              </Badge>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {/* Acción 1: Archivo */}
              {currentRequiresFile && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[11px]">
                      Abre o crea el archivo en tu proyecto local:
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <code className="px-2 py-0.5 rounded-md bg-muted font-mono text-[11px] text-primary font-bold truncate max-w-[260px] sm:max-w-none border border-border/50">
                        {currentFilePath}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyFilePath(currentFilePath)}
                        className="h-6 px-2 text-[10px] gap-1 cursor-pointer shrink-0 border-border/80 hover:bg-muted/60"
                        title="Copiar ruta"
                      >
                        {copiedFilePath ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedFilePath ? "Copiado" : "Copiar Ruta"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Acción 2: Implementar Código */}
              {currentRequiresFile && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[11px]">
                      Implementa el código provisto (panel derecho):
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      Copia el código con el botón <strong>"Código"</strong> del visor derecho y pégalo en tu archivo. Abre el <strong>Desglose Didáctico</strong> inferior para entender cómo funciona cada componente.
                    </p>
                  </div>
                </div>
              )}

              {/* Acción 3: Verificación Local (si aplica) */}
              {currentMilestone.localVerification && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-cyan-500/30 bg-cyan-500/[0.02] shadow-2xs">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-cyan-800 dark:text-cyan-300 text-[11px]">
                      Verificación local recomendada:
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      Revisa la tarjeta de <strong>Verificación Local</strong> en el panel derecho y prueba que tu proyecto compile o responda adecuadamente antes de hacer commit.
                    </p>
                  </div>
                </div>
              )}

              {/* Acción 4: Comandos Git */}
              {currentRequiresGit && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 font-bold text-[11px] shrink-0 mt-0.5">
                    {currentMilestone.localVerification ? "4" : "3"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[11px]">
                      Sincroniza y envía los cambios con Git:
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      Ejecuta en tu terminal los comandos provistos a la derecha (<code className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded">git add</code>, <code className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded">git commit</code> y <code className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded">git push</code>).
                    </p>
                  </div>
                </div>
              )}

              {/* Acción 5: Verificar Entrega */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-emerald-500/30 bg-emerald-500/[0.02] shadow-2xs">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-[11px] shrink-0 mt-0.5">
                  {currentRequiresGit ? (currentMilestone.localVerification ? "5" : "4") : "2"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
                    Valida y desbloquea el siguiente paso:
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Haz clic en el botón <strong>"Verificar en Repositorio GitHub"</strong>. SmartClass comprobará tu repositorio en tiempo real y desbloqueará el siguiente paso automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Indicaciones del Paso (Renderizado Markdown como en la actividad de tipo GitHub) */}
          <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs flex flex-col">
            <div className="px-3.5 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 gap-1 font-semibold bg-background border-primary/30 text-primary">
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span>Indicaciones del Paso</span>
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyInstructions(currentMilestone.instructions || "")}
                disabled={!currentMilestone.instructions}
                className="h-6 px-2 text-[11px] gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                title="Copiar texto de las indicaciones"
              >
                {copiedInstructions ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </Button>
            </div>

            <div className="p-4 sm:p-5 prose dark:prose-invert prose-xs max-w-none leading-relaxed text-foreground/90 bg-card">
              <ReactMarkdown>
                {currentMilestone.instructions || "Sigue las indicaciones del paso y realiza los avances correspondientes."}
              </ReactMarkdown>
            </div>
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

          {/* Hint Accordion (solo para Codelab interactivo) */}
          {isCodeLab && currentMilestone.hintText && (
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
                    onClick={() => handleCopyCode(codePerMilestone[activeStepIndex] || "", currentFilePath)}
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
              
              {/* Chip de Repositorio Vinculado (Informativo, solo lectura con acceso rápido a la pestaña de Enunciado) */}
              <div className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Repositorio:</span>
                  <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-[200px]" title={repoUrl}>
                    {parsedRepoInfo ? `${parsedRepoInfo.owner}/${parsedRepoInfo.repo}` : repoUrl}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 bg-muted/30">
                    {repoBranch || "main"}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("statement")}
                  className="text-[11px] font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                  title="Ir a la pestaña de Enunciado para reconfigurar el repositorio"
                >
                  Cambiar en Enunciado
                </button>
              </div>

              {/* Barra Rápida de Estado y Verificación del Paso */}
              <div className="p-3.5 rounded-2xl border border-border/80 bg-gradient-to-r from-card to-muted/20 flex items-center justify-between gap-3 shadow-xs flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-3 h-3 rounded-full shrink-0 ring-4",
                    isCurrentStepCompleted 
                      ? "bg-emerald-500 ring-emerald-500/20" 
                      : "bg-amber-500 ring-amber-500/20 animate-pulse"
                  )} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {isCurrentStepCompleted ? "✓ Paso Validado y Aprobado" : "Paso en Progreso"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {isCurrentStepCompleted 
                        ? "Tu entrega ya está registrada. Puedes avanzar al siguiente paso." 
                        : "Sigue la hoja de ruta y presiona verificar al terminar."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleVerifyStepInGitHub(activeStepIndex)}
                    disabled={isVerifying || ((currentRequiresFile || currentRequiresGit) && !repoUrl.trim())}
                    className={cn(
                      "h-8 px-3.5 text-xs font-bold gap-1.5 shadow-xs cursor-pointer",
                      isCurrentStepCompleted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                    )}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : isCurrentStepCompleted ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Volver a Comprobar</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Verificar en GitHub</span>
                      </>
                    )}
                  </Button>

                  {isCurrentStepCompleted && activeStepIndex < milestones.length - 1 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveTab(activeStepIndex + 1);
                        setActiveStepIndex(activeStepIndex + 1);
                      }}
                      className="h-8 px-3.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      <span>Siguiente Paso</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Tarjeta 2: Archivo a Crear o Modificar en el Repositorio (Solo si el paso lo requiere) */}
              {currentRequiresFile && (
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
                        onClick={() => handleCopyCode(currentMilestone.targetFileContent || currentMilestone.starterCode || "", currentFilePath)}
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
                  {(currentMilestone.targetFileContent || currentMilestone.starterCode) ? (() => {
                    const rawCode = currentMilestone.targetFileContent || currentMilestone.starterCode || "";
                    const codeVal = formatCodeString(rawCode, currentFilePath);
                    const lineCount = codeVal.split("\n").length;
                    const calculatedHeight = Math.max(90, lineCount * 19 + 24);

                    return (
                      <div className="rounded-xl border border-border/80 overflow-hidden bg-muted/20">
                        <div className="px-3 py-1.5 border-b border-border/60 bg-muted/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{currentFilePath}</span>
                          <span>{currentLanguage.toUpperCase()}</span>
                        </div>
                        <div style={{ height: `${calculatedHeight}px` }}>
                          <Editor
                            height="100%"
                            language={currentLanguage}
                            theme={editorTheme}
                            value={codeVal}
                            options={{
                              readOnly: true,
                              fontSize: 12,
                              lineHeight: 19,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              lineNumbers: "on",
                              domReadOnly: true,
                              wordWrap: "on",
                              scrollbar: {
                                vertical: "hidden",
                                horizontal: "auto",
                                handleMouseWheel: false,
                                alwaysConsumeMouseWheel: false
                              },
                              overviewRulerLanes: 0,
                              hideCursorInOverviewRuler: true,
                              renderLineHighlight: "none"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-3 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                      Crea el archivo <code className="font-mono text-foreground">{currentFilePath}</code> según las instrucciones del panel izquierdo.
                    </div>
                  )}

                  {/* 📘 Explicación y Desglose Didáctico del Código */}
                  {currentMilestone.codeExplanation && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] overflow-hidden space-y-0">
                      <button
                        type="button"
                        onClick={() => setShowCodeExplanation((prev) => ({ ...prev, [activeStepIndex]: prev[activeStepIndex] === false ? true : false }))}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>📘 ¿Cómo funciona este código? (Desglose Didáctico)</span>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 transition-transform text-emerald-600 dark:text-emerald-400", (showCodeExplanation[activeStepIndex] ?? true) && "rotate-90")} />
                      </button>
                      {(showCodeExplanation[activeStepIndex] ?? true) && (
                        <div className="p-4 border-t border-emerald-500/20 prose dark:prose-invert prose-xs max-w-none leading-relaxed bg-background/70">
                          <ReactMarkdown>{currentMilestone.codeExplanation}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 🧪 Tarjeta de Verificación Local y Resultado Esperado */}
              {currentMilestone.localVerification && (
                <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.04] to-blue-500/[0.02] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          🧪 Verificación Local (Antes de hacer Commit)
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Comprueba en tu máquina local que este paso funciona antes de subir los cambios con Git.
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                      Prueba Local
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-background/80 border border-border/70 text-xs text-foreground/90 leading-relaxed font-sans prose dark:prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{currentMilestone.localVerification}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Tarjeta 3: Comandos Git Paso a Paso con Explicación Didáctica (Solo si el paso lo requiere) */}
              {currentRequiresGit && (
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
              )}

              {/* Tarjeta Informativa: Solo cuando el paso no requiere ni archivo ni Git */}
              {!currentRequiresFile && !currentRequiresGit && (
                <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.05] to-indigo-500/[0.02] space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Paso Informativo / Conceptual</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Este paso no exige crear archivos de código ni ejecutar comandos Git en el repositorio.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-1 pt-1 border-t border-purple-500/15">
                    Lee atentamente las consignas del panel izquierdo. Una vez completada la lectura o la tarea conceptual indicada, presiona el botón inferior para marcar este paso como resuelto.
                  </p>
                </div>
              )}

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
                  disabled={isVerifying || ((currentRequiresFile || currentRequiresGit) && !repoUrl.trim())}
                  className={cn(
                    "w-full rounded-2xl font-bold text-xs h-11 gap-2 shadow-md transition-all cursor-pointer",
                    isCurrentStepCompleted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      : (!currentRequiresFile && !currentRequiresGit)
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
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
                      <span>{(!currentRequiresFile && !currentRequiresGit) ? "Paso Completado" : "Paso Verificado en GitHub (Volver a Comprobar)"}</span>
                    </>
                  ) : (!currentRequiresFile && !currentRequiresGit) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar Paso como Completado</span>
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
                    onClick={() => {
                      setActiveTab(activeStepIndex + 1);
                      setActiveStepIndex(activeStepIndex + 1);
                    }}
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
      )}
    </div>
  );
}
