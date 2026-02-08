"use client";
import React from "react";

interface SelectionModeIndicatorProps {
  isActive: boolean;
}

export default function SelectionModeIndicator({
  isActive
}: SelectionModeIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-lg shadow-lg z-50 font-bold">
      Selection Mode: Draw a rectangle around the DFA
    </div>
  );
}
