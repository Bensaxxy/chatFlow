import { LoaderCircle, MessageCircleMore } from "lucide-react";

interface ChatFlowLoaderProps {
  message?: string;
  fullScreen?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ChatFlowLoader({
  message = "Loading...",
  fullScreen = false,
  compact = false,
  className = "",
}: ChatFlowLoaderProps) {
  const logoSize = compact ? "h-12 w-12 rounded-xl" : "h-16 w-16 rounded-2xl";
  const iconSize = compact ? "h-6 w-6" : "h-8 w-8";

  return (
    <div
      className={`flex w-full flex-col items-center justify-center bg-[var(--chat-app,#f1f5f9)] px-6 text-center text-[var(--chat-text,#0f172a)] ${
        fullScreen ? "min-h-screen" : "h-full min-h-0"
      } ${className}`}
    >
      <div className="relative">
        <span
          className={`flex items-center justify-center bg-[var(--chat-sent,#0f172a)] text-white shadow-lg shadow-slate-900/20 ${logoSize}`}
        >
          <MessageCircleMore className={iconSize} />
        </span>
        <LoaderCircle className="absolute -bottom-2 -right-2 h-6 w-6 animate-spin rounded-full bg-[var(--chat-surface,#ffffff)] p-1 text-[var(--chat-accent,#0891b2)] shadow-sm ring-1 ring-[var(--chat-border,#e2e8f0)]" />
      </div>

      <p className="mt-4 text-sm font-bold tracking-tight">ChatFlow</p>
      <p className="mt-1 text-sm text-[var(--chat-muted,#64748b)]">{message}</p>
    </div>
  );
}
