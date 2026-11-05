/**
 * Cloudflare Worker entry for the Budget Dashboard (Vite + React SPA).
 *
 * Static assets are uploaded as Workers Static Assets and bound to `env.ASSETS`.
 * Every request is served from that binding; HTML navigations that do not map
 * to a real file fall back to index.html so client-side routing (React Router)
 * keeps working on deep links such as /dashboard.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Assets first: hashed JS/CSS, logo, manifest, index.html.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // SPA fallback only for browser navigations, never for missing assets.
    const isNavigation =
      request.method === "GET" &&
      (request.headers.get("accept") || "").includes("text/html");
    const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(url.pathname);

    if (isNavigation && !looksLikeFile) {
      // Force a follow: the asset handler may answer /index.html with a 307
      // redirect to "/". A relative redirect (Location: /) is resolved against
      // this request's URL, then followed to produce the real HTML document.
      const indexUrl = new URL("/", url.origin);
      const indexResponse = await env.ASSETS.fetch(
        new Request(indexUrl.toString(), {
          method: "GET",
          headers: request.headers,
          redirect: "follow",
        }),
      );
      if (indexResponse.ok) {
        return new Response(indexResponse.body, {
          status: 200,
          headers: indexResponse.headers,
        });
      }
    }

    return assetResponse;
  },
};
