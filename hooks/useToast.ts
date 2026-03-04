"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastState } from "../types/page";

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: "error" | "success" | "info" = "error") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return { toast, showToast };
}
