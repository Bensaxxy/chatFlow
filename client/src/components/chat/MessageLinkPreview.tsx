"use client";

import { ExternalLink, Link2, LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { MessageLinkPreview as LinkPreview } from "@/types/message";

interface MessageLinkPreviewProps {
  preview: LinkPreview;
  isMine: boolean;
}

export default function MessageLinkPreview({
  preview,
  isMine,
}: MessageLinkPreviewProps) {
  const [isImageVisible, setIsImageVisible] = useState(
    Boolean(preview.imageUrl),
  );

  const isLoading = preview.status === "loading";
  const isFallback = preview.status === "failed";
  const title = preview.title ?? preview.domain;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={"Open link preview for " + preview.domain}
      className={[
        "group mt-2 block max-w-full overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isMine
          ? "border-cyan-300/70 bg-cyan-700/30 hover:bg-cyan-700/45 focus-visible:ring-cyan-100 focus-visible:ring-offset-cyan-600"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100 focus-visible:ring-cyan-600 focus-visible:ring-offset-white",
      ].join(" ")}
    >
      {isImageVisible && preview.imageUrl && !isLoading && (
        <img
          src={preview.imageUrl}
          alt=""
          onError={() => setIsImageVisible(false)}
          className="block h-32 w-full bg-slate-200 object-cover sm:h-36"
        />
      )}

      <span className="block min-w-0 p-3">
        <span
          className={[
            "flex items-center gap-1.5 text-[11px] font-semibold",
            isMine ? "text-cyan-100" : "text-cyan-700",
          ].join(" ")}
        >
          {isLoading ? (
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{preview.domain}</span>
        </span>

        {isLoading ? (
          <span
            className={[
              "mt-2 block h-4 w-3/4 animate-pulse rounded",
              isMine ? "bg-cyan-400/40" : "bg-slate-200",
            ].join(" ")}
          />
        ) : (
          <span
            className={[
              "mt-1.5 block break-words text-sm font-semibold leading-5",
              isMine ? "text-white" : "text-slate-900",
            ].join(" ")}
          >
            {title}
          </span>
        )}

        {isLoading ? (
          <span
            className={[
              "mt-2 block h-3 w-full animate-pulse rounded",
              isMine ? "bg-cyan-400/25" : "bg-slate-200/80",
            ].join(" ")}
          />
        ) : preview.description ? (
          <span
            className={[
              "mt-1 block line-clamp-2 text-xs leading-5",
              isMine ? "text-cyan-50" : "text-slate-600",
            ].join(" ")}
          >
            {preview.description}
          </span>
        ) : null}

        <span
          className={[
            "mt-2 flex items-center gap-1 text-xs font-medium",
            isMine ? "text-cyan-100" : "text-slate-500",
          ].join(" ")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isLoading
            ? "Loading preview…"
            : isFallback
              ? "Open link"
              : "Open preview"}
        </span>
      </span>
    </a>
  );
}
