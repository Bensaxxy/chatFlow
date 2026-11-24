"use client";

import { ChevronRight, EllipsisVertical, LoaderCircle, type LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
  dividerBefore?: boolean;
  description?: string;
  submenu?: ActionMenuItem[];
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [submenuTheme, setSubmenuTheme] = useState({ appearance: "light", wallpaper: "none", bubbleColor: "cyan" });
  const isOpen = open ?? uncontrolledOpen;

  const showSubmenu = (id: string, element: HTMLElement, itemCount: number): void => {
    const rect = element.getBoundingClientRect();
    const width = 160;
    const height = itemCount * 40 + 8;
    const left = rect.right + width <= window.innerWidth - 8 ? rect.right : Math.max(8, rect.left - width);
    setSubmenuPosition({ top: Math.max(8, Math.min(rect.top, window.innerHeight - height - 8)), left });
    const themeRoot = rootRef.current?.closest<HTMLElement>(".chat-theme");
    setSubmenuTheme({
      appearance: themeRoot?.dataset.chatAppearance ?? "light",
      wallpaper: themeRoot?.dataset.chatWallpaper ?? "none",
      bubbleColor: themeRoot?.dataset.chatBubbleColor ?? "cyan",
    });
    setActiveSubmenu(id);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const placeMenu = (): void => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const margin = 8;
      const above = triggerRect.top - margin;
      const below = window.innerHeight - triggerRect.bottom - margin;
      const opensUp = side === "top"
        ? above >= Math.min(menuRect.height, 240) || above >= below
        : above >= Math.min(menuRect.height, 240) && above > below;
      const height = Math.min(menuRect.height, window.innerHeight - margin * 2);
      const top = opensUp
        ? Math.max(margin, triggerRect.top - 8 - height)
        : Math.min(window.innerHeight - margin - height, triggerRect.bottom + 8);
      const left = align === "start" ? triggerRect.left : triggerRect.right - menuRect.width;
      setMenuPosition({ top, left: Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin)) });
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [align, isOpen, items.length, side]);

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
        !rootRef.current?.contains(event.target) &&
        !submenuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveSubmenu(null);
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
      ref={rootRef}
      className={`chat-themed-menu relative shrink-0 ${isOpen ? "z-[70]" : "z-0"}`}
    >
      <button
        ref={triggerRef}
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
          ref={menuRef}
          role="menu"
          aria-label={menuLabel ?? label}
          style={menuPosition ? { position: "fixed", top: menuPosition.top, left: menuPosition.left, maxHeight: "calc(100dvh - 16px)", overflowY: "auto" } : { position: "fixed", visibility: "hidden" }}
          className={`chat-themed-menu z-[90] overflow-x-hidden rounded-lg border border-[var(--chat-border,#e2e8f0)] bg-[var(--chat-surface,#ffffff)] py-0.5 shadow-lg ${menuClassName}`}
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id} onMouseEnter={(event) => {
                if (submenuCloseTimerRef.current !== null) window.clearTimeout(submenuCloseTimerRef.current);
                if (!item.submenu) {
                  setActiveSubmenu(null);
                  return;
                }
                showSubmenu(item.id, event.currentTarget, item.submenu.length);
              }} onMouseLeave={() => {
                if (item.submenu) {
                  submenuCloseTimerRef.current = window.setTimeout(() => setActiveSubmenu(null), 180);
                }
              }}>
                {item.dividerBefore && (
                  <div className="my-0.5 border-t border-[var(--chat-border,#f1f5f9)]" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onFocus={(event) => {
                    if (!item.submenu) return;
                    showSubmenu(item.id, event.currentTarget, item.submenu.length);
                  }}
                  onClick={(event) => {
                    if (item.submenu) {
                      showSubmenu(item.id, event.currentTarget, item.submenu.length);
                      return;
                    }
                    setIsOpen(false);
                    item.onSelect();
                  }}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    toneClassNames[item.tone ?? "default"]
                  }`}
                  aria-haspopup={item.submenu ? "menu" : undefined}
                  aria-expanded={item.submenu ? activeSubmenu === item.id : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block truncate">{item.label}</span>
                    {item.description && <span className="block truncate text-[10px] font-normal opacity-70">{item.description}</span>}
                  </span>
                  {item.submenu && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                </button>
                {item.submenu && activeSubmenu === item.id && submenuPosition && typeof document !== "undefined" && createPortal(
                  <div className="chat-theme" data-chat-appearance={submenuTheme.appearance} data-chat-wallpaper={submenuTheme.wallpaper} data-chat-bubble-color={submenuTheme.bubbleColor} style={{ position: "fixed", top: submenuPosition.top, left: submenuPosition.left, zIndex: 120 }}>
                  <div ref={submenuRef} role="menu" onMouseEnter={() => {
                    if (submenuCloseTimerRef.current !== null) window.clearTimeout(submenuCloseTimerRef.current);
                  }} onMouseLeave={() => setActiveSubmenu(null)} className="chat-themed-menu min-w-40 overflow-hidden rounded-lg border border-[var(--chat-border,#e2e8f0)] bg-[var(--chat-surface,#ffffff)] py-0.5 shadow-lg">
                    {item.submenu.map((subitem) => {
                      const SubIcon = subitem.icon;
                      return <button key={subitem.id} type="button" role="menuitem" onClick={() => { setIsOpen(false); setActiveSubmenu(null); subitem.onSelect(); }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition ${toneClassNames[subitem.tone ?? "default"]}`}><SubIcon className="h-4 w-4 shrink-0" /><span className="truncate">{subitem.label}</span></button>;
                    })}
                  </div></div>, document.body
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
