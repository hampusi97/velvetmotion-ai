"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastItem = { id: string; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string) => {
    setToasts((current) => {
      if (current.some((toast) => toast.message === message)) return current;
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== id));
      }, 3400);
      return [...current, { id, message }];
    });
  }, []);

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <p key={toast.id} role="status" className="toast">
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
