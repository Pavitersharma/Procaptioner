import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, Plus, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProCaptioner" },
      {
        name: "description",
        content: "Your ProCaptioner workspace — manage projects, upload footage, and track usage.",
      },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    // Navigate to editor with upload
    navigate({ to: "/editor" });
  };

  return (
    <DashboardLayout activeTab="home">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ── Welcome Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back, Paviter</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Upload footage to create subtitles, captions, and translations with AI.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-xs font-bold tracking-wide text-black uppercase transition-all hover:bg-brand-orange-hover active:scale-[0.98] cursor-pointer shadow-md shadow-orange-500/10"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>

        {/* ── Drop Footage Area ── */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
          }}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[#0d0d0d] px-6 py-16 text-center transition-all duration-200 ${
            dragOver
              ? "border-[#ff7a00] bg-[#ff7a00]/5 shadow-[0_0_40px_-10px_rgba(255,122,0,0.15)]"
              : "border-neutral-800 hover:border-neutral-600"
          }`}
        >
          {/* Upload icon */}
          <div
            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
              dragOver ? "border-[#ff7a00]/40 bg-[#ff7a00]/10" : "border-neutral-800 bg-[#121212]"
            }`}
          >
            <Upload
              className={`h-6 w-6 transition-colors ${
                dragOver ? "text-[#ff7a00]" : "text-neutral-400"
              }`}
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">Drop footage here</h2>
          <p className="mt-2 font-mono text-[0.65rem] tracking-[0.18em] text-neutral-500 uppercase">
            MP4, MOV, WEBM or Audio — up to 5GB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 rounded-lg border border-neutral-700/70 bg-[#1a1a1a] px-5 py-2.5 font-mono text-[0.68rem] font-medium tracking-[0.16em] text-neutral-200 uppercase transition-all hover:bg-neutral-800 hover:border-neutral-500 active:scale-[0.98] cursor-pointer"
          >
            Choose a File
          </button>
        </div>

        {/* ── Plan / Storage / Transcription Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Plan */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-6">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Plan
            </p>
            <p className="mt-3 text-2xl font-bold text-white">Free</p>
            <p className="mt-2 text-xs text-neutral-400">Basic access with limited credits</p>
            <Link
              to="/pricing"
              className="mt-4 block w-full text-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer"
            >
              Upgrade Plan
            </Link>
          </div>

          {/* Storage */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-6">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Storage Used
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">—</span>
              <span className="font-mono text-xs text-neutral-500">of 5.0 GB</span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full bg-emerald-500 w-[2%] rounded-full transition-all" />
            </div>
          </div>

          {/* Transcription */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-6">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Transcription
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">0 min</span>
              <span className="font-mono text-xs text-neutral-500">of 60 min</span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full bg-[#ff7a00] w-[0%] rounded-full transition-all" />
            </div>
          </div>
        </div>

        {/* ── Recent Projects ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
            <Link
              to="/editor"
              className="text-xs text-brand-orange hover:text-brand-orange/80 transition-colors cursor-pointer"
            >
              Open editor
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800/80 bg-[#0d0d0d] px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-[#121212] mb-4">
              <Sparkles className="h-5 w-5 text-neutral-500" />
            </div>
            <p className="text-lg font-bold tracking-tight text-white">No projects yet</p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Upload a clip above to create your first project
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
