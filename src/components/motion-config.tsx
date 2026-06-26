import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Clapperboard } from "lucide-react";
import {
  DEFAULT_MOTION,
  EASING_PRESETS,
  MOTION_CATEGORIES,
  MOTION_TECHNIQUES,
  NONE_ID,
  getTechnique,
  type MotionConfigValue,
} from "@/lib/motion-techniques";

/**
 * Reusable motion / camera-movement configurator.
 * Drop one per section — fully self-contained, scalable via the registry.
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
  const technique = useMemo(() => getTechnique(value.techniqueId), [value.techniqueId]);
  const enabled = value.techniqueId !== NONE_ID && !!technique;

  const grouped = useMemo(() => {
    return MOTION_CATEGORIES.map((cat) => ({
      ...cat,
      items: MOTION_TECHNIQUES.filter((t) => t.category === cat.id),
    }));
  }, []);

  const set = <K extends keyof MotionConfigValue>(k: K, v: MotionConfigValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
            <Clapperboard className="size-3.5 text-primary" />
            Motion & camera
            <span className="text-muted-foreground font-normal">· {sectionLabel}</span>
          </div>
          {enabled && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_MOTION })}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>

        <Select value={value.techniqueId} onValueChange={(v) => set("techniqueId", v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="None / Disabled" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={NONE_ID}>None / Disabled</SelectItem>
            {grouped.map((g) => (
              <SelectGroup key={g.id}>
                <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </SelectLabel>
                {g.items.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {enabled && technique && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3 mt-0.5 shrink-0 text-primary/70 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{technique.description}</TooltipContent>
              </Tooltip>
              <p className="leading-snug">{technique.description}</p>
            </div>

            {technique.directions && technique.directions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/80">Direction</label>
                <div className="flex flex-wrap gap-1.5">
                  {technique.directions.map((d) => {
                    const active = value.direction === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => set("direction", d.id)}
                        className={
                          "px-2.5 py-1 rounded-full text-[11px] border transition " +
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
              <Field
                label="Intensity / Speed"
                valueLabel={`${value.intensity}`}
              >
                <Slider
                  value={[value.intensity]}
                  onValueChange={(v) => set("intensity", v[0] ?? 0)}
                  min={0}
                  max={100}
                  step={5}
                />
              </Field>
            )}

            {technique.hasDuration && (
              <Field label="Duration" valueLabel={`${value.duration}s`}>
                <Slider
                  value={[value.duration]}
                  onValueChange={(v) => set("duration", v[0] ?? 1)}
                  min={1}
                  max={15}
                  step={1}
                />
              </Field>
            )}

            {technique.hasEasing && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/80">Easing curve</label>
                <Select value={value.easing} onValueChange={(v) => set("easing", v)}>
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
        )}
      </div>
    </TooltipProvider>
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <label className="font-medium text-foreground/80">{label}</label>
        <span className="text-muted-foreground tabular-nums">{valueLabel}</span>
      </div>
      {children}
    </div>
  );
}
