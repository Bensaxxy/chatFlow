"use client";

import { EllipsisVertical, LoaderCircle, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label: string;
  menuLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "bottom";
  align?: "start" | "end";
  isLoading?: boolean;
  triggerClassName?: string;
  menuClassName?: string;
}

const toneClassNames: Record<NonNullable<ActionMenuItem["tone"]>, string> = {
  default:
    "text-[var(--chat-text,#334155)] hover:bg-[var(--chat-hover,#f8fafc)]",
  danger: "text-red-700 hover:bg-red-500/10",
  success: "text-emerald-700 hover:bg-emerald-500/10",
};

export default function ActionMenu({
  items,
  label,
  menuLabel,
  open,
  onOpenChange,
  side = "bottom",
  align = "end",
  isLoading = false,
  triggerClassName = "h-8 w-8",
  menuClassName = "w-44",
}: ActionMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOpen = open ?? uncontrolledOpen;

  const setIsOpen = useCallback(
    (nextOpen: boolean): void => {
      if (open === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeWhenClickingOutside = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div
      ref={menuRef}
      className={`chat-themed-menu relative shrink-0 ${isOpen ? "z-[70]" : "z-0"}`}
    >
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
        className={`flex items-center justify-center rounded-full text-[var(--chat-muted,#64748b)] transition hover:bg-[var(--chat-hover,#f8fafc)] hover:text-[var(--chat-text,#0f172a)] hover:shadow-sm disabled:cursor-wait disabled:opacity-50 ${triggerClassName}`}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <EllipsisVertical className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={menuLabel ?? label}
          className={`chat-themed-menu absolute z-[80] overflow-hidden rounded-lg border border-[var(--chat-border,#e2e8f0)] bg-[var(--chat-surface,#ffffff)] py-0.5 shadow-lg ${menuClassName} ${
            side === "top" ? "bottom-9" : "top-9"
          } ${align === "start" ? "left-0" : "right-0"}`}
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id}>
                {item.dividerBefore && (
                  <div className="my-0.5 border-t border-[var(--chat-border,#f1f5f9)]" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    item.onSelect();
                  }}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    toneClassNames[item.tone ?? "default"]
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
