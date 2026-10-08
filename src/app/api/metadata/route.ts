import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { checkRateLimit } from "@/server/security/rate-limiter";
import { validateSafeExternalUrl } from "@/server/security/ssrf-guard";

export interface ParsedJobMetadata {
  company?: string;
  role?: string;
  location?: string;
  description?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseHtmlMetadata(html: string): ParsedJobMetadata {
  const getMeta = (names: string[]): string | undefined => {
    for (const name of names) {
      const regex1 = new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`,
        "i"
      );
      const match1 = html.match(regex1);
      if (match1?.[1]) return decodeHtmlEntities(match1[1]);

      const regex2 = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`,
        "i"
      );
      const match2 = html.match(regex2);
      if (match2?.[1]) return decodeHtmlEntities(match2[1]);
    }
    return undefined;
  };

  const ogTitle = getMeta(["og:title", "twitter:title"]);
  const ogSiteName = getMeta(["og:site_name", "publisher"]);
  const ogDesc = getMeta(["og:description", "description", "twitter:description"]);
  const ogLoc = getMeta(["og:locality", "job_location", "geo.placename"]);

  let title = "";
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]) {
    title = decodeHtmlEntities(titleMatch[1]);
  }

  const rawTitle = ogTitle || title;
  let company = ogSiteName;
  let role = rawTitle;
  const location = ogLoc;

  if (rawTitle) {
    const separators = [" at ", " - ", " | ", " – ", " — "];
    for (const sep of separators) {
      if (rawTitle.includes(sep)) {
        const parts = rawTitle.split(sep).map((p) => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          if (!company) {
            company = parts[1];
          }
          role = parts[0];
          break;
        }
      }
    }
  }

  return {
    company: company?.trim() || undefined,
    role: role?.trim() || undefined,
    location: location?.trim() || undefined,
    description: ogDesc ? ogDesc.slice(0, 1000).trim() : undefined,
  };
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`metadata:${user.id}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded. Please wait a minute before requesting metadata again." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const rawUrl = body?.url;

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ ok: false, error: "URL is required" }, { status: 400 });
  }

  const validation = await validateSafeExternalUrl(rawUrl);
  if (!validation.safe) {
    return NextResponse.json({ ok: false, error: validation.reason }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(validation.url.toString(), {
      signal: controller.signal,
      redirect: "error",
      headers: {
        "User-Agent": "JobTrack-MetadataBot/1.0 (+https://jobtrack.dev)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: `External server returned status code ${response.status}`,
      });
    }

    const maxBytes = 256 * 1024;
    let html = "";

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let bytesRead = 0;

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytesRead += value.length;
          html += decoder.decode(value, { stream: true });
        }
      }
      await reader.cancel().catch(() => {});
    } else {
      const text = await response.text();
      html = text.slice(0, maxBytes);
    }

    const data = parseHtmlMetadata(html);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({
      ok: false,
      error: isTimeout
        ? "Request timed out after 4000ms"
        : error instanceof Error
        ? error.message
        : "Failed to fetch metadata",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
