import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are an expert cinematographer and AI video prompt engineer. Analyze the provided scene image with extreme detail and produce structured output for AI video generation tools (Runway, Pika, Sora, Kling, Veo, etc.).

Return ONLY valid JSON matching this exact schema:
{
  "scene_analysis": {
    "subjects": [string],
    "objects": [string],
    "environment": string,
    "setting": "indoor" | "outdoor",
    "time_of_day": string,
    "weather": string,
    "lighting": string,
    "color_palette": [string],
    "mood": string,
    "composition": string,
    "camera_angle": string,
    "depth_of_field": string
  },
  "characters": [
    {
      "description": string,
      "face_shape": string,
      "eye_shape_and_color": string,
      "nose": string,
      "lips": string,
      "skin_tone": string,
      "hair": string,
      "distinguishing_marks": string,
      "expression": string,
      "emotion": string,
      "clothing": string,
      "accessories": string,
      "posture": string,
      "position_in_frame": string
    }
  ],
  "video_prompt": {
    "main_prompt": string,
    "camera_movement": string,
    "character_motion": string,
    "lighting_continuity": string,
    "duration_seconds": number,
    "frame_rate": number,
    "aspect_ratio": string
  },
  "character_consistency_guidelines": [string],
  "negative_prompt": string,
  "style_variations": {
    "cinematic": string,
    "documentary": string,
    "film_noir": string,
    "action": string,
    "romantic": string,
    "anime": string
  },
  "platform_optimized": {
    "runway": string,
    "pika": string,
    "sora": string,
    "kling": string
  }
}

Be exhaustively descriptive. Each platform-optimized prompt should be 2-4 sentences tailored to that tool's syntax. The main_prompt must be cinematic natural language, 3-5 sentences, and MUST embed character consistency notes directly within it (e.g., "keep her oval face, hazel eyes, and chest-length auburn hair identical in every frame"). Character consistency guidelines should be specific, actionable instructions. Never include any text outside the JSON.`;

// ~12 MB decoded cap on the image payload
const MAX_DECODED_BYTES = 12 * 1024 * 1024;
const DATA_URI_RE = /^data:image\/(png|jpe?g|webp|gif|bmp|heic|heif);base64,([A-Za-z0-9+/=]+)$/;

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ---- AuthN: require a valid Supabase user ----
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : "";
          if (!token) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabasePub = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !supabasePub) {
            console.error("[analyze] Supabase env missing");
            return Response.json({ error: "Server misconfigured" }, { status: 500 });
          }
          const sb = createClient(supabaseUrl, supabasePub, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
          if (claimsErr || !claimsData?.claims?.sub) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          // ---- Input validation ----
          const body = (await request.json().catch(() => null)) as
            | { imageDataUrl?: unknown }
            | null;
          const imageDataUrl = body?.imageDataUrl;
          if (typeof imageDataUrl !== "string" || imageDataUrl.length === 0) {
            return Response.json({ error: "Missing image" }, { status: 400 });
          }
          const match = imageDataUrl.match(DATA_URI_RE);
          if (!match) {
            return Response.json(
              { error: "Image must be a base64 data URI (data:image/...;base64,...)" },
              { status: 400 },
            );
          }
          const b64 = match[2];
          // base64 decoded length = floor(len * 3 / 4) - padding
          const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
          const decodedBytes = Math.floor((b64.length * 3) / 4) - padding;
          if (decodedBytes > MAX_DECODED_BYTES) {
            return Response.json(
              { error: "Image too large. Maximum 12 MB." },
              { status: 413 },
            );
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyze this scene image and produce the structured video prompt JSON.",
                    },
                    { type: "image_url", image_url: { url: imageDataUrl } },
                  ],
                },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            // Log full upstream detail server-side only
            console.error(
              `[analyze] AI gateway error status=${upstream.status} body=${text.slice(0, 2000)}`,
            );
            if (upstream.status === 429) {
              return Response.json(
                { error: "Rate limit exceeded. Please try again shortly." },
                { status: 429 },
              );
            }
            if (upstream.status === 402) {
              return Response.json(
                { error: "AI credits exhausted. Please add credits in workspace settings." },
                { status: 402 },
              );
            }
            if (upstream.status === 401 || upstream.status === 403) {
              return Response.json(
                { error: "Analysis service authorization failed. Please try again later." },
                { status: 502 },
              );
            }
            if (upstream.status === 503 || upstream.status === 504) {
              return Response.json(
                { error: "Analysis service is temporarily unavailable. Please try again." },
                { status: 503 },
              );
            }
            return Response.json(
              { error: "Analysis failed. Please try again." },
              { status: 500 },
            );
          }

          const data = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const raw = data.choices?.[0]?.message?.content ?? "{}";
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            const m = raw.match(/\{[\s\S]*\}/);
            parsed = m ? JSON.parse(m[0]) : { error: "Invalid response" };
          }
          return Response.json(parsed);
        } catch (err) {
          console.error("[analyze] unhandled error", err);
          return Response.json(
            { error: "Analysis failed. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
