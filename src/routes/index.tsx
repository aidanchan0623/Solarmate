import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import "../solarmate/index.css";

const SolarMateApp = lazy(() => import("../solarmate/App.jsx"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolarMate — Smarter Energy, Smarter Connections" },
      {
        name: "description",
        content:
          "A community solar energy sharing platform connecting verified prosumers with low-voltage business consumers.",
      },
      { property: "og:title", content: "SolarMate" },
      {
        property: "og:description",
        content: "Smarter Energy, Smarter Connections — solar sharing platform.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f7fafb" }} />}>
      <SolarMateApp />
    </Suspense>
  );
}
