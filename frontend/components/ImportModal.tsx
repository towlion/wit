"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { ImportCsvResponse, ImportJsonResponse } from "@/lib/types";

interface Props {
  basePath: string;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ basePath, onClose, onImported }: Props) {
  const [tab, setTab] = useState<"csv" | "json">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  function handleFileChange(f: File | null) {
    setFile(f);
    setResult(null);
    setErrors([]);

    if (f && tab === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        const rows = lines.slice(0, 6).map((l) => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const ch of l) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
            current += ch;
          }
          result.push(current.trim());
          return result;
        });
        setPreview(rows);
      };
      reader.readAsText(f);
    } else {
      setPreview([]);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);
    setErrors([]);

    try {
      if (tab === "csv") {
        const res = await api.upload<ImportCsvResponse>(`${basePath}/import/csv`, file);
        setResult(`Created ${res.created} item${res.created !== 1 ? "s" : ""}`);
        setErrors(res.errors);
      } else {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await api.post<ImportJsonResponse>(`${basePath}/import/json`, data);
        setResult(
          `Created ${res.created} item${res.created !== 1 ? "s" : ""}, ${res.states_created} state${res.states_created !== 1 ? "s" : ""}, ${res.labels_created} label${res.labels_created !== 1 ? "s" : ""}`
        );
      }
      onImported();
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Import data">
      <div ref={dialogRef} className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Import data</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden mb-4" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "csv"}
            onClick={() => { setTab("csv"); setFile(null); setPreview([]); setResult(null); setErrors([]); }}
            className={`text-xs px-4 py-2 font-medium flex-1 transition-colors ${
              tab === "csv" ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]" : "text-[var(--text-muted)]"
            }`}
          >
            CSV
          </button>
          <button
            role="tab"
            aria-selected={tab === "json"}
            onClick={() => { setTab("json"); setFile(null); setPreview([]); setResult(null); setErrors([]); }}
            className={`text-xs px-4 py-2 font-medium flex-1 transition-colors ${
              tab === "json" ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]" : "text-[var(--text-muted)]"
            }`}
          >
            JSON
          </button>
        </div>

        <div className="mb-4">
          <input
            ref={fileRef}
            type="file"
            accept={tab === "csv" ? ".csv" : ".json"}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--bg-tertiary)] file:text-[var(--text-secondary)] file:text-xs file:cursor-pointer"
          />
        </div>

        {preview.length > 0 && tab === "csv" && (
          <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[var(--bg-tertiary)]">
                  {preview[0].map((h, i) => (
                    <th key={i} className="px-2 py-1.5 text-left font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr key={i} className="border-t border-[var(--border-subtle)]">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 text-[var(--text-secondary)] max-w-[120px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className={`mb-4 p-3 rounded-lg text-xs ${result.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {result}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-400 text-xs space-y-1 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i}>Row {err.row}: {err.message}</div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
