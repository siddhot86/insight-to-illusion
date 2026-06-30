import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clapperboard, Plus, X, Info, Maximize2 } from "lucide-react";
import {
  EASING_PRESETS,
  MOTION_CATEGORIES,
  MOTION_TECHNIQUES,
  defaultEntryFor,
  getTechnique,
  type MotionConfigValue,
  type MotionEntry,
  type MotionTechnique,
} from "@/lib/motion-techniques";

/**
 * Multi-select motion / camera configurator.
 * - One dropdown per category (Camera, Subject, Complex)
 * - Each dropdown's items show a live animated preview + description on hover
 * - Selected techniques stack as chips with their own contextual controls
 */
export function MotionConfig({
  value,
  onChange,
  sectionLabel,
}: {
  value: MotionConfigValue;
  onChange: (next: MotionConfigValue) => void;
  sectionLabel: string;
}) {
  const entries: MotionEntry[] = Array.isArray(value) ? value : [];

  const byCategory = useMemo(() => {
    return MOTION_CATEGORIES.map((cat) => ({
      ...cat,
      items: MOTION_TECHNIQUES.filter((t) => t.category === cat.id),
    }));
  }, []);

  const selectedIds = new Set(entries.map((e) => e.techniqueId));

  const addTechnique = (techniqueId: string) => {
    if (selectedIds.has(techniqueId)) return;
    onChange([...entries, defaultEntryFor(techniqueId)]);
  };
  const removeAt = (idx: number) =>
    onChange(entries.filter((_, i) => i !== idx));
  const updateAt = (idx: number, patch: Partial<MotionEntry>) =>
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-3">
      <PreviewStyles />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <Clapperboard className="size-3.5 text-primary" />
          Motion & camera
          <span className="text-muted-foreground font-normal">· {sectionLabel}</span>
          {entries.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({entries.length} selected)
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category pickers — separate dropdown per category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {byCategory.map((cat) => (
          <CategoryPicker
            key={cat.id}
            categoryLabel={cat.label}
            items={cat.items}
            selectedIds={selectedIds}
            onPick={addTechnique}
          />
        ))}
      </div>

      {/* Selected techniques with contextual controls */}
      {entries.length > 0 && (
        <div className="space-y-2 pt-1">
          {entries.map((entry, idx) => {
            const t = getTechnique(entry.techniqueId);
            if (!t) return null;
            return (
              <EntryCard
                key={`${entry.techniqueId}-${idx}`}
                technique={t}
                entry={entry}
                onChange={(patch) => updateAt(idx, patch)}
                onRemove={() => removeAt(idx)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Category picker with hover preview ---------------- */

function CategoryPicker({
  categoryLabel,
  items,
  selectedIds,
  onPick,
}: {
  categoryLabel: string;
  items: MotionTechnique[];
  selectedIds: Set<string>;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const preview = hoverId ? getTechnique(hoverId) : null;
  const selectedCount = items.filter((i) => selectedIds.has(i.id)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-xs hover:border-primary/60 transition"
        >
          <span className="truncate text-foreground/80">
            {categoryLabel}
            {selectedCount > 0 && (
              <span className="ml-1 text-primary">· {selectedCount}</span>
            )}
          </span>
          <Plus className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[460px] p-0 overflow-hidden"
        onMouseLeave={() => setHoverId(null)}
      >
        <div className="grid grid-cols-[1fr_180px]">
          <div className="max-h-72 overflow-y-auto py-1 border-r border-border/60">
            {items.map((t) => {
              const already = selectedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={already}
                  onMouseEnter={() => setHoverId(t.id)}
                  onFocus={() => setHoverId(t.id)}
                  onClick={() => {
                    onPick(t.id);
                    setOpen(false);
                  }}
                  className={
                    "w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition " +
                    (already
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground cursor-pointer")
                  }
                >
                  <span className="truncate">{t.label}</span>
                  {already && (
                    <span className="text-[10px] text-muted-foreground">Added</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-3 bg-muted/30 flex flex-col gap-2 text-[11px]">
            {preview ? (
              <>
                <MotionPreview techniqueId={preview.id} />
                <div className="font-medium text-foreground/90">{preview.label}</div>
                <p className="text-muted-foreground leading-snug">
                  {preview.description}
                </p>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-muted-foreground gap-1.5">
                <Info className="size-3" />
                Hover a technique
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Selected entry card ---------------- */

function EntryCard({
  technique,
  entry,
  onChange,
  onRemove,
}: {
  technique: MotionTechnique;
  entry: MotionEntry;
  onChange: (patch: Partial<MotionEntry>) => void;
  onRemove: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="shrink-0 rounded-md ring-1 ring-transparent hover:ring-primary/50 transition cursor-zoom-in"
              aria-label={`Preview ${technique.label} full screen`}
            >
            >
              <MotionPreview techniqueId={technique.id} size={44} />
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-64 p-3 space-y-2">
            <MotionPreview techniqueId={technique.id} size={220} />
            <div className="text-xs font-medium text-foreground/90">{technique.label}</div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {technique.description}
            </p>
          </HoverCardContent>
        </HoverCard>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground/90 truncate">
              {technique.label}
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive p-0.5"
              aria-label="Remove technique"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground leading-snug">
            {technique.description}
          </p>
        </div>
      </div>

      {technique.directions && technique.directions.length > 0 && (
        <div className="space-y-1">
          <Label>Direction</Label>
          <div className="flex flex-wrap gap-1.5">
            {technique.directions.map((d) => {
              const active = entry.direction === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onChange({ direction: d.id })}
                  className={
                    "px-2.5 py-0.5 rounded-full text-[11px] border transition " +
                    (active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 hover:border-primary/60 hover:bg-primary/10 text-foreground/70")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {technique.hasIntensity && (
        <Field label="Intensity / Speed" valueLabel={`${entry.intensity}`}>
          <Slider
            value={[entry.intensity]}
            onValueChange={(v) => onChange({ intensity: v[0] ?? 0 })}
            min={0}
            max={100}
            step={5}
          />
        </Field>
      )}

      {technique.hasDuration && (
        <Field label="Duration" valueLabel={`${entry.duration}s`}>
          <Slider
            value={[entry.duration]}
            onValueChange={(v) => onChange({ duration: v[0] ?? 1 })}
            min={1}
            max={15}
            step={1}
          />
        </Field>
      )}

      {technique.hasEasing && (
        <div className="space-y-1">
          <Label>Easing curve</Label>
          <Select value={entry.easing} onValueChange={(v) => onChange({ easing: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EASING_PRESETS.map((e) => (
                <SelectItem key={e.id} value={e.id} className="text-xs">
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-foreground/80 block">{children}</label>
  );
}

function Field({
  label,
  valueLabel,
  children,
}: {
  label: string;
  valueLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <label className="font-medium text-foreground/80">{label}</label>
        <span className="text-muted-foreground tabular-nums">{valueLabel}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------------- Animated previews ---------------- */

/** Small animated swatch that demonstrates the motion technique. */
function MotionPreview({ techniqueId, size = 120 }: { techniqueId: string; size?: number }) {
  return (
    <div
      className="mp-stage"
      style={{ width: size, height: Math.round(size * 0.66) }}
      aria-hidden
    >
      <div className={`mp-frame mp-${techniqueId}`}>
        <span className="mp-subject" />
      </div>
    </div>
  );
}

function PreviewStyles() {
  return (
    <style>{`
.mp-stage{position:relative;border-radius:6px;background:linear-gradient(135deg,hsl(var(--muted)/0.6),hsl(var(--muted)/0.2));overflow:hidden;border:1px solid hsl(var(--border)/0.6)}
.mp-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform-origin:center}
.mp-subject{width:22%;aspect-ratio:1;background:hsl(var(--primary));border-radius:4px;box-shadow:0 0 12px hsl(var(--primary)/0.45);display:block}
@keyframes mp-panH{0%,100%{transform:translateX(-25%)}50%{transform:translateX(25%)}}
@keyframes mp-panV{0%,100%{transform:translateY(-25%)}50%{transform:translateY(25%)}}
@keyframes mp-dolly{0%,100%{transform:scale(0.85)}50%{transform:scale(1.15)}}
@keyframes mp-truck{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
@keyframes mp-ped{0%,100%{transform:translateY(20%)}50%{transform:translateY(-20%)}}
@keyframes mp-crane{0%{transform:translate(-30%,20%)}50%{transform:translate(0,-25%)}100%{transform:translate(30%,20%)}}
@keyframes mp-steady{0%,100%{transform:translate(-5%,0) rotate(-1deg)}50%{transform:translate(5%,0) rotate(1deg)}}
@keyframes mp-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-3px,2px)}40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,-3px)}80%{transform:translate(2px,3px)}}
@keyframes mp-orbit{from{transform:rotate(0) translateX(28%) rotate(0)}to{transform:rotate(360deg) translateX(28%) rotate(-360deg)}}
@keyframes mp-zoom{0%,100%{transform:scale(0.7)}50%{transform:scale(1.3)}}
@keyframes mp-rack{0%,100%{filter:blur(0)}50%{filter:blur(3px)}}
@keyframes mp-whip{0%{transform:translateX(-40%);filter:blur(0)}40%{transform:translateX(0);filter:blur(8px)}60%{transform:translateX(0);filter:blur(8px)}100%{transform:translateX(40%);filter:blur(0)}}
@keyframes mp-vertigo{0%,100%{transform:scale(0.9)}50%{transform:scale(1.2) rotateZ(0.5deg)}}
@keyframes mp-slow{0%,100%{transform:translateX(-25%)}50%{transform:translateX(25%)}}
@keyframes mp-tl{0%{transform:translateX(-40%) scale(0.7);opacity:.5}100%{transform:translateX(40%) scale(1.1);opacity:1}}
@keyframes mp-stop{0%,24%{transform:translateX(-30%)}25%,49%{transform:translateX(-10%)}50%,74%{transform:translateX(10%)}75%,100%{transform:translateX(30%)}}
@keyframes mp-mg{0%,100%{opacity:.4;transform:translateY(20%)}50%{opacity:1;transform:translateY(-10%)}}
@keyframes mp-fx{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes mp-parallax{0%,100%{transform:translateX(-20%)}50%{transform:translateX(20%)}}
@keyframes mp-match{0%{transform:translateX(-40%) rotate(-8deg)}100%{transform:translateX(40%) rotate(8deg)}}
@keyframes mp-pushfocus{0%,100%{transform:scale(0.8);filter:blur(2px)}50%{transform:scale(1.2);filter:blur(0)}}

.mp-static .mp-subject{}
.mp-pan{animation:mp-panH 2.4s ease-in-out infinite}
.mp-tilt{animation:mp-panV 2.4s ease-in-out infinite}
.mp-dolly .mp-subject{animation:mp-dolly 2.4s ease-in-out infinite}
.mp-truck{animation:mp-truck 2.4s ease-in-out infinite}
.mp-pedestal{animation:mp-ped 2.4s ease-in-out infinite}
.mp-crane{animation:mp-crane 3s ease-in-out infinite}
.mp-steadicam{animation:mp-steady 2s ease-in-out infinite}
.mp-handheld{animation:mp-shake .35s linear infinite}
.mp-drone .mp-subject{animation:mp-orbit 3.5s linear infinite}
.mp-zoom .mp-subject{animation:mp-zoom 2.4s ease-in-out infinite}
.mp-rack_focus .mp-subject{animation:mp-rack 2.4s ease-in-out infinite}
.mp-whip_pan{animation:mp-whip 1.6s ease-in-out infinite}
.mp-dolly_zoom .mp-subject{animation:mp-vertigo 2.4s ease-in-out infinite}
.mp-slow_motion{animation:mp-slow 5s linear infinite}
.mp-timelapse{animation:mp-tl 1s linear infinite}
.mp-stop_motion{animation:mp-stop 2s steps(1) infinite}
.mp-motion_graphics .mp-subject{animation:mp-mg 2s ease-in-out infinite;border-radius:1px}
.mp-environment_fx .mp-subject{animation:mp-fx 1s ease-in-out infinite;width:6%}
.mp-parallax{animation:mp-parallax 3s ease-in-out infinite}
.mp-match_cut{animation:mp-match 2.4s ease-in-out infinite alternate}
.mp-orbital .mp-subject{animation:mp-orbit 3s linear infinite}
.mp-push_with_focus .mp-subject{animation:mp-pushfocus 2.4s ease-in-out infinite}
    `}</style>
  );
}
