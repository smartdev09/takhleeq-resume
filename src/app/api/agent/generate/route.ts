export const runtime = "edge";

import { RateLimiter, getClientIp } from "lib/server/rate-limit";

// 50 AI calls per day per IP
const aiLimiter = new RateLimiter({
  limit: 50,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server AI proxy not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIp(request);
  if (!aiLimiter.check(ip)) {
    return new Response(
      JSON.stringify({ error: "Daily AI limit reached. Try again tomorrow or add your own API key." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "86400",
        },
      }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, model, temperature, maxTokens, jsonMode } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const orBody: Record<string, unknown> = {
    model: model ?? DEFAULT_MODEL,
    messages,
    temperature: temperature ?? 0.3,
    max_tokens: maxTokens ?? 4096,
    stream: true,
  };

  if (jsonMode) {
    orBody.response_format = { type: "json_object" };
  }

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://open-resume.app",
      "X-Title": "Takhleeq AI",
    },
    body: JSON.stringify(orBody),
  });

  if (upstream.status === 429) {
    const retryAfter = upstream.headers.get("Retry-After") ?? "60";
    return new Response(
      JSON.stringify({ error: "Upstream rate limit reached." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter,
        },
      }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream the SSE response directly back to the client
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
