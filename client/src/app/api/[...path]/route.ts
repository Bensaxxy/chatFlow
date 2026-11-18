import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

const responseHeadersToForward = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

const getBackendApiUrl = (): string | null => {
  const url =
    process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? null;

  if (!url) {
    return null;
  }

  try {
    return new URL(url).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

const getSetCookieHeaders = (headers: Headers): string[] => {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const header = headers.get("set-cookie");

  return header ? header.split(/,(?=\s*[^=;,\s]+=)/) : [];
};

const createUpstreamHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();

  for (const name of ["accept", "content-type", "cookie"]) {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return headers;
};

const proxyRequest = async (
  request: NextRequest,
  context: RouteContext,
): Promise<Response> => {
  const backendApiUrl = getBackendApiUrl();

  if (!backendApiUrl) {
    return Response.json(
      {
        success: false,
        message: "The chat API is not configured.",
        code: "API_PROXY_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const encodedPath = path.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(
    `${backendApiUrl}/${encodedPath}${request.nextUrl.search}`,
  );
  const shouldForwardBody = !["GET", "HEAD"].includes(request.method);
  const requestInit: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: createUpstreamHeaders(request),
    cache: "no-store",
  };

  if (shouldForwardBody && request.body) {
    requestInit.body = request.body;
    requestInit.duplex = "half";
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, requestInit);
    const headers = new Headers();

    for (const name of responseHeadersToForward) {
      const value = upstreamResponse.headers.get(name);

      if (value) {
        headers.set(name, value);
      }
    }

    for (const cookie of getSetCookieHeaders(upstreamResponse.headers)) {
      headers.append("set-cookie", cookie);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "The chat API could not be reached.",
        code: "API_PROXY_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
};

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
