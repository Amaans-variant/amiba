import { NextRequest, NextResponse } from "next/server";

function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.startsWith("169.254.")
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const extractText = searchParams.get("extractText") === "true";

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("Only HTTP and HTTPS URLs are allowed", { status: 400 });
  }

  if (isPrivateUrl(targetUrl)) {
    return new NextResponse("Access to local/private addresses is forbidden", { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const finalUrl = response.url || targetUrl;
    const contentType = response.headers.get("content-type") || "text/html";

    // If requested plain text extraction for AI flashcards/quizzes
    if (extractText) {
      const html = await response.text();
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return NextResponse.json({ url: finalUrl, text: text.slice(0, 30000) });
    }

    // For non-HTML responses (e.g. JSON API loaders, images, scripts, fonts)
    // Forward the content directly with CORS headers instead of redirecting
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    let html = await response.text();

    // Remove restrictive CSP meta tags and X-Frame meta tags
    html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");
    html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, "");

    const targetOrigin = new URL(finalUrl).origin;

    // Injected script handles:
    // 1. Rewriting root-relative fetch/XHR to the target origin
    // 2. Intercepting Auth & Login buttons (ChatGPT, OAuth, Google) to open cleanly in a new tab
    //    so Remix/React Router never throws `Error: No result found for routeId "routes/$"`
    // 3. Proxying relative link clicks
    const helperScript = `
      <script>
        (function() {
          var targetOrigin = '${targetOrigin}';
          var targetBaseUrl = '${finalUrl}';

          // 0. Provide route fallback on Object.prototype to prevent React Router / Remix routeId crashes
          try {
            ['routes/$', 'routes/($lang)._index', 'routes/_conversation', 'routes/auth.login', 'routes/login'].forEach(function(routeId) {
              try {
                Object.defineProperty(Object.prototype, routeId, {
                  value: { data: {} },
                  writable: true,
                  configurable: true
                });
              } catch (err) {}
            });
          } catch (e) {}

          // 1. Synchronize window.location.pathname to target URL so SPA routers match the real route
          try {
            var targetPath = '${new URL(finalUrl).pathname}' || '/';
            var targetSearch = '${new URL(finalUrl).search}' || '';
            var targetHash = '${new URL(finalUrl).hash}' || '';
            var fullTargetPath = (targetPath || '/') + targetSearch + targetHash;
            if (window.location.pathname !== targetPath) {
              window.history.replaceState(window.history.state, '', fullTargetPath);
            }
          } catch (e) {}

          // 2. Rewrite relative fetch & XHR through /api/proxy to prevent CORS blocks
          try {
            var origFetch = window.fetch;
            window.fetch = function(input, init) {
              try {
                if (typeof input === 'string') {
                  if (input.startsWith('/') && !input.startsWith('//')) {
                    input = '/api/proxy?url=' + encodeURIComponent(targetOrigin + input);
                  }
                } else if (input && typeof input.url === 'string' && input.url.startsWith('/')) {
                  input = new Request('/api/proxy?url=' + encodeURIComponent(targetOrigin + input.url), input);
                }
              } catch (e) {}
              return origFetch.call(this, input, init);
            };

            var origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              try {
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
                  url = '/api/proxy?url=' + encodeURIComponent(targetOrigin + url);
                }
              } catch (e) {}
              return origOpen.apply(this, arguments);
            };
          } catch (e) {}

          // 2. Intercept Auth & Login buttons in CAPTURE phase
          document.addEventListener('click', function(e) {
            var el = e.target.closest('button, a, [role="button"]');
            if (!el) return;

            var text = (el.textContent || '').trim().toLowerCase();
            var href = (el.getAttribute('href') || el.href || '').toLowerCase();
            var testId = (el.getAttribute('data-testid') || '').toLowerCase();
            var ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

            var isAuth =
              text === 'log in' ||
              text === 'login' ||
              text === 'sign in' ||
              text === 'signin' ||
              text === 'sign up' ||
              text === 'signup' ||
              testId.includes('login') ||
              testId.includes('signup') ||
              ariaLabel.includes('log in') ||
              ariaLabel.includes('sign in') ||
              href.includes('/auth/login') ||
              href.includes('auth.openai.com') ||
              href.includes('accounts.google.com') ||
              href.includes('appleid.apple.com') ||
              href.includes('github.com/login');

            if (isAuth) {
              // OpenAI Auth / OAuth flows MUST run outside the iframe
              // This stops React Router / Remix from trying to load routes/$
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              var destination = 'https://chatgpt.com/auth/login';
              if (href && href.startsWith('http')) {
                destination = href;
              } else if (href && href.startsWith('/')) {
                destination = targetOrigin + href;
              }
              window.open(destination, '_blank');
              return;
            }

            // Normal link navigation inside proxy
            var a = e.target.closest('a');
            if (a && a.href && a.href.startsWith('http')) {
              if (e.ctrlKey || e.metaKey || a.target === '_blank') return;
              e.preventDefault();
              window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
            }
          }, true);

          // 3. Catch and suppress Remix route errors
          window.addEventListener('error', function(e) {
            if (e && e.message && (e.message.includes('routeId') || e.message.includes('routes/$'))) {
              e.preventDefault();
              e.stopPropagation();
            }
          }, true);
          window.addEventListener('unhandledrejection', function(e) {
            if (e && e.reason && String(e.reason).includes('routeId')) {
              e.preventDefault();
              e.stopPropagation();
            }
          });

          // 4. Clean up any Remix error boundary banner if it appeared
          try {
            var observer = new MutationObserver(function() {
              var errorPres = document.querySelectorAll('pre');
              for (var i = 0; i < errorPres.length; i++) {
                var pre = errorPres[i];
                if (pre.textContent && (pre.textContent.includes('routeId') || pre.textContent.includes('routes/$'))) {
                  var container = pre.closest('div[style*="font-family"]') || pre.parentElement || pre;
                  if (container) container.style.display = 'none';
                }
              }
            });
            if (document.documentElement) {
              observer.observe(document.documentElement, { childList: true, subtree: true });
            }
          } catch (e) {}
        })();
      </script>
    `;

    // Inject base href and helper script as early as possible into <head>
    const baseTag = `<base href="${finalUrl}">`;
    const injection = `${baseTag}${helperScript}`;

    if (/<head\b[^>]*>/i.test(html)) {
      html = html.replace(/<head\b[^>]*>/i, `$&${injection}`);
    } else {
      html = `${injection}${html}`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "ALLOWALL",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : err instanceof Error
        ? err.message
        : "Failed to load website";

    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0e14; color: #f3f5f8; padding: 2.5rem 1.5rem; text-align: center; }
            .card { max-width: 440px; margin: 0 auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 1rem; padding: 1.5rem; }
            h2 { font-size: 1.1rem; margin-top: 0; color: #fff; }
            p { font-size: 0.85rem; color: rgba(255,255,255,0.6); line-height: 1.5; }
            .btn { display: inline-block; margin-top: 1rem; padding: 0.5rem 1.25rem; background: #e8a855; color: #171009; text-decoration: none; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600; }
            .btn:hover { filter: brightness(1.1); }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Unable to load preview</h2>
            <p>${errorMsg}</p>
            <p>This site may require logging in directly in your browser.</p>
            <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">Open Site in New Tab</a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(fallbackHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
