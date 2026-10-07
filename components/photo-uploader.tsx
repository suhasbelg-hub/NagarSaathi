"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import type { PhotoAsset } from "@/lib/types";

interface UploadItem extends PhotoAsset {
  id: string;
  file: File;
  progress: number;
  state: "uploading" | "uploaded" | "error";
  error?: string;
  retryable: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function compressForDemo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const localUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(localUrl);
        reject(new Error("This image could not be prepared. Try another photo."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.68);
      URL.revokeObjectURL(localUrl);
      resolve(data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(localUrl);
      reject(new Error("This file could not be opened as an image. Try another photo."));
    };
    image.src = localUrl;
  });
}

export function PhotoUploader({
  label,
  files,
  onChange,
  min = 1,
  max = 5,
  id,
  disabled = false
}: {
  label: string;
  files: PhotoAsset[];
  onChange: (files: PhotoAsset[]) => void;
  min?: number;
  max?: number;
  id: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const ready = items.filter((item) => item.state === "uploaded").map(({ src, label: photoLabel }) => ({ src, label: photoLabel }));
    onChangeRef.current(ready);
  }, [items]);

  const runUpload = async (item: UploadItem) => {
    setFileError("");
    if (!ACCEPTED.includes(item.file.type)) {
      const message = `${item.file.name}: choose a JPEG, PNG or WebP image.`;
      setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, state: "error", progress: 0, error: message, retryable: false } : current));
      return;
    }
    if (item.file.size > MAX_BYTES) {
      const sizeMb = (item.file.size / (1024 * 1024)).toFixed(1);
      const message = `${item.file.name} is ${sizeMb} MB. Each photo must be 5 MB or smaller.`;
      setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, state: "error", progress: 0, error: message, retryable: false } : current));
      return;
    }
    setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, state: "uploading", progress: 8, error: undefined, retryable: true } : current));
    let progress = 8;
    const ticker = window.setInterval(() => {
      progress = Math.min(92, progress + 19);
      setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, progress } : current));
    }, 90);
    try {
      let src = "";
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("bucket", id.includes("fix") ? "fix-photos" : "grievance-photos");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json();
        if (result.ok && result.src) {
          src = result.src;
        }
      } catch {
        // Fall back to client compression if endpoint is unreachable
      }
      if (!src) {
        src = await compressForDemo(item.file);
      }
      window.clearInterval(ticker);
      setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, src, progress: 100, state: "uploaded" as const, retryable: false } : current));
    } catch (error) {
      window.clearInterval(ticker);
      const message = error instanceof Error ? error.message : "Photo upload failed. Retry or choose a different image.";
      setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, state: "error", error: message, progress: 0, retryable: true } : current));
    }
  };

  const addFiles = (fileList: FileList | File[]) => {
    if (disabled) return;
    const selected = Array.from(fileList);
    if (!selected.length) return;
    const available = max - items.length;
    if (available <= 0) {
      setFileError(`You can add up to ${max} photos here.`);
      return;
    }
    const accepted = selected.slice(0, available).map((file) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      src: URL.createObjectURL(file),
      label: file.name,
      progress: 0,
      state: "uploading" as const,
      retryable: true
    }));
    if (selected.length > available) setFileError(`Only ${available} more ${available === 1 ? "photo can" : "photos can"} be added.`);
    else setFileError("");
    setItems((previous) => [...previous, ...accepted]);
    accepted.forEach((item) => void runUpload(item));
  };

  const removeItem = (idToRemove: string) => {
    setItems((previous) => {
      const item = previous.find((current) => current.id === idToRemove);
      if (item?.src.startsWith("blob:")) URL.revokeObjectURL(item.src);
      const next = previous.filter((current) => current.id !== idToRemove);
      return next;
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const allItems = items;
  const availableCount = max - allItems.length;

  return <div className="photo-uploader">
    <div className="photo-uploader-heading"><div><h3>{label}</h3><p>Choose clear photos that show the issue.</p></div><span className="upload-count tabular">{allItems.filter((item) => item.state === "uploaded").length}/{max}</span></div>
    <button
      type="button"
      className={`dropzone ${dragging ? "dropzone-dragging" : ""} ${disabled || availableCount <= 0 ? "dropzone-disabled" : ""}`}
      aria-describedby={`${id}-constraints`}
      disabled={disabled || availableCount <= 0}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="dropzone-icon"><ImagePlus size={22} aria-hidden="true" /></span>
      <span className="dropzone-title">Drag photos here or <span className="text-link">browse</span></span>
      <span className="dropzone-subtitle">{min}–{max} photos · JPEG, PNG or WebP · up to 5 MB each</span>
    </button>
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      className="sr-only"
      aria-label={`Add ${label.toLowerCase()}`}
      onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }}
    />
    <span id={`${id}-constraints`} className="sr-only">Select between {min} and {max} JPEG, PNG or WebP photos. Maximum file size is 5 megabytes.</span>
    {fileError ? <p className="field-error" role="alert"><AlertCircle size={15} />{fileError}</p> : null}
    {allItems.length ? <ul className="upload-list" aria-label={`${label} selected`}>
      {allItems.map((item) => <li className={`upload-item ${item.state === "error" ? "upload-item-error" : ""}`} key={item.id}>
        <div className="upload-thumb"><img src={item.src} alt={item.label} />
          {item.state === "uploading" ? <span className="thumb-progress" aria-hidden="true"><LoaderCircle size={18} /></span> : null}
        </div>
        <div className="upload-item-info"><strong title={item.label}>{item.label}</strong>
          {item.state === "uploading" ? <><span className="upload-status">Uploading photo · {item.progress}%</span><span className="progress-track"><span style={{ width: `${item.progress}%` }} /></span></> : null}
          {item.state === "uploaded" ? <span className="upload-status upload-status-ready"><CheckCircle2 size={13} />Ready to submit</span> : null}
          {item.state === "error" ? <span className="upload-status upload-status-error"><AlertCircle size={13} />{item.error}</span> : null}
        </div>
        <div className="upload-actions">
          {item.state === "error" && item.retryable ? <button type="button" className="icon-button" aria-label={`Retry ${item.label}`} onClick={() => void runUpload(item)}><RefreshCw size={16} /></button> : null}
          <button type="button" className="icon-button icon-danger" aria-label={`Remove ${item.label}`} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ul> : null}
    <span className="sr-only" aria-live="polite" aria-atomic="true">{items.map((item) => `${item.label}: ${item.state === "uploaded" ? "ready to submit" : item.state === "error" ? item.error ?? "upload failed" : "upload in progress"}`).join(". ")}</span>
  </div>;
}
