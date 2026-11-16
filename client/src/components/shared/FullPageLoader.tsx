import { LoaderCircle, MessageCircleMore } from "lucide-react";

interface FullPageLoaderProps {
  message?: string;
}

export default function FullPageLoader({
  message = "Loading...",
}: FullPageLoaderProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <MessageCircleMore className="h-8 w-8" />

        <LoaderCircle className="absolute -bottom-2 -right-2 h-6 w-6 animate-spin rounded-full bg-white text-cyan-600" />
      </div>

      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
