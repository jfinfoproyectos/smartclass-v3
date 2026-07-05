"use client";

import { Icon } from '@iconify/react';

export default function DynamicIcon({ icon, className, ...props }: { icon: string, className?: string, [key: string]: any }) {
  if (!icon) return null;
  return <Icon icon={icon} className={className} {...props} />;
}
