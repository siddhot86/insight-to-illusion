/**
 * Motion & camera technique registry.
 * Scalable: add a new entry here and it appears in every MotionConfig dropdown.
 */

export type DirectionOption = { id: string; label: string };

export type MotionTechnique = {
  id: string;
  label: string;
  category: "camera" | "subject" | "complex";
  /** Short filmmaking note shown in tooltip + helper text. */
  description: string;
  /** Show intensity / speed slider (0-100). */
  hasIntensity?: boolean;
  /** Show duration slider (seconds). */
  hasDuration?: boolean;
  /** Show easing curve picker. */
  hasEasing?: boolean;
  /** Direction toggles (omit if not applicable). */
  directions?: DirectionOption[];
};

export const NONE_ID = "none";

export const MOTION_CATEGORIES: Array<{
  id: MotionTechnique["category"];
  label: string;
}> = [
  { id: "camera", label: "Camera Movements" },
  { id: "subject", label: "Subject / Object Motion" },
  { id: "complex", label: "Combined & Complex" },
];

export const EASING_PRESETS = [
  { id: "linear", label: "Linear" },
  { id: "ease-in", label: "Ease In" },
  { id: "ease-out", label: "Ease Out" },
  { id: "ease-in-out", label: "Ease In-Out" },
  { id: "cubic-bezier(0.22, 1, 0.36, 1)", label: "Custom Bezier (cinematic)" },
] as const;

const dir: Record<string, DirectionOption[]> = {
  lr: [
    { id: "left", label: "Left" },
    { id: "right", label: "Right" },
  ],
  ud: [
    { id: "up", label: "Up" },
    { id: "down", label: "Down" },
  ],
  io: [
    { id: "in", label: "In" },
    { id: "out", label: "Out" },
  ],
  axis6: [
    { id: "forward", label: "Forward" },
    { id: "backward", label: "Backward" },
    { id: "left", label: "Left" },
    { id: "right", label: "Right" },
    { id: "up", label: "Up" },
    { id: "down", label: "Down" },
  ],
  orbit: [
    { id: "cw", label: "Clockwise" },
    { id: "ccw", label: "Counter-clockwise" },
  ],
};

export const MOTION_TECHNIQUES: MotionTechnique[] = [
  { id: "static", label: "Static / Fixed", category: "camera", description: "Locked-off camera. Calm, observational; lets the subject carry the scene." },
  { id: "pan", label: "Pan", category: "camera", description: "Horizontal rotation from a fixed pivot. Reveals environment or follows movement.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.lr },
  { id: "tilt", label: "Tilt", category: "camera", description: "Vertical rotation. Builds scale, reveals height, or signals power dynamics.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.ud },
  { id: "dolly", label: "Dolly / Track", category: "camera", description: "Camera physically moves on a track. Push-in heightens intimacy, pull-out reveals context.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: [...dir.io, ...dir.lr] },
  { id: "truck", label: "Truck / Crab", category: "camera", description: "Lateral sideways movement parallel to the subject. Common in walk-and-talks.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.lr },
  { id: "pedestal", label: "Pedestal", category: "camera", description: "Camera body raises or lowers vertically. Useful for matching subject eyeline.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.ud },
  { id: "crane", label: "Crane / Jib", category: "camera", description: "Sweeping arc through space. Grandiose reveals, scene establishments, emotional lifts.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.ud },
  { id: "steadicam", label: "Steadicam / Gimbal", category: "camera", description: "Smooth floating follow. Immersive without losing polish — feels like the viewer walks with the subject.", hasIntensity: true, hasDuration: true, hasEasing: true },
  { id: "handheld", label: "Handheld", category: "camera", description: "Intentional shake and micro-movement. Urgency, realism, documentary energy.", hasIntensity: true, hasDuration: true },
  { id: "drone", label: "Drone / Aerial", category: "camera", description: "Overhead sweeping or orbital flight. Scale, geography, epic openers and closers.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.orbit },
  { id: "zoom", label: "Zoom", category: "camera", description: "Optical focal-length change with no camera movement. Voyeuristic, isolating.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.io },
  { id: "rack_focus", label: "Rack Focus", category: "camera", description: "Shifts focus between foreground and background subjects. Redirects attention narratively.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: [{ id: "foreground_to_background", label: "FG → BG" }, { id: "background_to_foreground", label: "BG → FG" }] },
  { id: "whip_pan", label: "Whip Pan", category: "camera", description: "Fast blurred pan used as a transition or for kinetic energy.", hasIntensity: true, directions: dir.lr },
  { id: "dolly_zoom", label: "Dolly Zoom (Vertigo)", category: "camera", description: "Simultaneous dolly + opposing zoom. Disorientation, dread, revelation.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: [{ id: "push_in_zoom_out", label: "Push-in + Zoom-out" }, { id: "pull_out_zoom_in", label: "Pull-out + Zoom-in" }] },
  { id: "slow_motion", label: "Slow Motion", category: "subject", description: "Time stretched. Emphasizes emotion, beauty, or violence.", hasIntensity: true },
  { id: "timelapse", label: "Time-lapse", category: "subject", description: "Time compressed. Conveys passage of time, crowds, weather, change.", hasIntensity: true, hasDuration: true },
  { id: "stop_motion", label: "Stop Motion", category: "subject", description: "Frame-by-frame staccato motion. Crafted, tactile, surreal.", hasIntensity: true },
  { id: "motion_graphics", label: "Motion Graphics Integration", category: "subject", description: "Animated typography, overlays, or UI elements layered into the shot.", hasIntensity: true, hasDuration: true, hasEasing: true },
  { id: "environment_fx", label: "Environmental / Particle FX", category: "subject", description: "Rain, snow, dust, fog, embers. Adds atmosphere and depth to the air.", hasIntensity: true, directions: [{ id: "rain", label: "Rain" }, { id: "snow", label: "Snow" }, { id: "dust", label: "Dust" }, { id: "fog", label: "Fog / mist" }, { id: "embers", label: "Embers / sparks" }] },
  { id: "parallax", label: "Parallax Multi-plane", category: "complex", description: "Foreground, midground, background drift at different rates. Painterly depth.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.lr },
  { id: "match_cut", label: "Match Cut Movement", category: "complex", description: "Movement coordinated to land on the next shot's composition. Seamless transitions.", hasIntensity: true, hasDuration: true, hasEasing: true },
  { id: "orbital", label: "Orbital / Circular", category: "complex", description: "Camera circles the subject. Showcases, romance, escalating tension.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.orbit },
  { id: "push_with_focus", label: "Push-in / Pull-out + Focus Shift", category: "complex", description: "Translation paired with a focus pull. Layered emotional reveal.", hasIntensity: true, hasDuration: true, hasEasing: true, directions: dir.io },
];

export type MotionEntry = {
  techniqueId: string;
  intensity: number;
  direction?: string;
  duration: number;
  easing: string;
};

/** A configured selection is now an array of entries — users can stack
 *  techniques from different categories (e.g. Dolly + Slow Motion + Parallax). */
export type MotionConfigValue = MotionEntry[];

export const DEFAULT_MOTION: MotionConfigValue = [];

export function defaultEntryFor(techniqueId: string): MotionEntry {
  const t = getTechnique(techniqueId);
  return {
    techniqueId,
    intensity: 50,
    duration: 4,
    easing: "ease-in-out",
    direction: t?.directions?.[0]?.id,
  };
}

export function getTechnique(id: string): MotionTechnique | undefined {
  return MOTION_TECHNIQUES.find((t) => t.id === id);
}

function describeEntry(e: MotionEntry): string | null {
  const t = getTechnique(e.techniqueId);
  if (!t) return null;
  const parts: string[] = [`${t.label}`];
  if (t.directions && e.direction) {
    const d = t.directions.find((x) => x.id === e.direction);
    if (d) parts.push(`direction: ${d.label}`);
  }
  if (t.hasIntensity) parts.push(`intensity: ${e.intensity}/100`);
  if (t.hasDuration) parts.push(`duration: ~${e.duration}s`);
  if (t.hasEasing) parts.push(`easing: ${e.easing}`);
  return `${parts.join(", ")} — ${t.description}`;
}

/** Compact human-readable summary used in API payload + system prompt.
 *  Accepts either the new array form or a single legacy entry. */
export function describeMotion(m: MotionConfigValue | MotionEntry | null | undefined): string | null {
  if (!m) return null;
  const arr: MotionEntry[] = Array.isArray(m) ? m : [m];
  const lines = arr
    .filter((e) => e && e.techniqueId && e.techniqueId !== NONE_ID)
    .map((e, i) => {
      const d = describeEntry(e);
      return d ? `${i + 1}. ${d}` : null;
    })
    .filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return lines.join("\n");
}
