"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ANIM_DURATION = 240; // ms — must be >= longest animation

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = "w-[480px]" }: DrawerProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    // open changed to false — play exit then unmount
    if (!shouldRender) return;
    setIsClosing(true);
    const t = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, ANIM_DURATION);
    return () => clearTimeout(t);
    // shouldRender intentionally omitted — only re-run when `open` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!shouldRender) return null;

  const panelAnim = isClosing
    ? `slideOutRight 200ms cubic-bezier(0.32, 0.72, 0, 1) forwards`
    : `slideInRight 280ms cubic-bezier(0.32, 0.72, 0, 1)`;

  const overlayAnim = isClosing
    ? `fadeOut 200ms ease forwards`
    : `fadeIn 220ms ease`;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        style={{ animation: overlayAnim }}
      />

      {/* Panel lateral */}
      <aside
        className={`${width} h-full bg-white flex flex-col shadow-2xl`}
        style={{ animation: panelAnim }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-asa-border shrink-0">
          <h2 className="text-lg font-semibold text-asa-text">{title}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </aside>
    </div>
  );
}
