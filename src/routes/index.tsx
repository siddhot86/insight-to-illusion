import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Upload, Sparkles, Copy, Film, Camera, Users, Wand2, Loader2 } from "lucide-react";

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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }, []);

  const analyze = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = (await res.json()) as AnalysisResult;
      if (!res.ok || data.error) {
        toast.error(data.error || "Analysis failed");
      } else {
        setResult(data);
        toast.success("Scene analyzed");
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

  return (
    <div className="min-h-screen bg-background bg-aurora">
      <Toaster theme="dark" position="top-center" />
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-10 bg-background/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Cineprompt</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Scene → Video prompt engine</p>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Runway · Pika · Sora · Kling
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section className="text-center space-y-4 py-8">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Turn one scene into a <span className="text-gradient">cinematic video prompt</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload any image. We analyze subjects, lighting, mood, and faces — then craft
            character-consistent, camera-directed prompts for every major AI video tool.
          </p>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="Scene preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={analyze} disabled={loading} className="flex-1" size="lg">
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
      </main>
      <footer className="text-center text-xs text-muted-foreground py-8">
        Powered by Lovable AI · Multimodal vision analysis
      </footer>
    </div>
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
              if (vp?.lighting_continuity) parts.push(`\nLighting Continuity:\n${vp.lighting_continuity}`);
              if (result.character_consistency_guidelines?.length) {
                parts.push(
                  `\nCharacter Consistency:\n${result.character_consistency_guidelines.map((g) => `- ${g}`).join("\n")}`
                );
              }
              if (result.negative_prompt) parts.push(`\nNegative Prompt:\n${result.negative_prompt}`);
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
