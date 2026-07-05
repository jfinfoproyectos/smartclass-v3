import React, { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress({ targetId }: { targetId: string }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) setTarget(el);
  }, [targetId]);

  const { scrollYProgress } = useScroll({
    container: target ? { current: target } : undefined,
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 h-[2px] bg-primary z-[100] origin-left"
      style={{ scaleX }}
    />
  );
}
