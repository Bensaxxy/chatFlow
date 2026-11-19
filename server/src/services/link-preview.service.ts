import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type LinkPreviewStatus = "loading" | "ready" | "failed";

export interface StoredLinkPreview {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  status: LinkPreviewStatus;
}

const MAX_HTML_BYTES = 750_000;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_PREVIEW_TEXT_LENGTH = 300;

const forbiddenHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

const trimUrlPunctuation = (value: string): string =>
  value.replace(/[),.!?;:]+$/g, "");

const normalizeDomain = (hostname: string): string =>
  hostname.replace(/^www\./i, "").toLowerCase();

const cleanText = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const decoded = value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  return decoded ? decoded.slice(0, MAX_PREVIEW_TEXT_LENGTH) : null;
};

const isPublicIpv4 = (address: string): boolean => {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first, second] = octets;

  if (
    first === undefined ||
    second === undefined ||
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51) ||
    (first === 203 && second === 0)
  ) {
    return false;
  }

  return true;
};

const isPublicIpAddress = (address: string): boolean => {
  const version = isIP(address);

  if (version === 4) {
    return isPublicIpv4(address);
  }

  if (version !== 6) {
    return false;
  }

  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  ) {
    return false;
  }

  const ipv4MappedAddress = normalized.match(/^::ffff:(.+)$/);

  return ipv4MappedAddress ? isPublicIpv4(ipv4MappedAddress[1] ?? "") : true;
};

const parsePublicUrl = (value: string): URL | null => {
  try {
    const parsedUrl = new URL(value);
    const hostname = parsedUrl.hostname
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "")
      .toLowerCase();

    if (
      (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
      parsedUrl.username ||
      parsedUrl.password ||
      !hostname ||
      forbiddenHostnames.has(hostname) ||
      hostname.endsWith(".local") ||
      (isIP(hostname) !== 0 && !isPublicIpAddress(hostname))
    ) {
      return null;
    }

    parsedUrl.hash = "";

    return parsedUrl;
  } catch {
    return null;
  }
};

const verifyPublicHostname = async (url: URL): Promise<void> => {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");

  if (isIP(hostname) !== 0) {
    if (!isPublicIpAddress(hostname)) {
      throw new Error("Private addresses cannot be previewed");
    }

    return;
  }

  const addresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    addresses.length === 0 ||
    addresses.some((address) => !isPublicIpAddress(address.address))
  ) {
    throw new Error("The URL does not resolve to a public address");
  }
};

const readLimitedResponseText = async (response: Response): Promise<string> => {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      totalBytes += result.value.byteLength;

      if (totalBytes > MAX_HTML_BYTES) {
        throw new Error("Preview page is too large");
      }

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
};

const getTagAttributes = (tag: string): Map<string, string> => {
  const attributes = new Map<string, string>();
  const attributePattern =
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const match of tag.matchAll(attributePattern)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];

    if (name && value) {
      attributes.set(name, value);
    }
  }

  return attributes;
};

const getMetadata = (
  html: string,
  names: string[],
): string | null => {
  const wantedNames = new Set(names.map((name) => name.toLowerCase()));

  for (const metaTag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getTagAttributes(metaTag[0]);
    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");

    if (key && content && wantedNames.has(key.toLowerCase())) {
      return cleanText(content);
    }
  }

  return null;
};

const getTitle = (html: string): string | null => {
  const openGraphTitle = getMetadata(html, ["og:title", "twitter:title"]);

  if (openGraphTitle) {
    return openGraphTitle;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return cleanText(titleMatch?.[1]?.replace(/<[^>]+>/g, " ") ?? null);
};

const getSafeImageUrl = async (
  value: string | null,
  pageUrl: URL,
): Promise<string | null> => {
  if (!value) {
    return null;
  }

  let resolvedImageUrl: string;

  try {
    resolvedImageUrl = new URL(value, pageUrl).toString();
  } catch {
    return null;
  }

  const imageUrl = parsePublicUrl(resolvedImageUrl);

  if (!imageUrl) {
    return null;
  }

  try {
    await verifyPublicHostname(imageUrl);
    return imageUrl.toString();
  } catch {
    return null;
  }
};

const fetchPreviewPage = async (initialUrl: URL): Promise<{
  html: string;
  url: URL;
}> => {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await verifyPublicHostname(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "ChatFlow-LinkPreview/1.0",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      const redirectUrl = parsePublicUrl(
        new URL(response.headers.get("location") ?? "", currentUrl).toString(),
      );

      if (!redirectUrl) {
        throw new Error("Redirect target is not safe");
      }

      currentUrl = redirectUrl;
      continue;
    }

    if (!response.ok) {
      throw new Error("Preview page could not be loaded");
    }

    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = Number(response.headers.get("content-length"));

    if (
      !contentType.toLowerCase().includes("text/html") ||
      (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES)
    ) {
      throw new Error("Preview URL does not point to an HTML page");
    }

    return {
      html: await readLimitedResponseText(response),
      url: currentUrl,
    };
  }

  throw new Error("Preview URL redirected too many times");
};

export const getLinkPreviewPlaceholder = (
  content: string,
): StoredLinkPreview | null => {
  const match = content.match(/https?:\/\/[^\s<>"']+/i);
  const previewUrl = match ? parsePublicUrl(trimUrlPunctuation(match[0])) : null;

  if (!previewUrl) {
    return null;
  }

  return {
    url: previewUrl.toString(),
    domain: normalizeDomain(previewUrl.hostname),
    title: null,
    description: null,
    imageUrl: null,
    status: "loading",
  };
};

export const resolveLinkPreview = async (
  preview: StoredLinkPreview,
): Promise<StoredLinkPreview> => {
  try {
    const page = await fetchPreviewPage(new URL(preview.url));
    const description = getMetadata(page.html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    const imageValue = getMetadata(page.html, [
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]);

    return {
      url: page.url.toString(),
      domain: normalizeDomain(page.url.hostname),
      title: getTitle(page.html),
      description,
      imageUrl: await getSafeImageUrl(imageValue, page.url),
      status: "ready",
    };
  } catch {
    return {
      ...preview,
      title: null,
      description: null,
      imageUrl: null,
      status: "failed",
    };
  }
};
