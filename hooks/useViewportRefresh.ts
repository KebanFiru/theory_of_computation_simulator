"use client";
import { useEffect } from "react";
import type { UseViewportRefreshParams } from "../types/hooks";

export function useViewportRefresh({ forceRefresh, setViewportTick }: UseViewportRefreshParams) {
  useEffect(() => {
    const handleViewportChange = () => {
      forceRefresh();
      setViewportTick(tick => tick + 1);
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    const resizeObserver = new ResizeObserver(() => {
      handleViewportChange();
    });
    resizeObserver.observe(document.documentElement);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      resizeObserver.disconnect();
    };
  }, [forceRefresh, setViewportTick]);
}
