import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitcoin Mentor",
    short_name: "BTC Mentor",
    description: "Leer traden met Marcus, jouw persoonlijke mentor",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0610",
    theme_color: "#e91e63",
    orientation: "portrait",
    categories: ["finance", "education"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Traden",
        url: "/trade",
        description: "Open de trading dashboard",
      },
      {
        name: "Leren",
        url: "/leren",
        description: "Open de leermodule",
      },
    ],
  };
}
