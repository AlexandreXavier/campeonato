"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { defaultPortalData } from "@/lib/demo-data";
import type { MediaItem } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

type WallItem = {
  aspect: number;
  category: string;
  href: string;
  id: string;
  label: string;
  meta: string;
  src: string;
};

type Cell = {
  angle: number;
  baseX: number;
  baseY: number;
  height: number;
  index: number;
  mi: number;
  rotation: number;
  rowIndex: number;
  scale: number;
  width: number;
};

type Layout = {
  cells: Cell[];
  h: number;
  m: number;
  rows: number;
};

type MediaWallEngine = {
  destroy: () => void;
  navFocus: (direction: number) => void;
  unfocus: () => void;
};

const fallbackImage = defaultPortalData.settings.heroImageUrl;
const aspectFallbacks = [1.52, 1.33, 1.78, 0.82, 1.12, 1.62, 0.92, 1.42];

function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 13.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp01(a: number, b: number, value: number) {
  return Math.max(0, Math.min(1, (value - a) / (b - a)));
}

function mediaToWallItems(media: MediaItem[]): WallItem[] {
  return media
    .filter((item) => item.imageUrl)
    .map((item, index) => ({
      aspect: aspectFallbacks[index % aspectFallbacks.length],
      category: item.featured ? "Destaque" : "Facebook ORC",
      href: item.sourceUrl || item.imageUrl,
      id: item.id,
      label: item.title,
      meta: item.credit || "Fonte Facebook Campeonato de Portugal ORC",
      src: item.imageUrl,
    }));
}

function makeMediaEl(item: WallItem, fit: "cover" | "contain" = "cover") {
  const el = document.createElement("img");
  el.src = item.src;
  el.alt = item.label;
  el.draggable = false;
  el.decoding = "async";
  el.className = "mural-media";
  el.style.objectFit = fit;
  el.addEventListener(
    "error",
    () => {
      if (el.src !== fallbackImage) el.src = fallbackImage;
    },
    { once: true },
  );
  return el;
}

function initMediaWallEngine({
  items,
  onFocus,
  onPreviewChange,
  onUnfocus,
  previewEl,
  previewMediaEl,
  stageEl,
  wallEl,
}: {
  items: WallItem[];
  onFocus: (item: WallItem) => void;
  onPreviewChange: (item: WallItem) => void;
  onUnfocus: () => void;
  previewEl: HTMLDivElement;
  previewMediaEl: HTMLDivElement;
  stageEl: HTMLElement;
  wallEl: HTMLDivElement;
}): MediaWallEngine {
  let vp = measureViewport();
  let layout: Layout | null = null;
  let tiles: HTMLElement[] = [];
  let rowDrift: number[] = [];
  let raf: number | null = null;

  const pointer = { has: false, x: vp.vw / 2, y: vp.vh / 2 };
  const rawPointer = { x: vp.vw / 2, y: vp.vh / 2 };
  const prevPos = { x: vp.vw / 2, y: vp.vh / 2 };
  const cur = { x: 0, y: 0 };
  const pan = { x: vp.vw / 2, y: vp.vh / 2 };
  const panTarget = { x: vp.vw / 2, y: vp.vh / 2 };
  let downPos: { x: number; y: number } | null = null;
  let dragged = false;
  let featured = 0;
  let focused = false;
  let focusAmt = 0;
  let focusIndex = 0;
  let hovering = true;
  let introStart: number | null = null;
  let introT = 0;
  let panning = false;
  let panLast: { x: number; y: number } | null = null;
  let previewMediaNode: HTMLImageElement | null = null;
  let previewMi = -1;
  let previewScale = 0;
  let radius = 0;
  let radiusEnable = 0;
  let started = false;
  let zoom = 1;

  const previewCap = document.createElement("div");
  previewCap.className = "mural-preview-cap";
  const previewCatEl = document.createElement("span");
  previewCatEl.className = "mural-preview-cat";
  const previewLabelEl = document.createElement("span");
  previewLabelEl.className = "mural-preview-label";
  previewCap.appendChild(previewCatEl);
  previewCap.appendChild(previewLabelEl);
  previewMediaEl.textContent = "";
  previewMediaEl.appendChild(previewCap);

  const resizeObserver = new ResizeObserver(() => relayout());

  function measureViewport() {
    const rect = stageEl.getBoundingClientRect();
    const vw = Math.max(320, rect.width);
    const vh = Math.max(420, rect.height);
    return { mobile: vw < 768, vh, vw };
  }

  function pointFromEvent(event: PointerEvent) {
    const rect = stageEl.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function buildLayout() {
    const mobile = vp.mobile;
    const n = mobile ? 82 : 118;
    const gap = mobile ? 9 : 13;
    const over = mobile ? 2.4 : 2.9;
    const cell = n + gap;
    const wide = vp.vw * over;
    const rows = Math.max(1, Math.ceil((vp.vh * over) / cell));
    const totalH = rows * cell;
    const top = -totalH / 2 + n / 2 + gap / 2;
    const rowArrays: Array<Array<{ mi: number; rawX: number; width: number; col: number }>> = [];
    let previousRow: Array<{ mi: number; rawX: number; width: number }> | null = null;
    let maxW = 0;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const row: Array<{ col: number; mi: number; rawX: number; width: number }> = [];
      let rawX = 0;
      let col = 0;
      while (rawX < wide) {
        let mi = Math.floor(rand(17.3 * rowIndex + 31.7 * col + 5) * items.length);
        const previousInRow = row.length ? row[row.length - 1].mi : -1;
        let above = -1;
        if (previousRow) {
          for (const cellAbove of previousRow) {
            if (rawX >= cellAbove.rawX && rawX < cellAbove.rawX + cellAbove.width + gap) {
              above = cellAbove.mi;
              break;
            }
          }
        }
        let guard = 0;
        while ((mi === previousInRow || mi === above) && guard < items.length) {
          mi = (mi + 1) % items.length;
          guard++;
        }
        const width = n * items[mi].aspect;
        row.push({ col, mi, rawX, width });
        rawX += width + gap;
        col++;
      }
      rowArrays.push(row);
      previousRow = row;
      const rowWidth = row.length ? row[row.length - 1].rawX + row[row.length - 1].width : 0;
      if (rowWidth > maxW) maxW = rowWidth;
    }

    const widthModulo = maxW + gap;
    const cells: Cell[] = [];
    let index = 0;
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const row = rowArrays[rowIndex];
      if (!row.length) continue;
      const last = row[row.length - 1];
      const slack = widthModulo - (last.rawX + last.width) - gap;
      const justify = row.length > 1 ? slack / row.length : 0;
      let x = -widthModulo / 2 + gap / 2;
      for (const item of row) {
        cells.push({
          angle: rand(31 * rowIndex + 17 * item.col + 7) * Math.PI * 2,
          baseX: x + item.width / 2,
          baseY: rowIndex * cell + top,
          height: n,
          index,
          mi: item.mi,
          rotation: (rand(5 * rowIndex + 11 * item.col + 3) - 0.5) * 3.6,
          rowIndex,
          scale: 1 + (rand(7 * rowIndex + 13 * item.col + 5) - 0.5) * 0.05,
          width: item.width,
        });
        index++;
        x += item.width + gap + justify;
      }
    }

    layout = { cells, h: totalH, m: widthModulo, rows };
  }

  function renderTiles() {
    if (!layout) return;
    wallEl.textContent = "";
    tiles = [];
    for (const cell of layout.cells) {
      const tile = document.createElement("div");
      tile.className = "mural-tile";
      tile.style.width = `${cell.width}px`;
      tile.style.height = `${cell.height}px`;
      tile.appendChild(makeMediaEl(items[cell.mi]));
      wallEl.appendChild(tile);
      tiles[cell.index] = tile;
    }
    rowDrift = Array(layout.rows).fill(0);
  }

  function relayout() {
    vp = measureViewport();
    buildLayout();
    renderTiles();
    pan.x = panTarget.x = vp.vw / 2;
    pan.y = panTarget.y = vp.vh / 2;
    cur.x = 0;
    cur.y = 0;
    prevPos.x = rawPointer.x = pointer.x = vp.vw / 2;
    prevPos.y = rawPointer.y = pointer.y = vp.vh / 2;
    if (layout?.cells[featured]) updatePreview(layout.cells[featured].mi);
  }

  function updatePreview(mi: number) {
    const item = items[mi];
    if (!item || mi === previewMi) return;
    previewMi = mi;

    const el = makeMediaEl(item, "contain");
    const old = previewMediaNode;
    previewMediaNode = el;
    previewMediaEl.insertBefore(el, previewCap);

    const reveal = () => {
      if (el !== previewMediaNode) {
        el.remove();
        return;
      }
      el.style.opacity = "";
      previewMediaEl.style.aspectRatio = String(item.aspect);
      if (old && old !== el) old.remove();
    };
    if (el.complete && el.naturalWidth) {
      reveal();
    } else {
      el.style.opacity = "0";
      el.addEventListener("load", reveal, { once: true });
      el.addEventListener("error", reveal, { once: true });
    }

    previewCatEl.textContent = item.category;
    previewLabelEl.textContent = item.label;
    previewLabelEl.style.display = item.label ? "" : "none";
    onPreviewChange(item);
  }

  function focusPhoto(mediaIndex: number) {
    const item = items[mediaIndex];
    if (!item) return;
    focusIndex = mediaIndex;
    focused = true;
    previewMi = -1;
    updatePreview(mediaIndex);
    onFocus(item);
  }

  function unfocus() {
    if (!focused) return;
    focused = false;
    onUnfocus();
    if (layout?.cells[featured]) {
      previewMi = -1;
      updatePreview(layout.cells[featured].mi);
    }
  }

  function navFocus(direction: number) {
    focusIndex = (focusIndex + direction + items.length) % items.length;
    previewMi = -1;
    updatePreview(focusIndex);
    onPreviewChange(items[focusIndex]);
  }

  function frame(now: number) {
    if (introStart == null) introStart = now;
    const time = (now - introStart) / 1000;
    introT = Math.min(1, time / 1.7);
    radiusEnable = Math.min(1, Math.max(0, (time - 0.2) / 1.1));
    const targetPreview = !focused && started && hovering ? 1 : 0;
    previewScale += (targetPreview - previewScale) * 0.14;

    const layoutSnapshot = layout;
    if (!layoutSnapshot) {
      raf = requestAnimationFrame(frame);
      return;
    }

    if (!focused) {
      for (let index = 0; index < rowDrift.length; index++) {
        rowDrift[index] += (0.05 + 0.18 * rand(41.3 * index + 17.1)) * (index % 2 === 0 ? -1 : 1);
      }
    }

    pan.x += (panTarget.x - pan.x) * 0.07;
    pan.y += (panTarget.y - pan.y) * 0.07;
    const aimX = focused ? vp.vw / 2 : pointer.x;
    const aimY = focused ? vp.vh / 2 : pointer.y;
    if (pointer.has || focused) {
      const catchup = focused ? 0.06 : 0.25;
      cur.x += (aimX - pan.x - cur.x) * catchup;
      cur.y += (aimY - pan.y - cur.y) * catchup;
    }

    const radiusTarget =
      (focused ? (vp.mobile ? 280 : 420) : hovering ? (vp.mobile ? 200 : 280) : vp.mobile ? 130 : 200) *
      radiusEnable;
    radius += (radiusTarget - radius) * 0.07;

    const z = zoom;
    const l = radius;
    const c = 1.3 * l;
    const d = cur.x;
    const u = cur.y;
    const hx = pan.x;
    const hy = pan.y;
    const widthModulo = layoutSnapshot.m * z;
    const heightModulo = layoutSnapshot.h * z;
    const halfW = vp.vw / 2;
    const halfH = vp.vh / 2;
    const diagonal = Math.hypot(vp.vw, vp.vh) / 2;
    const intro = introT < 1;
    let bestD = Infinity;
    let bestIdx = featured;

    for (const cell of layoutSnapshot.cells) {
      const el = tiles[cell.index];
      if (!el) continue;
      const worldX = (cell.baseX + (rowDrift[cell.rowIndex] || 0)) * z;
      const worldY = cell.baseY * z;
      const yWrap = Math.round((halfH - (worldY + hy)) / heightModulo);
      const bx = worldX + Math.round((halfW - (worldX + hx)) / widthModulo) * widthModulo;
      const by = worldY + yWrap * heightModulo;
      const mdx = bx - d;
      const mdy = by - u;
      const distance = Math.hypot(mdx, mdy);
      if (distance < bestD) {
        bestD = distance;
        bestIdx = cell.index;
      }

      const cx = bx + hx;
      const cy = by + hy;
      const halfTileW = (cell.width * z) / 2;
      const halfTileH = (cell.height * z) / 2;
      if (cx + halfTileW < -260 || cx - halfTileW > vp.vw + 260 || cy + halfTileH < -260 || cy - halfTileH > vp.vh + 260) {
        el.style.opacity = "0";
        continue;
      }

      let px = bx;
      let py = by;
      let scale = cell.scale * z;
      let opacity = 1;
      if (distance < c) {
        const open = 1 - distance / c;
        const push = l * open * open;
        const dx = distance < 0.5 ? Math.cos(cell.angle) : mdx / distance;
        const dy = distance < 0.5 ? Math.sin(cell.angle) : mdy / distance;
        px = bx + dx * push;
        py = by + dy * push;
        if (distance > 0.55 * l && distance < 1.05 * l) {
          scale *=
            1 +
            0.06 *
              (clamp01(0.55 * l, 0.8 * l, distance) *
                (1 - clamp01(0.85 * l, 1.05 * l, distance)));
        }
      }

      let introX = 0;
      let introY = 0;
      if (intro) {
        const introDistance = Math.hypot(cell.baseX, cell.baseY);
        const t = Math.max(0, Math.min(1, 1.5 * (introT - (introDistance / diagonal) * 0.4)));
        opacity = t;
        scale *= 0.3 + 0.7 * t;
        if (introDistance > 1) {
          const k = (1 - t) * 420;
          introX = (cell.baseX / introDistance) * k;
          introY = (cell.baseY / introDistance) * k;
        }
      }

      el.style.transform = `translate3d(${(px + introX + hx - cell.width / 2).toFixed(2)}px, ${(
        py +
        introY +
        hy -
        cell.height / 2
      ).toFixed(2)}px, 0) rotate(${cell.rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity < 0.999 ? opacity.toFixed(3) : "1";
    }

    if (bestIdx !== featured && bestD < 0.9 * l && !focused) {
      featured = bestIdx;
      const cell = layoutSnapshot.cells[featured];
      if (cell) updatePreview(cell.mi);
    }

    prevPos.x += (rawPointer.x - prevPos.x) * 0.25;
    prevPos.y += (rawPointer.y - prevPos.y) * 0.25;
    focusAmt += ((focused ? 1 : 0) - focusAmt) * 0.12;
    const tx = prevPos.x + (vp.vw / 2 - prevPos.x) * focusAmt;
    const ty = prevPos.y + (vp.vh / 2 - prevPos.y) * focusAmt;
    const hoverScale = 0.7 + 0.3 * previewScale;
    const previewTransformScale = hoverScale + (1 - hoverScale) * focusAmt;
    const previewOpacity = Math.max(previewScale, focusAmt);
    previewEl.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) translate(-50%, -50%) scale(${previewTransformScale.toFixed(3)})`;
    previewEl.style.opacity = previewOpacity < 0.999 ? previewOpacity.toFixed(3) : "1";
    raf = requestAnimationFrame(frame);
  }

  const onPointerMove = (event: PointerEvent) => {
    const point = pointFromEvent(event);
    rawPointer.x = point.x;
    rawPointer.y = point.y;
    if (panning) return;
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.has = true;
    if (!started) started = true;
  };
  const onMoveDrag = (event: PointerEvent) => {
    if (!downPos) return;
    const point = pointFromEvent(event);
    if (Math.hypot(point.x - downPos.x, point.y - downPos.y) > 6) dragged = true;
  };
  const onPointerEnter = () => {
    hovering = true;
  };
  const onPointerLeave = () => {
    hovering = false;
  };
  const onBlur = () => {
    hovering = false;
  };
  const onStageDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    downPos = pointFromEvent(event);
    dragged = false;
  };
  const onStageClick = () => {
    if (focused || dragged) return;
    const cell = layout?.cells[featured];
    if (cell) focusPhoto(cell.mi);
  };
  const onMiddleDown = (event: PointerEvent) => {
    if (event.button !== 1 || focused) return;
    event.preventDefault();
    panning = true;
    panLast = { x: event.clientX, y: event.clientY };
    stageEl.classList.add("grabbing");
    try {
      stageEl.setPointerCapture(event.pointerId);
    } catch {}
  };
  const onPanMove = (event: PointerEvent) => {
    if (!panning || !panLast) return;
    panTarget.x += event.clientX - panLast.x;
    panTarget.y += event.clientY - panLast.y;
    panLast = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = () => {
    panning = false;
    panLast = null;
    downPos = null;
    stageEl.classList.remove("grabbing");
  };
  const onAuxClick = (event: MouseEvent) => {
    if (event.button === 1) event.preventDefault();
  };
  const onMouseDown = (event: MouseEvent) => {
    if (event.button === 1) event.preventDefault();
  };
  const onWheel = (event: WheelEvent) => {
    if (focused) return;
    event.preventDefault();
    zoom = Math.min(3, Math.max(0.45, zoom * (1 - event.deltaY * 0.0012)));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!focused) return;
    if (event.key === "Escape") unfocus();
    if (event.key === "ArrowLeft") navFocus(-1);
    if (event.key === "ArrowRight") navFocus(1);
  };

  relayout();
  resizeObserver.observe(stageEl);
  stageEl.addEventListener("pointerenter", onPointerEnter);
  stageEl.addEventListener("pointerleave", onPointerLeave);
  stageEl.addEventListener("pointermove", onPointerMove);
  stageEl.addEventListener("pointermove", onMoveDrag);
  stageEl.addEventListener("pointerdown", onStageDown);
  stageEl.addEventListener("pointerdown", onMiddleDown);
  stageEl.addEventListener("click", onStageClick);
  stageEl.addEventListener("auxclick", onAuxClick);
  stageEl.addEventListener("mousedown", onMouseDown);
  stageEl.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("blur", onBlur);
  window.addEventListener("pointermove", onPanMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      if (raf != null) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      stageEl.removeEventListener("pointerenter", onPointerEnter);
      stageEl.removeEventListener("pointerleave", onPointerLeave);
      stageEl.removeEventListener("pointermove", onPointerMove);
      stageEl.removeEventListener("pointermove", onMoveDrag);
      stageEl.removeEventListener("pointerdown", onStageDown);
      stageEl.removeEventListener("pointerdown", onMiddleDown);
      stageEl.removeEventListener("click", onStageClick);
      stageEl.removeEventListener("auxclick", onAuxClick);
      stageEl.removeEventListener("mousedown", onMouseDown);
      stageEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointermove", onPanMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      wallEl.textContent = "";
      previewMediaEl.textContent = "";
    },
    navFocus,
    unfocus,
  };
}

export function MediaWall({
  facebookUrl,
  immersive = false,
  media,
}: {
  facebookUrl?: string | null;
  immersive?: boolean;
  media: MediaItem[];
}) {
  const items = useMemo(() => mediaToWallItems(media), [media]);
  const [focused, setFocused] = useState(false);
  const [previewItem, setPreviewItem] = useState<WallItem | null>(null);
  const engineRef = useRef<MediaWallEngine | null>(null);
  const previewMediaRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !items.length ||
      !previewMediaRef.current ||
      !previewRef.current ||
      !stageRef.current ||
      !wallRef.current
    ) {
      return;
    }

    engineRef.current = initMediaWallEngine({
      items,
      onFocus: (item) => {
        setPreviewItem(item);
        setFocused(true);
      },
      onPreviewChange: setPreviewItem,
      onUnfocus: () => setFocused(false),
      previewEl: previewRef.current,
      previewMediaEl: previewMediaRef.current,
      stageEl: stageRef.current,
      wallEl: wallRef.current,
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [items]);

  const closePreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    engineRef.current?.unfocus();
  };
  const previousPreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    engineRef.current?.navFocus(-1);
  };
  const nextPreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    engineRef.current?.navFocus(1);
  };

  if (!items.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-lg border border-slate-200 p-8 text-center text-slate-600">
          Galeria ainda não publicada
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "orc-media-wall relative overflow-hidden bg-slate-950 text-white shadow-2xl",
        focused && "media-wall-focused",
        immersive
          ? "h-[calc(100svh-9rem)] min-h-[680px]"
          : "h-[70vh] min-h-[620px] max-h-[820px] rounded-lg",
      )}
    >
      <section
        ref={stageRef}
        aria-label="Mural de media do Campeonato de Portugal ORC 2026"
        className="mural-stage absolute inset-0 overflow-hidden"
      >
        <div ref={wallRef} className="absolute inset-0" />
        <div className="mural-wash" aria-hidden="true" />
        <button
          type="button"
          aria-label="Fechar fotografia"
          className={cn(
            "absolute inset-0 z-20 bg-slate-950/70 opacity-0 transition-opacity",
            focused ? "pointer-events-auto opacity-100" : "pointer-events-none",
          )}
          onClick={closePreview}
        />

        <div
          ref={previewRef}
          aria-hidden={focused ? "false" : "true"}
          className={cn(
            "absolute left-0 top-0 z-30 opacity-0 will-change-transform",
            focused ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "absolute bottom-full left-1/2 mb-4 flex -translate-x-1/2 items-center gap-3 transition-opacity",
              focused ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              type="button"
              aria-label="Fotografia anterior"
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
              onClick={previousPreview}
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="max-w-[70vw] text-center">
              <p className="text-[11px] font-bold uppercase tracking-normal text-cyan-200">
                {previewItem?.category}
              </p>
              <h3 className="truncate text-2xl font-black uppercase tracking-normal">
                {previewItem?.label}
              </h3>
            </div>
            <button
              type="button"
              aria-label="Fotografia seguinte"
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
              onClick={nextPreview}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div ref={previewMediaRef} className="mural-preview-media" />

          <div
            className={cn(
              "absolute left-1/2 top-full mt-4 flex -translate-x-1/2 items-center gap-3 transition-opacity",
              focused ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="max-w-[58vw] truncate text-xs text-sky-100">
              {previewItem?.meta}
            </span>
            {previewItem?.href ? (
              <a
                href={previewItem.href}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir fotografia"
                className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
                onClick={(event) => event.stopPropagation()}
              >
                <Maximize2 className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              aria-label="Fechar fotografia"
              className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
              onClick={closePreview}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-5 z-40 max-w-[min(28rem,calc(100%-2.5rem))] text-white sm:bottom-6 sm:left-6">
          <p className="text-xs font-bold uppercase tracking-normal text-cyan-200">
            Media
          </p>
          <h3 className="mt-1 text-3xl font-black uppercase leading-none tracking-normal sm:text-5xl">
            Mural de barcos
          </h3>
          <p className="mt-3 text-sm leading-6 text-sky-100">
            {items.length} imagens curadas · {previewItem?.label ?? "Campeonato de Portugal ORC"}
          </p>
        </div>

        <div className="absolute right-4 top-4 z-40 flex items-center gap-2 sm:right-6 sm:top-6">
          {facebookUrl ? (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir página Facebook"
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-slate-950/60 text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
            >
              <ExternalLink className="size-5" />
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
