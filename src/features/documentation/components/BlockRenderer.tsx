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
                <h2 id={slug} key={id} className={cn("text-2xl font-extrabold tracking-tight mt-12 mb-4 border-b border-border/15 pb-2 scroll-mt-20 text-foreground/90", alignClass)}>
                  {renderFormattedText(data.title)}
                  {data.subtitle && <span className="block text-sm font-normal text-muted-foreground mt-1">{renderFormattedText(data.subtitle)}</span>}
                </h2>
              );
            }
            if (data.level === "h3") {
              return (
                <h3 id={slug} key={id} className={cn("text-lg font-bold tracking-tight mt-8 mb-3 scroll-mt-20 text-foreground/90", alignClass)}>
                  {renderFormattedText(data.title)}
                  {data.subtitle && <span className="block text-xs font-normal text-muted-foreground mt-0.5">{renderFormattedText(data.subtitle)}</span>}
                </h3>
              );
            }
            return (
              <h1 id={slug} key={id} className={cn("text-3xl font-extrabold tracking-tight mb-8 border-b border-border/20 pb-3 leading-tight scroll-mt-20 text-foreground", alignClass)}>
                {renderFormattedText(data.title)}
                {data.subtitle && <span className="block text-base font-normal text-muted-foreground mt-2">{renderFormattedText(data.subtitle)}</span>}
              </h1>
            );
          }
          
          case "paragraph":
            return (
              <p key={id} className="text-[15px] leading-relaxed text-foreground my-5 whitespace-pre-wrap font-normal antialiased">
                {renderFormattedText(data.text)}
              </p>
            );
            
          case "callout": {
            const styleThemes = {
              info: {
                border: "border-cyan-500/20",
                bg: "bg-cyan-500/5",
                text: "text-cyan-500",
                bar: "bg-cyan-500",
                icon: Info
              },
              warning: {
                border: "border-amber-500/20",
                bg: "bg-amber-500/5",
                text: "text-amber-500",
                bar: "bg-amber-500",
                icon: AlertTriangle
              },
              success: {
                border: "border-emerald-500/20",
                bg: "bg-emerald-500/5",
                text: "text-emerald-500",
                bar: "bg-emerald-500",
                icon: CheckCircle2
              },
              danger: {
                border: "border-rose-500/20",
                bg: "bg-rose-500/5",
                text: "text-rose-500",
                bar: "bg-rose-500",
                icon: AlertCircle
              }
            };
            
            const theme = styleThemes[data.style as keyof typeof styleThemes] || styleThemes.info;
            const Icon = theme.icon;
            
            return (
              <div key={id} className={cn("my-6 rounded-2xl border bg-card/40 backdrop-blur-md shadow-sm relative overflow-hidden flex items-start gap-4 p-5", theme.border)}>
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", theme.bar)} />
                <div className={cn("p-1.5 rounded-xl shrink-0 mt-0.5 bg-background/50", theme.text)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {data.title && <h5 className={cn("text-xs font-black uppercase tracking-widest mb-1.5", theme.text)}>{renderFormattedText(data.title)}</h5>}
                  <div className="text-[13.5px] leading-relaxed text-foreground/80 font-medium">
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
                <div className="w-full h-px bg-border/40 dark:bg-border/60" />
              </div>
            );
            
          default:
            return null;
        }
      })}
    </div>
  );
}
