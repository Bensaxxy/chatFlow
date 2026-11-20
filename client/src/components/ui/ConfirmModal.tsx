"use client";

import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";

type ConfirmModalTone = "danger" | "primary";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: ConfirmModalTone;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  tone = "danger",
  isConfirming = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus();
    });

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isConfirming) {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isConfirming, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const isDanger = tone === "danger";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isDanger
                ? "bg-red-50 text-red-600"
                : "bg-cyan-50 text-cyan-700"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="confirm-modal-title" className="text-base font-semibold text-slate-950">
              {title}
            </h2>
            <p
              id="confirm-modal-description"
              className="mt-1.5 text-sm leading-6 text-slate-600"
            >
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            aria-label="Close confirmation"
            className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-cyan-600 hover:bg-cyan-700"
            }`}
          >
            {isConfirming && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isConfirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
