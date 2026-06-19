import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Upload,
  Sparkles,
  Copy,
  Film,
  Camera,
  Users,
  Wand2,
  Loader2,
  History,
  LogOut,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteAnalysis,
  getSignedImageUrl,
  listAnalyses,
  saveAnalysis,
  type HistoryRow,
} from "@/lib/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cineprompt — AI Scene to Video Prompt Generator" },
      {
        name: "description",
        content:
          "Upload any scene image to generate cinematic, character-consistent video prompts for Runway, Pika, Sora, Kling, and Veo.",
      },
      { property: "og:title", content: "Cineprompt — AI Scene to Video Prompt Generator" },
      {
        property: "og:description",
        content:
          "Turn a single image into production-ready AI video prompts with character consistency and camera direction.",
      },
    ],
  }),
  component: Home,
});

type AnalysisResult = {
  scene_analysis?: Record<string, unknown>;
  characters?: Array<Record<string, string>>;
  video_prompt?: Record<string, unknown>;
  character_consistency_guidelines?: string[];
  negative_prompt?: string;
  style_variations?: Record<string, string>;
  platform_optimized?: Record<string, string>;
  error?: string;
};

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [mode, setMode] = useState<"single" | "frames" | "refs">("single");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [view, setView] = useState<"new" | "history">("new");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "runway",
    "pika",
    "sora",
    "kling",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);


  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      setHistory(await listAnalyses());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && view === "history") refreshHistory();
  }, [user, view, refreshHistory]);

  const readFile = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        resolve(null);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error("Image must be under 8MB");
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const url = await readFile(file);
      if (url) {
        setImageDataUrl(url);
        setResult(null);
      }
    },
    [readFile],
  );

  const analyze = async () => {
    if (!imageDataUrl) return;
    if (mode === "frames" && !endFrame) {
      toast.error("Please upload an end frame");
      return;
    }
    if (mode === "refs" && refImages.length === 0) {
      toast.error("Please upload at least one reference image");
      return;
    }

    if (!user) {
      toast.error("Please sign in to analyze scenes.");
      navigate({ to: "/auth" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        navigate({ to: "/auth" });
        return;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageDataUrl,
          endFrame: mode === "frames" ? endFrame : undefined,
          referenceImages: mode === "refs" ? refImages : undefined,
          mode,
          tools: selectedTools,
        }),

      });
      const data = (await res.json()) as AnalysisResult;
      if (!res.ok || data.error) {
        toast.error(data.error || "Analysis failed");
      } else {
        setResult(data);
        toast.success("Scene analyzed");
        if (user) {
          try {
            await saveAnalysis({
              userId: user.id,
              imageDataUrl,
              result: data as Record<string, unknown>,
            });
            toast.success("Saved to history");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't save to history");
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const loadFromHistory = async (row: HistoryRow) => {
    setResult(row.result as AnalysisResult);
    setView("new");
    const url = await getSignedImageUrl(row.image_path);
    setImageDataUrl(url);
  };

  const removeFromHistory = async (row: HistoryRow) => {
    try {
      await deleteAnalysis(row);
      setHistory((h) => h.filter((r) => r.id !== row.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-background bg-aurora">
      <Toaster theme="dark" position="top-center" />
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-10 bg-background/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Cineprompt</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Scene → Video prompt engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant={view === "new" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("new")}
                >
                  <Sparkles className="size-4 mr-1.5" /> New
                </Button>
                <Button
                  variant={view === "history" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("history")}
                >
                  <History className="size-4 mr-1.5" /> History
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut} title={user.email ?? ""}>
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {view === "history" && user ? (
          <HistoryView
            rows={history}
            loading={historyLoading}
            onOpen={loadFromHistory}
            onDelete={removeFromHistory}
            onRefresh={refreshHistory}
          />
        ) : (
          <>
            <section className="text-center space-y-4 py-8">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight">
                Turn one scene into a <span className="text-gradient">cinematic video prompt</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Upload any image. We analyze subjects, lighting, mood, and faces — then craft
                character-consistent, camera-directed prompts for every major AI video tool.
              </p>
              {!user && (
                <p className="text-xs text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to automatically save your prompts to history.
                </p>
              )}
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card
                className="p-6 glow-ring bg-card/60 backdrop-blur-sm border-border/60"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {imageDataUrl ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border border-border/60 aspect-video bg-muted">
                      <img
                        src={imageDataUrl}
                        alt="Scene preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <ToolPicker selected={selectedTools} onChange={setSelectedTools} />
                    <div className="flex gap-2">
                      <Button
                        onClick={analyze}
                        disabled={loading || selectedTools.length === 0}
                        className="flex-1"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" /> Analyzing scene…
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4 mr-2" /> Generate video prompts
                          </>
                        )}
                      </Button>
                      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                        Replace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition flex flex-col items-center justify-center gap-3 text-muted-foreground"
                  >
                    <div className="size-14 rounded-full bg-primary/10 grid place-items-center">
                      <Upload className="size-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Drop a scene image</p>
                      <p className="text-sm">or click to browse · PNG, JPG, WEBP up to 8MB</p>
                    </div>
                  </button>
                )}
              </Card>

              <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/60 min-h-[400px]">
                {!result && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <Wand2 className="size-10 opacity-40" />
                    <p>Your video prompts will appear here</p>
                  </div>
                )}
                {loading && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p>Reading composition, lighting, and faces…</p>
                  </div>
                )}
                {result && <ResultView result={result} onCopy={copy} />}
              </Card>
            </div>
          </>
        )}
      </main>
      <footer className="text-center text-xs text-muted-foreground py-8">
        Powered by Lovable AI · Multimodal vision analysis
      </footer>
    </div>
  );
}

function HistoryView({
  rows,
  loading,
  onOpen,
  onDelete,
  onRefresh,
}: {
  rows: HistoryRow[];
  loading: boolean;
  onOpen: (r: HistoryRow) => void;
  onDelete: (r: HistoryRow) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your history</h2>
          <p className="text-sm text-muted-foreground">
            Every scene you've analyzed, ready to revisit.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      {loading && rows.length === 0 ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground bg-card/60 border-border/60">
          <History className="size-10 mx-auto opacity-40 mb-3" />
          <p>No analyses yet. Generate a prompt and it'll appear here.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <HistoryCard key={r.id} row={r} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryCard({
  row,
  onOpen,
  onDelete,
}: {
  row: HistoryRow;
  onOpen: (r: HistoryRow) => void;
  onDelete: (r: HistoryRow) => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSignedImageUrl(row.image_path).then((u) => active && setThumb(u));
    return () => {
      active = false;
    };
  }, [row.image_path]);

  return (
    <Card className="overflow-hidden bg-card/60 border-border/60 hover:border-primary/40 transition group">
      <button onClick={() => onOpen(row)} className="block w-full text-left">
        <div className="aspect-video bg-muted overflow-hidden">
          {thumb ? (
            <img src={thumb} alt={row.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground">
              <Film className="size-8 opacity-40" />
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="text-sm font-medium line-clamp-2">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </p>
        </div>
      </button>
      <div className="px-3 pb-3 flex justify-end">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 opacity-60 hover:opacity-100 hover:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function PromptBox({ text, onCopy }: { text: string; onCopy: (t: string) => void }) {
  return (
    <div className="relative group rounded-md border border-border/60 bg-background/40 p-3 text-sm leading-relaxed text-foreground/90">
      <p className="pr-8 whitespace-pre-wrap">{text}</p>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1.5 right-1.5 size-7 opacity-60 hover:opacity-100"
        onClick={() => onCopy(text)}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

function ResultView({
  result,
  onCopy,
}: {
  result: AnalysisResult;
  onCopy: (t: string, label?: string) => void;
}) {
  const vp = result.video_prompt as Record<string, string | number> | undefined;
  return (
    <Tabs defaultValue="prompt" className="w-full">
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="prompt">Prompt</TabsTrigger>
        <TabsTrigger value="platforms">Platforms</TabsTrigger>
        <TabsTrigger value="styles">Styles</TabsTrigger>
        <TabsTrigger value="characters">Faces</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="prompt" className="space-y-5 mt-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const parts: string[] = [];
              if (vp?.main_prompt) parts.push(`Main Prompt:\n${vp.main_prompt}`);
              if (vp?.camera_movement) parts.push(`\nCamera Movement:\n${vp.camera_movement}`);
              if (vp?.character_motion) parts.push(`\nCharacter Motion:\n${vp.character_motion}`);
              if (vp?.lighting_continuity)
                parts.push(`\nLighting Continuity:\n${vp.lighting_continuity}`);
              if (result.character_consistency_guidelines?.length) {
                parts.push(
                  `\nCharacter Consistency:\n${result.character_consistency_guidelines
                    .map((g) => `- ${g}`)
                    .join("\n")}`,
                );
              }
              if (result.negative_prompt)
                parts.push(`\nNegative Prompt:\n${result.negative_prompt}`);
              onCopy(parts.join("\n\n"), "All prompts copied");
            }}
          >
            <Copy className="size-3.5 mr-1.5" /> Copy all prompts
          </Button>
        </div>
        <Section title="Main video prompt" icon={<Film className="size-4 text-primary" />}>
          <PromptBox text={String(vp?.main_prompt ?? "—")} onCopy={onCopy} />
        </Section>
        <div className="grid sm:grid-cols-2 gap-4">
          <Section title="Camera movement" icon={<Camera className="size-4 text-primary" />}>
            <PromptBox text={String(vp?.camera_movement ?? "—")} onCopy={onCopy} />
          </Section>
          <Section title="Character motion" icon={<Users className="size-4 text-primary" />}>
            <PromptBox text={String(vp?.character_motion ?? "—")} onCopy={onCopy} />
          </Section>
        </div>
        <Section title="Lighting continuity" icon={<Sparkles className="size-4 text-primary" />}>
          <PromptBox text={String(vp?.lighting_continuity ?? "—")} onCopy={onCopy} />
        </Section>
        <div className="flex flex-wrap gap-2 text-xs">
          {vp?.duration_seconds && (
            <Badge variant="secondary">Duration: {vp.duration_seconds}s</Badge>
          )}
          {vp?.frame_rate && <Badge variant="secondary">FPS: {vp.frame_rate}</Badge>}
          {vp?.aspect_ratio && <Badge variant="secondary">AR: {vp.aspect_ratio}</Badge>}
        </div>
        {result.character_consistency_guidelines && (
          <Section title="Character consistency" icon={<Users className="size-4 text-primary" />}>
            <ul className="rounded-md border border-border/60 bg-background/40 p-3 text-sm space-y-1.5 list-disc list-inside text-foreground/90">
              {result.character_consistency_guidelines.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </Section>
        )}
        {result.negative_prompt && (
          <Section
            title="Negative prompt"
            icon={<span className="text-destructive text-sm">⊘</span>}
          >
            <PromptBox text={result.negative_prompt} onCopy={onCopy} />
          </Section>
        )}
      </TabsContent>

      <TabsContent value="platforms" className="space-y-3 mt-4">
        {Object.entries(result.platform_optimized ?? {}).map(([k, v]) => (
          <Section
            key={k}
            title={k.charAt(0).toUpperCase() + k.slice(1)}
            icon={<Film className="size-4 text-primary" />}
          >
            <PromptBox text={v} onCopy={onCopy} />
          </Section>
        ))}
      </TabsContent>

      <TabsContent value="styles" className="space-y-3 mt-4">
        {Object.entries(result.style_variations ?? {}).map(([k, v]) => (
          <Section
            key={k}
            title={k.replace(/_/g, " ")}
            icon={<Wand2 className="size-4 text-primary" />}
          >
            <PromptBox text={v} onCopy={onCopy} />
          </Section>
        ))}
      </TabsContent>

      <TabsContent value="characters" className="space-y-4 mt-4">
        {(result.characters ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No characters detected in scene.</p>
        )}
        {(result.characters ?? []).map((c, i) => (
          <div key={i} className="rounded-md border border-border/60 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Character {i + 1}</h4>
              <Badge variant="secondary">{c.emotion}</Badge>
            </div>
            <p className="text-sm text-foreground/80">{c.description}</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2">
              {Object.entries(c)
                .filter(([k]) => !["description", "emotion"].includes(k))
                .map(([k, v]) => (
                  <div key={k}>
                    <span className="text-foreground/60 capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                    {v}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="json" className="mt-4">
        <div className="relative">
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 z-10"
            onClick={() => onCopy(JSON.stringify(result, null, 2), "JSON copied")}
          >
            <Copy className="size-3.5 mr-1.5" /> Copy
          </Button>
          <pre className="rounded-md border border-border/60 bg-background/60 p-4 text-xs overflow-auto max-h-[500px] text-foreground/80">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );
}

const VIDEO_TOOLS: { id: string; label: string }[] = [
  { id: "runway", label: "Runway" },
  { id: "pika", label: "Pika" },
  { id: "sora", label: "Sora" },
  { id: "kling", label: "Kling" },
  { id: "veo", label: "Veo" },
  { id: "grok", label: "Grok" },
  { id: "seedance", label: "Seedance" },
  { id: "luma", label: "Luma" },
  { id: "hailuo", label: "Hailuo" },
  { id: "wan", label: "Wan" },
];

function ToolPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground/80">
          Optimize prompts for{" "}
          <span className="text-muted-foreground">({selected.length} selected)</span>
        </p>
        <button
          type="button"
          onClick={() =>
            onChange(selected.length === VIDEO_TOOLS.length ? [] : VIDEO_TOOLS.map((t) => t.id))
          }
          className="text-xs text-primary hover:underline"
        >
          {selected.length === VIDEO_TOOLS.length ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VIDEO_TOOLS.map((t) => {
          const active = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium border transition " +
                (active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/40 text-foreground/70 border-border hover:border-primary/50")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
