"use client";

import React from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Block,
  renderFormattedText,
  CodeBlock,
  CodeExplainBlock,
  InteractiveQuiz,
  LinkCard,
  AccordionBlock,
  FeatureGridBlock,
  StepListBlock,
  AiPromptBlock,
  TableBlock,
  ListBlock,
  ImageBlock,
  VideoBlock,
  CarouselBlock,
  FlashcardBlock,
  MatchingBlock,
  TimelineBlock,
  EmbedBlock,
  PdfBlock,
  MermaidBlock
} from "./BlockComponents";

import { markdownToBlocks } from "./admin/blockEditorUtils";

// Re-export Block interface and markdownToBlocks for the rest of the application
export type { Block };
export { markdownToBlocks };

export default function BlockRenderer({ content, initialCodeTheme }: { content: string; initialCodeTheme?: string }) {
  // Parse blocks or handle legacy markdown content safely
  const parseBlocks = (): Block[] => {
    if (!content) return [];
    
    const trimmed = content.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return JSON.parse(trimmed) as Block[];
      } catch (e) {
        console.error("JSON parsing error for BlockRenderer, treating as legacy", e);
      }
    }
    
    return markdownToBlocks(content);
  };

  const blocks = parseBlocks();

  if (blocks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground/45 italic">
        Esta página no tiene contenido configurado.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-text max-w-none font-sans">
      {blocks.map((block) => {
        const { id, type, data } = block;
        
        switch (type) {
          case "header": {
            const alignClass = data.align === "center" ? "text-center" : data.align === "right" ? "text-right" : "text-left";
            const cleanTitle = data.title ? data.title.replace(/[\*_~`#\[\]\(\)]/g, "").trim() : "";
            const slug = cleanTitle ? cleanTitle.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-') : id;

            if (data.level === "h2") {
              return (
                <div id={slug} key={id} className="scroll-mt-24 mt-12 mb-5">
                  <h2 className={cn("text-xl sm:text-2xl font-black tracking-tight pl-4 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent py-2.5 rounded-r-2xl text-foreground flex flex-col shadow-xs", alignClass)}>
                    <span>{renderFormattedText(data.title)}</span>
                    {data.subtitle && <span className="text-xs font-semibold text-muted-foreground/80 mt-1">{renderFormattedText(data.subtitle)}</span>}
                  </h2>
                </div>
              );
            }
            if (data.level === "h3") {
              return (
                <div id={slug} key={id} className="scroll-mt-24 mt-8 mb-4">
                  <h3 className={cn("text-base sm:text-lg font-extrabold tracking-tight pl-3 border-l-2 border-teal-400 text-foreground/95 flex flex-col", alignClass)}>
                    <span>{renderFormattedText(data.title)}</span>
                    {data.subtitle && <span className="text-xs font-medium text-muted-foreground mt-0.5">{renderFormattedText(data.subtitle)}</span>}
                  </h3>
                </div>
              );
            }
            return (
              <div id={slug} key={id} className="scroll-mt-24 mb-8">
                <h1 className={cn("text-3xl sm:text-4xl font-extrabold tracking-tight border-b border-slate-200/80 dark:border-slate-800/80 pb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-emerald-500", alignClass)}>
                  {renderFormattedText(data.title)}
                  {data.subtitle && <span className="block text-base font-normal text-muted-foreground mt-2">{renderFormattedText(data.subtitle)}</span>}
                </h1>
              </div>
            );
          }
          
          case "paragraph":
            return (
              <p key={id} className="text-[15px] sm:text-[16px] leading-relaxed text-foreground/90 my-5 whitespace-pre-wrap font-normal antialiased">
                {renderFormattedText(data.text)}
              </p>
            );
            
          case "callout": {
            const styleThemes = {
              info: {
                border: "border-cyan-500/30",
                bg: "bg-cyan-500/5 dark:bg-cyan-500/10",
                text: "text-cyan-600 dark:text-cyan-400",
                bar: "bg-cyan-500",
                icon: Info
              },
              warning: {
                border: "border-amber-500/30",
                bg: "bg-amber-500/5 dark:bg-amber-500/10",
                text: "text-amber-600 dark:text-amber-400",
                bar: "bg-amber-500",
                icon: AlertTriangle
              },
              success: {
                border: "border-emerald-500/30",
                bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
                text: "text-emerald-600 dark:text-emerald-400",
                bar: "bg-emerald-500",
                icon: CheckCircle2
              },
              danger: {
                border: "border-rose-500/30",
                bg: "bg-rose-500/5 dark:bg-rose-500/10",
                text: "text-rose-600 dark:text-rose-400",
                bar: "bg-rose-500",
                icon: AlertCircle
              }
            };
            
            const theme = styleThemes[data.style as keyof typeof styleThemes] || styleThemes.info;
            const Icon = theme.icon;
            
            return (
              <div key={id} className={cn("my-6 rounded-2xl border backdrop-blur-xl shadow-md relative overflow-hidden flex items-start gap-4 p-5 transition-all", theme.border, theme.bg)}>
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", theme.bar)} />
                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5 bg-background/80 shadow-xs border border-border/40", theme.text)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {data.title && <h5 className={cn("text-xs font-black uppercase tracking-wider mb-1.5", theme.text)}>{renderFormattedText(data.title)}</h5>}
                  <div className="text-[14px] leading-relaxed text-foreground/90 font-medium">
                    {renderFormattedText(data.text)}
                  </div>
                </div>
              </div>
            );
          }
          
          case "code":
            return (
              <CodeBlock 
                key={id} 
                title={data.title} 
                language={data.language} 
                code={data.code} 
                tabs={data.tabs}
                highlightLines={data.highlightLines}
                initialCodeTheme={initialCodeTheme}
              />
            );

          case "codeExplain":
            return (
              <CodeExplainBlock
                key={id}
                code={data.code}
                language={data.language}
                steps={data.steps || []}
                tabs={data.tabs}
                initialCodeTheme={initialCodeTheme}
              />
            );
            
          case "quiz":
            return (
              <InteractiveQuiz
                key={id}
                question={data.question}
                options={data.options || []}
                correctIndex={data.correctIndex || 0}
                explanation={data.explanation}
              />
            );
            
          case "card":
            return (
              <LinkCard
                key={id}
                title={data.title}
                description={data.description}
                url={data.url}
                icon={data.icon}
              />
            );

          case "accordion":
            return (
              <AccordionBlock 
                key={id} 
                items={data.items || []} 
              />
            );

          case "featureGrid":
            return (
              <FeatureGridBlock 
                key={id} 
                items={data.items || []} 
                columns={data.columns} 
              />
            );

          case "stepList":
            return (
              <StepListBlock 
                key={id} 
                steps={data.steps || []} 
              />
            );

          case "aiPrompt":
            return (
              <AiPromptBlock 
                key={id} 
                promptText={data.promptText} 
                buttonText={data.buttonText} 
                helperText={data.helperText} 
              />
            );

          case "table":
            return (
              <TableBlock 
                key={id} 
                headers={data.headers || []} 
                rows={data.rows || []} 
              />
            );

          case "list":
            return (
              <ListBlock 
                key={id} 
                items={data.items || []} 
                ordered={!!data.ordered} 
              />
            );

          case "image":
            return (
              <ImageBlock 
                key={id} 
                url={data.url} 
                alt={data.alt}
                align={data.align}
                width={data.width}
                radius={data.radius}
              />
            );

          case "video":
            return (
              <VideoBlock 
                key={id} 
                url={data.url} 
                caption={data.caption} 
              />
            );

          case "carousel":
            return (
              <CarouselBlock 
                key={id} 
                items={data.items || []} 
                autoplay={!!data.autoplay}
                interval={data.interval !== undefined ? data.interval : 5}
                width={data.width}
                align={data.align}
                transitionEffect={data.transitionEffect}
              />
            );
            
          case "flashcard":
            return (
              <FlashcardBlock 
                key={id} 
                cards={data.cards || [{ frontText: data.frontText, backText: data.backText, hint: data.hint }]} 
              />
            );

          case "matching":
            return (
              <MatchingBlock 
                key={id} 
                pairs={data.pairs || []} 
              />
            );

          case "timeline":
            return (
              <TimelineBlock 
                key={id} 
                items={data.items || []} 
              />
            );

          case "embed":
            return (
              <EmbedBlock 
                key={id} 
                url={data.url} 
                height={data.height}
                caption={data.caption}
              />
            );

          case "pdf":
            return (
              <PdfBlock 
                key={id} 
                url={data.url} 
                height={data.height}
                title={data.title}
              />
            );

          case "mermaid":
            return (
              <MermaidBlock 
                key={id} 
                chart={data.chart} 
              />
            );

          case "divider":
            return (
              <div key={id} className="my-8 flex items-center justify-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              </div>
            );
            
          default:
            return null;
        }
      })}
    </div>
  );
}
