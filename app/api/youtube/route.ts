import { NextRequest, NextResponse } from "next/server";

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channel: string;
  views: string;
  duration: string;
  thumbnail: string;
}

const FALLBACK_VIDEOS: YouTubeVideoItem[] = [
  {
    videoId: "jfKfPfyJRdk",
    title: "lofi hip hop radio 📚 - beats to relax/study to",
    channel: "Lofi Girl",
    views: "Live Stream",
    duration: "LIVE",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
  },
  {
    videoId: "5qap5aO4i9A",
    title: "lofi hip hop radio 💤 - beats to sleep/chill to",
    channel: "Lofi Girl",
    views: "Live Stream",
    duration: "LIVE",
    thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
  },
  {
    videoId: "aircAruvnKk",
    title: "But what is a neural network? | Chapter 1, Deep Learning",
    channel: "3Blue1Brown",
    views: "16M views",
    duration: "19:13",
    thumbnail: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg",
  },
  {
    videoId: "8jLOx1hD3_o",
    title: "C Programming Tutorial for Beginners",
    channel: "freeCodeCamp.org",
    views: "7.1M views",
    duration: "3:46:15",
    thumbnail: "https://i.ytimg.com/vi/8jLOx1hD3_o/hqdefault.jpg",
  },
  {
    videoId: "8_mHZXePj74",
    title: "Pomodoro Technique: How to Study 10x More Effectively",
    channel: "Ali Abdaal",
    views: "2.4M views",
    duration: "11:42",
    thumbnail: "https://i.ytimg.com/vi/8_mHZXePj74/hqdefault.jpg",
  },
  {
    videoId: "7S_tz1z_5bA",
    title: "Classical Mechanics | 8.01 SC Physics",
    channel: "MIT OpenCourseWare",
    views: "4.8M views",
    duration: "49:22",
    thumbnail: "https://i.ytimg.com/vi/7S_tz1z_5bA/hqdefault.jpg",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q")?.trim() || "";
  const query = rawQuery || "lofi study beats";

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(ytUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`YouTube responded with status ${response.status}`);
    }

    const html = await response.text();
    const match =
      html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
      html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);

    if (!match) {
      throw new Error("Could not find ytInitialData in response");
    }

    const data = JSON.parse(match[1]);
    const section =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0];
    const itemSection = section?.itemSectionRenderer?.contents || [];

    const videos: YouTubeVideoItem[] = [];

    for (const item of itemSection) {
      const vr = item.videoRenderer;
      if (!vr || !vr.videoId) continue;

      const videoId = vr.videoId;
      const title = vr.title?.runs?.[0]?.text || "YouTube Video";
      const channel = vr.ownerText?.runs?.[0]?.text || "YouTube Creator";
      const views = vr.viewCountText?.simpleText || "";
      const duration = vr.lengthText?.simpleText || (vr.badges ? "LIVE" : "");

      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      if (vr.thumbnail?.thumbnails?.length) {
        const thumbs = vr.thumbnail.thumbnails;
        thumbnail = thumbs[thumbs.length - 1]?.url || thumbnail;
      }

      videos.push({
        videoId,
        title,
        channel,
        views,
        duration,
        thumbnail,
      });

      if (videos.length >= 12) break;
    }

    if (videos.length === 0) {
      return NextResponse.json({
        query,
        videos: FALLBACK_VIDEOS,
      });
    }

    return NextResponse.json({
      query,
      videos,
    });
  } catch (error) {
    console.error("YouTube search error:", error);
    return NextResponse.json({
      query,
      videos: FALLBACK_VIDEOS,
    });
  }
}
