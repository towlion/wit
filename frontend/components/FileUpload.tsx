"use client";

import { useRef, useState, DragEvent } from "react";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    if (file.size > MAX_SIZE) {
      setError("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all text-xs ${
          dragging
            ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
            : "border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]/50"
        }`}
      >
        {uploading ? (
          <span className="text-[var(--text-muted)]">Uploading...</span>
        ) : (
          <span className="text-[var(--text-muted)]">
            Drop file here or <span className="text-[var(--accent)]">browse</span>
            <br />
            <span className="text-[10px]">Max 10MB</span>
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
