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
  const firstPosition = demo?.frames[0]?.positions[0] ?? null;
  const firstBoatKey = firstPosition?.entryId ?? firstPosition?.label ?? null;
  const firstBoat =
    demo?.frames
      .map((frame) =>
        frame.positions.find(
          (position) => (position.entryId ?? position.label) === firstBoatKey,
        ) ?? frame.positions[0],
      )
      .filter(Boolean) ?? [];

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positionToCanvas(position: { lng: number; lat: number }) {
  const bounds = {
    minLng: -8.912,
    maxLng: -8.82,
    minLat: 40.108,
    maxLat: 40.166,
  };
  return {
    x: clamp(((position.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100, 4, 96),
    y: clamp(((bounds.maxLat - position.lat) / (bounds.maxLat - bounds.minLat)) * 100, 6, 94),
  };
}

export function TrackingMap({ demo, styleUrl }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);
  const frames = demo?.frames ?? [];
  const currentFrame = frames[frameIndex] ?? frames[0] ?? null;
  const latestPositions = useMemo(
    () => positionsToFeatureCollection(currentFrame?.positions ?? []),
    [currentFrame],
  );
  const courseCoordinates = useMemo(
    () =>
      courseToFeatureCollection(demo).features[0].geometry.coordinates.map(
        ([lng, lat]) => positionToCanvas({ lng, lat }),
      ),
    [demo],
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

    map.on("error", () => setMapFailed(true));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      setMapFailed(false);
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

      map.addLayer({
        id: "boat-labels",
        type: "symbol",
        source: "boats",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 1.25],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#0f172a",
          "text-halo-width": 2,
        },
      });

      window.setTimeout(() => map.resize(), 100);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("course") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(courseToFeatureCollection(demo));
    }
  }, [demo]);

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
    <div className="relative min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_28%_20%,rgba(34,211,238,.24),transparent_34%),linear-gradient(135deg,#082f49,#0f172a)]">
      <div ref={containerRef} className="absolute inset-0" />
      {mapFailed ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,47,73,.88),rgba(15,23,42,.9)),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:auto,64px_64px,64px_64px]" />
      ) : null}
      <svg
        className="pointer-events-none absolute inset-0 z-[5] size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {courseCoordinates.length > 1 ? (
          <>
            <polyline
              points={courseCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="rgba(14, 165, 233, .32)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={courseCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#22d3ee"
              strokeWidth=".7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 1.6"
            />
          </>
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 z-[6]">
        {(currentFrame?.positions ?? []).map((position) => {
          const point = positionToCanvas(position);
          return (
            <div
              key={`marker-${position.label}-${position.sailNumber}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <div className="relative grid size-8 place-items-center rounded-full border-2 border-white bg-orange-500 text-[10px] font-black text-white shadow-[0_0_24px_rgba(34,211,238,.7)]">
                <span>{position.sailNumber?.replace(/^[A-Z-]+\s?/, "") || "ORC"}</span>
                <span className="absolute left-1/2 top-8 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white shadow-lg sm:block">
                  {position.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-normal text-slate-950 shadow-lg">
          Simulação / demo visual
        </span>
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-lg">
          {demo.title}
        </span>
        <span className="rounded-full bg-sky-950/85 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          T+{Math.round(currentFrame?.second ?? 0)}s · {currentFrame?.positions.length ?? 0} barcos
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid max-h-56 gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:bottom-auto lg:left-auto lg:right-4 lg:top-16 lg:max-h-[calc(100%-5rem)] lg:w-[320px] lg:grid-cols-1">
        {(currentFrame?.positions ?? []).map((position) => (
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
