"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

const ANIM_DURATION = 180;

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const t = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, ANIM_DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!shouldRender) return null;

  const backdropAnim = isClosing
    ? `fadeOut ${ANIM_DURATION}ms ease forwards`
    : `fadeIn 160ms ease`;

  const panelAnim = isClosing
    ? `scaleOut ${ANIM_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1) forwards`
    : `scaleIn 220ms cubic-bezier(0.32, 0.72, 0, 1)`;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ animation: backdropAnim }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        role="alertdialog"
        aria-modal="true"
        style={{ animation: panelAnim }}
      >
        <div className="flex items-start gap-4 mb-4">
          {destructive && (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-asa-error" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-asa-text">{title}</h3>
            <p className="text-sm text-asa-muted mt-1">{description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="btn-outline flex-1 justify-center"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 justify-center inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50 ${
              destructive
                ? "bg-asa-error text-white hover:opacity-90"
                : "btn-primary"
            }`}
          >
            {isPending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
