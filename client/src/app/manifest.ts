import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChatFlow",
    short_name: "ChatFlow",
    description: "A simple, real-time space for meaningful conversations.",
    start_url: "/chats",
    display: "standalone",
    background_color: "#e8eef6",
    theme_color: "#0891b2",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
