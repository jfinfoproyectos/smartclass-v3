"use client";

import React, { useEffect, useRef } from "react";
import { animate, stagger, createDrawable } from "animejs";
import { useInView } from "framer-motion";

interface AnimatedSVGProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
  loop?: boolean;
}

export function AnimatedSVG({ 
  children, 
  duration = 2000, 
  delay = 500, 
  className = "",
  loop = false
}: AnimatedSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (isInView && containerRef.current) {
      if (animationRef.current) {
        animationRef.current.restart();
      } else {
        const paths = containerRef.current.querySelectorAll("path, polyline, line, circle, ellipse, rect");
        const drawables = createDrawable(paths);
        
        animationRef.current = animate(drawables, {
          draw: ["0 0", "0 1"],
          ease: "inOutSine",
          duration: duration,
          delay: stagger(200, { start: delay }),
          loop: loop,
          direction: 'alternate'
        });
      }
    } else if (!isInView && animationRef.current) {
      animationRef.current.pause();
      animationRef.current.seek(0);
    }
  }, [isInView, duration, delay, loop]);

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-wrap justify-center items-center my-8 p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 max-w-full break-words overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
