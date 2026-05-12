"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export type ChartRenderer = (width: number, height: number) => ReactNode;

export function ChartFrame({
  className,
  children,
}: {
  className: string;
  children: ChartRenderer;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 && children(size.width, size.height)}
    </div>
  );
}
