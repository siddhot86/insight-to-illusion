import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { imageDataUrl } = (await request.json()) as { imageDataUrl: string };
          if (!imageDataUrl) {
            return Response.json({ error: "Missing image" }, { status: 400 });
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
            const text = await upstream.text();
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
            return Response.json({ error: text || "AI request failed" }, { status: 500 });
          }

          const data = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const raw = data.choices?.[0]?.message?.content ?? "{}";
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : { error: "Invalid response" };
          }
          return Response.json(parsed);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
