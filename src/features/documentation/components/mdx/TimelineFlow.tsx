"use client";

import React, { useEffect, useRef } from "react";
import { createTimeline, stagger, animate } from "animejs";
import { useInView } from "framer-motion";

interface Step {
  title: string;
  description?: string;
}

interface TimelineFlowProps {
  steps: string | Step[];
  className?: string;
}

export function TimelineFlow({ steps: rawSteps, className = "" }: TimelineFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  // Handle both raw string (from relaxed JSON) and proper Step array
  let steps: Step[] = [];
  try {
    steps = typeof rawSteps === 'string' ? new Function("return " + rawSteps)() : rawSteps;
  } catch (e) {
    console.error("Error parsing steps in TimelineFlow:", e);
  }

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (isInView) {
      const timeline = createTimeline({
        defaults: {
          ease: 'outExpo',
          duration: 800
        }
      });

      // Ensure the flow-line actually exists to animate
      const flowLine = containerRef.current.querySelectorAll('.flow-line');
      if (flowLine.length > 0) {
        timeline.add(flowLine, {
          scaleX: [0, 1],
          scaleY: [0, 1], // For mobile vertical line
          opacity: [0, 1],
          duration: 1000,
        });
      }

      timeline
        .add(containerRef.current.querySelectorAll('.flow-node'), {
          scale: [0, 1],
          opacity: [0, 1],
          delay: stagger(200)
        }, flowLine.length > 0 ? '-=800' : 0)
        .add(containerRef.current.querySelectorAll('.flow-content'), {
          translateY: [20, 0],
          opacity: [0, 1],
          delay: stagger(200)
        }, '-=800');
    } else {
      // Reset items to invisible state when out of view
      const reset = (selector: string, props: any) => {
        const nodes = containerRef.current?.querySelectorAll(selector);
        if (nodes && nodes.length > 0) {
           animate(nodes, { ...props, duration: 0 });
        }
      };
      reset('.flow-line', { opacity: 0, scaleX: 0, scaleY: 0 });
      reset('.flow-node', { opacity: 0, scale: 0 });
      reset('.flow-content', { opacity: 0, translateY: 20 });
    }
  }, [isInView]);

  return (
    <div ref={containerRef} className={`my-12 px-4 ${className}`}>
      <div className="relative flex flex-col md:flex-row items-start justify-between gap-8 md:gap-4 ml-4 md:ml-0 overflow-hidden">
        {/* Connection Line (Mobile: vertical, Desktop: horizontal) */}
        <div className="flow-line absolute left-[11px] md:left-0 top-3 w-[2px] md:w-full h-full md:h-[2px] bg-white/10 -z-10 origin-top md:origin-left" style={{ opacity: 0 }} />
        
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex md:flex-col items-start md:items-center flex-1 group">
            {/* Step Node */}
            <div className="flow-node flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 border-4 border-background z-10 shadow-[0_0_20px_rgba(250,204,21,0.6)] transition-all duration-300 group-hover:scale-125" 
                 style={{ opacity: 0 }} />
            
            {/* Content */}
            <div className="flow-content ml-6 md:ml-0 md:mt-4 md:text-center" style={{ opacity: 0 }}>
              <h4 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider group-hover:text-yellow-400 transition-colors">{step.title}</h4>
              {step.description && (
                <p className="text-xs text-muted-foreground w-full max-w-none break-words">
                  {step.description}
                </p>
              )}
            </div>
            
            {/* Desktop-only animated connector mask if needed? No, let's keep it simple and clean */}
          </div>
        ))}
      </div>
    </div>
  );
}
