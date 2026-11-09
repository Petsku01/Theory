import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-hashes' 'unsafe-inline';
    img-src 'self' data: blob:;
    connect-src 'self';
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicy = cspHeader.replace(/\s{2,}/g, " ").trim();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  // Nonce-parit HTML-vastaukset eivät saa käydä jaetun välimuistin kautta: edge-HIT
  // yhdistäisi tuoreen proxy-noncen CSP:n cached bodyn vanhaan nonceen
  // (hydration kuolee = täsmälleen se bugiluokka, joka 10.11 tuotannossa todettiin).
  // Matcherissa on jo asset-poissulut (wasm/ikonit/feed yms.) — tämä koskee vain
  // sisältö-polkuja; Sol+Grok linssit vaativat eksplisiittisen (Nextin oma
  // default no-store voi muuttua ympäristöversiossa).
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon\\.ico$|feed\\.xml$|robots\\.txt$|sitemap\\.xml$|icon\\.svg$|og\\.png$|manifest\\.json$|wasm/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
