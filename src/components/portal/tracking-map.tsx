"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TrackingDemo, TrackingPosition } from "@/lib/portal-types";
import { defaultMapStyleUrl } from "@/lib/runtime-config";

type TrackingMapProps = {
  demo: TrackingDemo | null;
  styleUrl?: string | null;
};

const fallbackRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function positionsToFeatureCollection(positions: TrackingPosition[]) {
  return {
    type: "FeatureCollection" as const,
    features: positions.map((position) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [position.lng, position.lat],
      },
      properties: {
        label: position.label,
        classCode: position.classCode,
        sailNumber: position.sailNumber ?? "",
        sog: position.sog ?? 0,
        heading: position.heading ?? 0,
      },
    })),
  };
}

function courseToFeatureCollection(demo: TrackingDemo | null) {
  const firstBoat =
    demo?.frames
      .flatMap((frame) => frame.positions)
      .filter((position) => position.classCode === "ORC_A") ?? [];

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: firstBoat.map((position) => [position.lng, position.lat]),
        },
        properties: {
          name: "Percurso demo",
        },
      },
    ],
  };
}

export function TrackingMap({ demo, styleUrl }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = demo?.frames ?? [];
  const currentFrame = frames[frameIndex] ?? frames[0] ?? null;
  const latestPositions = useMemo(
    () => positionsToFeatureCollection(currentFrame?.positions ?? []),
    [currentFrame],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl || defaultMapStyleUrl || fallbackRasterStyle,
      center: [-8.865, 40.145],
      zoom: 12.6,
      pitch: 36,
      bearing: -18,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      map.addSource("course", {
        type: "geojson",
        data: courseToFeatureCollection(demo),
      });

      map.addLayer({
        id: "course-line",
        type: "line",
        source: "course",
        paint: {
          "line-color": "#0891b2",
          "line-width": 4,
          "line-opacity": 0.72,
        },
      });

      map.addSource("boats", {
        type: "geojson",
        data: latestPositions,
      });

      map.addLayer({
        id: "boats",
        type: "circle",
        source: "boats",
        paint: {
          "circle-color": [
            "match",
            ["get", "classCode"],
            "ORC_A",
            "#0f766e",
            "ORC_B",
            "#f97316",
            "#0ea5e9",
          ],
          "circle-radius": 8,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [demo, latestPositions, styleUrl]);

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % frames.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [frames.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("boats") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(latestPositions);
    }
  }, [latestPositions]);

  if (!demo || frames.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-sky-950 px-6 text-center text-white">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-cyan-200">
            Tracking demo
          </p>
          <h3 className="mt-3 text-2xl font-semibold">Replay ainda não configurado</h3>
          <p className="mt-2 max-w-md text-sm text-sky-100">
            O admin pode publicar frames simulados para ativar esta experiência visual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[460px] overflow-hidden bg-sky-950">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-normal text-slate-950 shadow-lg">
          Simulação / demo visual
        </span>
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-lg">
          {demo.title}
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid gap-2 sm:grid-cols-3">
        {(currentFrame?.positions ?? []).slice(0, 3).map((position) => (
          <div
            key={`${position.label}-${position.sailNumber}`}
            className="rounded-lg bg-white/92 px-3 py-2 text-xs shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 font-semibold text-slate-950">
              <span>{position.label}</span>
              <span>{position.sailNumber}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-slate-600">
              <span>{position.classCode.replace("_", " ")}</span>
              <span>{position.sog?.toFixed(1) ?? "0.0"} nós</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
