"use client";
import React from "react";
import {DFANameDialogProps} from "../types/types";


export default function DFANameDialog({
  isOpen,
  dfaName,
  onNameChange,
  onSave,
  onCancel
}: DFANameDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Name Your DFA</h3>
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded mb-4 text-black"
          placeholder="Enter DFA name..."
          value={dfaName}
          onChange={e => onNameChange(e.target.value)}
          onKeyPress={e => e.key === "Enter" && onSave()}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
