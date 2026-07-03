"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ResumeUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ title?: string; skills?: string[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    const resp = await fetch("/api/resume/upload", { method: "POST", body: form });
    const data = await resp.json();

    if (!resp.ok) {
      setStatus("error");
      setErrorMsg(data.error ?? "上傳失敗");
      return;
    }
    setStatus("done");
    setResult(data.resume);
    setTimeout(() => router.push("/onboarding/intent"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm border border-zinc-100">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="rounded-full bg-zinc-900 text-white px-2.5 py-0.5 font-medium">1</span>
          <span className="font-medium text-zinc-900">上傳履歷</span>
          <span className="text-zinc-300">—</span>
          <span className="text-zinc-400">2 求職意圖</span>
        </div>

        <h1 className="text-xl font-semibold text-zinc-900 mb-1">上傳你的履歷</h1>
        <p className="text-sm text-zinc-500 mb-6">我們會用 AI 分析你的技能，找到最匹配的職缺</p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-10 cursor-pointer hover:border-zinc-400 transition-colors mb-4"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-3xl mb-3">📄</span>
          {file ? (
            <p className="text-sm font-medium text-zinc-900">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700">拖曳 PDF 到這裡，或點擊選擇</p>
              <p className="text-xs text-zinc-400 mt-1">PDF 格式，最大 10MB</p>
            </>
          )}
        </div>

        {errorMsg && <p className="text-sm text-red-500 mb-3">{errorMsg}</p>}

        {status === "done" && result && (
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 mb-4 text-sm">
            <p className="font-medium text-green-800">解析完成 ✓</p>
            {result.title && <p className="text-green-700 mt-1">職稱：{result.title}</p>}
            {result.skills && result.skills.length > 0 && (
              <p className="text-green-700">技能：{result.skills.slice(0, 5).join("、")}</p>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || status === "uploading" || status === "done"}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {status === "uploading" ? "分析中…" : status === "done" ? "完成，跳轉中…" : "上傳並分析"}
        </button>
      </div>
    </div>
  );
}
