import { NextRequest, NextResponse } from "next/server";
import type { YouTubeVideoItem } from "@/app/api/youtube/route";

export interface SearchResultItem {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  icon?: string;
  isYouTube?: boolean;
  videoId?: string;
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) {
      return null;
    }
    const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0].split("?")[0];
      if (id.length === 11) return id;
    }
    const v = parsed.searchParams.get("v");
    if (v && v.length === 11) return v;
  } catch {
    // ignore
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Check if query is YouTube-related
  const isYouTubeRelated =
    /youtube|video|tutorial|lecture|music|song|lofi|podcast|course|trailer/i.test(
      query
    );

  try {
    // Concurrently fetch web results and YouTube videos (if relevant)
    const [webRes, ytRes] = await Promise.allSettled([
      fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 3600 },
      }),
      isYouTubeRelated
        ? fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
            },
            next: { revalidate: 1800 },
          })
        : Promise.resolve(null),
    ]);

    const results: SearchResultItem[] = [];
    const videos: YouTubeVideoItem[] = [];

    // Parse DuckDuckGo Web Results
    if (webRes.status === "fulfilled" && webRes.value && webRes.value.ok) {
      const html = await webRes.value.text();
      const resultBlocks = html.split(/class="[^"]*web-result[^"]*"/);

      function decodeEntities(str: string) {
        return str
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
          .trim();
      }

      for (let i = 1; i < resultBlocks.length; i++) {
        const block = resultBlocks[i];
        const titleMatch = block.match(
          /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
        );
        if (!titleMatch) continue;

        const rawHref = titleMatch[1];
        let actualUrl = rawHref;
        const uddgMatch = rawHref.match(/[?&]uddg=([^&]+)/);
        if (uddgMatch) {
          try {
            actualUrl = decodeURIComponent(uddgMatch[1]);
          } catch {
            actualUrl = rawHref;
          }
        }

        if (!actualUrl.startsWith("http://") && !actualUrl.startsWith("https://")) {
          continue;
        }

        const title = decodeEntities(titleMatch[2].replace(/<[^>]+>/g, ""));
        const snippetMatch = block.match(
          /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/
        );
        const snippet = snippetMatch
          ? decodeEntities(snippetMatch[1].replace(/<[^>]+>/g, ""))
          : "";

        const displayUrlMatch = block.match(
          /<a[^>]+class="[^"]*result__url[^"]*"[^>]*>([\s\S]*?)<\/a>/
        );
        let displayUrl = displayUrlMatch
          ? decodeEntities(displayUrlMatch[1].replace(/<[^>]+>/g, ""))
          : "";
        if (!displayUrl) {
          try {
            const parsed = new URL(actualUrl);
            displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
          } catch {
            displayUrl = actualUrl;
          }
        }

        const iconMatch = block.match(
          /<img[^>]+class="[^"]*result__icon__img[^"]*"[^>]+src="([^"]+)"/
        );
        let icon = "";
        if (iconMatch) {
          icon = iconMatch[1].startsWith("//") ? `https:${iconMatch[1]}` : iconMatch[1];
        } else {
          try {
            const host = new URL(actualUrl).hostname;
            icon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
          } catch {
            icon = "";
          }
        }

        const isYouTube =
          actualUrl.includes("youtube.com") || actualUrl.includes("youtu.be");
        const videoId = isYouTube ? extractYouTubeVideoId(actualUrl) || undefined : undefined;

        results.push({
          title,
          url: actualUrl,
          displayUrl,
          snippet,
          icon,
          isYouTube,
          videoId,
        });

        if (results.length >= 15) break;
      }
    }

    // Parse YouTube Results (if available)
    if (ytRes.status === "fulfilled" && ytRes.value && ytRes.value.ok) {
      try {
        const ytHtml = await ytRes.value.text();
        const match =
          ytHtml.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
          ytHtml.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
        if (match) {
          const ytData = JSON.parse(match[1]);
          const section =
            ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents
              ?.sectionListRenderer?.contents?.[0];
          const itemSection = section?.itemSectionRenderer?.contents || [];

          for (const item of itemSection) {
            const vr = item.videoRenderer;
            if (!vr || !vr.videoId) continue;
            videos.push({
              videoId: vr.videoId,
              title: vr.title?.runs?.[0]?.text || "YouTube Video",
              channel: vr.ownerText?.runs?.[0]?.text || "YouTube",
              views: vr.viewCountText?.simpleText || "",
              duration: vr.lengthText?.simpleText || "",
              thumbnail:
                vr.thumbnail?.thumbnails?.[0]?.url ||
                `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
            });
            if (videos.length >= 8) break;
          }
        }
      } catch (err) {
        console.error("Error parsing YouTube data:", err);
      }
    }

    // Fallback results if web search is empty
    if (results.length === 0) {
      results.push({
        title: `Search "${query}" on Google`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        displayUrl: "google.com",
        snippet: `Explore comprehensive search results for "${query}" on Google Search.`,
        icon: "https://www.google.com/s2/favicons?domain=google.com&sz=32",
      });
      results.push({
        title: `Search "${query}" on YouTube`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        displayUrl: "youtube.com/results",
        snippet: `Find trending videos, tutorials, and channels for "${query}".`,
        icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
        isYouTube: true,
      });
      results.push({
        title: `Wikipedia: "${query}"`,
        url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`,
        displayUrl: "en.wikipedia.org",
        snippet: `Free encyclopedia articles and references for "${query}".`,
        icon: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=32",
      });
    }

    return NextResponse.json({
      query,
      results,
      videos,
      count: results.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({
      query,
      results: [
        {
          title: `Search "${query}" on Google`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          displayUrl: "google.com",
          snippet: `Browse web results for "${query}" on Google.`,
          icon: "https://www.google.com/s2/favicons?domain=google.com&sz=32",
        },
        {
          title: `Search "${query}" on YouTube`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          displayUrl: "youtube.com",
          snippet: `Find videos and channels for "${query}" on YouTube.`,
          icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
          isYouTube: true,
        },
      ],
      videos: [],
      count: 2,
    });
  }
}
