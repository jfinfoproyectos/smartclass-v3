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

// Re-export Block interface for the rest of the application
export type { Block };

// Full GFM Markdown to blocks compiler
export const markdownToBlocks = (md: string): Block[] => {
  const blocks: Block[] = [];
  const lines = md.split("\n");
  let i = 0;

  const listPattern = /^(\s*)([-*+]|\d+\.)\s+(.*)/;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // 1. Fenced Code Block
    if (line.trim().startsWith("```")) {
      const match = line.trim().match(/^```(\w*)/);
      const language = match ? match[1] || "javascript" : "javascript";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing fence
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "code",
        data: { code: codeLines.join("\n"), language, title: "" }
      });
      continue;
    }

    // 2. Blockquote / GitHub Alerts
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      let isAlert = false;
      let alertStyle = "info";
      let alertTitle = "";

      while (i < lines.length && lines[i].trim().startsWith(">")) {
        const qLine = lines[i].trim().substring(1).trim();
        
        if (qLine.startsWith("[!")) {
          const matchAlert = qLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
          if (matchAlert) {
            isAlert = true;
            const type = matchAlert[1].toUpperCase();
            alertTitle = type;
            if (type === "WARNING") alertStyle = "warning";
            else if (type === "CAUTION") alertStyle = "danger";
            else if (type === "NOTE" || type === "TIP" || type === "IMPORTANT") alertStyle = "info";
            i++;
            continue;
          }
        }
        quoteLines.push(qLine);
        i++;
      }

      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "callout",
        data: { style: alertStyle, title: alertTitle, text: quoteLines.join("\n") }
      });
      continue;
    }

    // 3. Table
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      
      if (tableLines.length >= 2) {
        const isSeparator = /^\|[\s-:-|]+$/.test(tableLines[1]);
        if (isSeparator) {
          const parseRow = (rowStr: string) => {
            return rowStr
              .split("|")
              .map(cell => cell.trim())
              .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1);
          };

          const headers = parseRow(tableLines[0]);
          const rows: string[][] = [];
          for (let k = 2; k < tableLines.length; k++) {
            rows.push(parseRow(tableLines[k]));
          }

          blocks.push({
            id: Math.random().toString(36).substring(2, 9),
            type: "table",
            data: { headers, rows }
          });
          continue;
        }
      }
    }

    // 4. List Block
    if (listPattern.test(line)) {
      const listItems: { text: string; checked?: boolean }[] = [];
      let isOrdered = false;

      while (i < lines.length && listPattern.test(lines[i])) {
        const itemLine = lines[i];
        const match = itemLine.match(listPattern);
        if (match) {
          const bullet = match[2];
          let text = match[3].trim();
          
          if (/^\d+\./.test(bullet)) {
            isOrdered = true;
          }
          
          let checked: boolean | undefined = undefined;
          if (text.startsWith("[ ]")) {
            checked = false;
            text = text.substring(3).trim();
          } else if (text.startsWith("[x]") || text.startsWith("[X]")) {
            checked = true;
            text = text.substring(3).trim();
          }
          
          listItems.push({ text, checked });
        }
        i++;
      }

      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "list",
        data: { items: listItems, ordered: isOrdered }
      });
      continue;
    }

    // 5. Header
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ") || line.startsWith("#### ")) {
      let level = "h1";
      let title = "";
      if (line.startsWith("# ")) {
        level = "h1";
        title = line.substring(2).trim();
      } else if (line.startsWith("## ")) {
        level = "h2";
        title = line.substring(3).trim();
      } else if (line.startsWith("### ")) {
        level = "h3";
        title = line.substring(4).trim();
      } else if (line.startsWith("#### ")) {
        level = "h3";
        title = line.substring(5).trim();
      }

      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "header",
        data: { title, level, align: "left" }
      });
      i++;
      continue;
    }

    // 6. Image
    const imgPattern = /^!\[(.*?)\]\((.*?)\)$/;
    if (imgPattern.test(line.trim())) {
      const match = line.trim().match(imgPattern);
      if (match) {
        blocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "image",
          data: { alt: match[1], url: match[2] }
        });
        i++;
        continue;
      }
    }

    // 7. Paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !listPattern.test(lines[i]) &&
      !lines[i].startsWith("# ") &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].startsWith("#### ") &&
      !imgPattern.test(lines[i].trim())
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "paragraph",
        data: { text: pLines.join("\n") }
      });
    } else {
      i++;
    }
  }

  return blocks;
};

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
            const slug = data.title ? data.title.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-') : id;

            if (data.level === "h2") {
              return (
                <h2 id={slug} key={id} className={cn("text-2xl font-extrabold tracking-tight mt-12 mb-4 border-b border-border/50 pb-2 scroll-mt-20 text-foreground/90", alignClass)}>
                  {data.title}
                  {data.subtitle && <span className="block text-sm font-normal text-muted-foreground mt-1">{data.subtitle}</span>}
                </h2>
              );
            }
            if (data.level === "h3") {
              return (
                <h3 id={slug} key={id} className={cn("text-lg font-bold tracking-tight mt-8 mb-3 scroll-mt-20 text-foreground/90", alignClass)}>
                  {data.title}
                  {data.subtitle && <span className="block text-xs font-normal text-muted-foreground mt-0.5">{data.subtitle}</span>}
                </h3>
              );
            }
            return (
              <h1 id={slug} key={id} className={cn("text-3xl font-extrabold tracking-tight mb-8 border-b border-border/60 pb-3 leading-tight scroll-mt-20 text-foreground", alignClass)}>
                {data.title}
                {data.subtitle && <span className="block text-base font-normal text-muted-foreground mt-2">{data.subtitle}</span>}
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
                  {data.title && <h5 className={cn("text-xs font-black uppercase tracking-widest mb-1.5", theme.text)}>{data.title}</h5>}
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
            
          default:
            return null;
        }
      })}
    </div>
  );
}
