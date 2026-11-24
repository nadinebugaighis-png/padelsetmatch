import { useEffect, useRef, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type HoldMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;

/**
 * Wraps a chat bubble or comment. Like WhatsApp, its actions (Edit, Delete) only open after
 * pressing and holding still, so scrolling never pops the menu. A mouse click opens it on desktop.
 * With `disabled` (e.g. while the bubble is being edited) it renders a plain box.
 */
export function HoldMenu({ children, items: baseItems, className = "", hint, align = "end", disabled = false, copyText, copyLabel = "Copy", copiedLabel = "Copied" }: {
  children: ReactNode;
  items: HoldMenuItem[];
  copyText?: string;
  copyLabel?: string;
  copiedLabel?: string;
  className?: string;
  hint: string;
  align?: "start" | "end";
  disabled?: boolean;
}) {
  const items: HoldMenuItem[] = copyText
    ? [{ label: copyLabel, icon: <Copy className="w-4 h-4" />, onSelect: () => { navigator.clipboard?.writeText(copyText).then(() => toast.success(copiedLabel), () => {}); } }, ...baseItems]
    : baseItems;
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
    setHolding(false);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  if (disabled || items.length === 0) return <div className={className}>{children}</div>;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={hint}
          onPointerDown={(e) => {
            // Stop the menu opening on first touch; we decide below.
            e.preventDefault();
            if (e.pointerType === "mouse") return;
            start.current = { x: e.clientX, y: e.clientY };
            setHolding(true);
            timer.current = window.setTimeout(() => {
              timer.current = undefined;
              setHolding(false);
              setOpen(true);
              try { navigator.vibrate?.(12); } catch { /* not supported */ }
            }, HOLD_MS);
          }}
          onPointerMove={(e) => {
            const s = start.current;
            if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE) clear();
          }}
          onPointerUp={(e) => { if (e.pointerType === "mouse" && e.button === 0) setOpen(true); clear(); }}
          onPointerCancel={clear}
          onPointerLeave={clear}
          onContextMenu={(e) => e.preventDefault()}
          className={`cursor-pointer select-none [-webkit-touch-callout:none] [-webkit-user-select:none] outline-none transition-[transform,filter] duration-300 ${holding ? "scale-[0.97] brightness-95" : ""} ${open ? "ring-2 ring-[var(--pitch)]/40" : ""} ${className}`}
        >
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-36 bg-white text-[var(--ink)] border-[var(--ink)]/16">
        {items.map((it) => (
          <DropdownMenuItem
            key={it.label}
            onSelect={it.onSelect}
            className={it.destructive ? "text-destructive focus:text-destructive" : undefined}
          >
            {it.icon}{it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
