import type { CSSProperties, PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';

type CollapsibleFormProps = PropsWithChildren<{
  open: boolean;
  durationMs?: number;
  className?: string;
  onAfterClose?: () => void;
}>;

export default function CollapsibleForm({ open, durationMs = 280, className, onAfterClose, children }: CollapsibleFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<string | number>(0);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const height = el.scrollHeight;
    if (open) {
      // From 0 -> measured height
      setMaxHeight(height);
      // ensure opacity animates in
      requestAnimationFrame(() => setOpacity(1));
    } else {
      // If previously auto/none, set to measured height first, then collapse to 0
      setMaxHeight(height);
      requestAnimationFrame(() => {
        setMaxHeight(0);
        setOpacity(0);
      });
    }
  }, [open]);

  const handleTransitionEnd = () => {
    const el = containerRef.current;
    if (!el) return;
    if (open) {
      // Remove explicit height after opening to allow content growth
      setMaxHeight('none');
    } else {
      onAfterClose?.();
    }
  };

  const style: CSSProperties = {
    overflow: 'hidden',
    transition: `max-height ${durationMs}ms ease, opacity ${durationMs}ms ease`,
    maxHeight,
    opacity,
  };

  return (
    <div style={style} onTransitionEnd={handleTransitionEnd} className={className}>
      <div ref={containerRef}>{children}</div>
    </div>
  );
}
