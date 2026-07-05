"use client";

import DynamicIcon from "@/features/documentation/components/DynamicIcon";

interface MdxIconProps {
  name: string;
  size?: number | string;
  className?: string;
  color?: string;
}

export function MdxIcon({ name, size = 24, className = "", color }: MdxIconProps) {
  return (
    <span className={`inline-flex items-center justify-center align-middle mx-1 ${className}`} style={{ color }}>
      <DynamicIcon icon={name} width={size} height={size} />
    </span>
  );
}
