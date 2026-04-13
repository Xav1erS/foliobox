"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Color math ──────────────────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (
    "#" +
    [f(5), f(3), f(1)]
      .map((x) => Math.round(x * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return { h: 0, s: 0, v: 1 };
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = (((g - b) / diff) % 6) * 60;
    else if (max === g) h = ((b - r) / diff + 2) * 60;
    else h = ((r - g) / diff + 4) * 60;
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : diff / max, v: max };
}

function isValidHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GradientStop = { offset: number; color: string };

export type GradientConfig = {
  angle: number; // degrees 0-360
  stops: GradientStop[];
};

export type ColorValue =
  | { mode: "solid"; hex: string }
  | { mode: "gradient"; gradient: GradientConfig };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpectrumPicker({
  hue,
  s,
  v,
  onChange,
}: {
  hue: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const track = useCallback(
    (e: React.PointerEvent) => {
      const rect = ref.current!.getBoundingClientRect();
      const ns = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const nv = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      onChange(ns, nv);
    },
    [onChange],
  );

  return (
    <div
      ref={ref}
      className="relative h-[148px] w-full cursor-crosshair rounded-xl"
      style={{
        background: `linear-gradient(to bottom, transparent 0%, #000 100%),
                     linear-gradient(to right, #fff 0%, hsl(${hue},100%,50%) 100%)`,
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        track(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) track(e);
      }}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
        style={{
          left: `${s * 100}%`,
          top: `${(1 - v) * 100}%`,
          background: hsvToHex(hue, s, v),
        }}
      />
    </div>
  );
}

function HueSlider({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const track = useCallback(
    (e: React.PointerEvent) => {
      const rect = ref.current!.getBoundingClientRect();
      onChange(Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360)));
    },
    [onChange],
  );

  return (
    <div
      ref={ref}
      className="relative h-4 w-full cursor-pointer rounded-full"
      style={{
        background:
          "linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))",
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        track(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) track(e);
      }}
    >
      <div
        className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
        style={{
          left: `${(hue / 360) * 100}%`,
          background: `hsl(${hue},100%,50%)`,
        }}
      />
    </div>
  );
}

function GradientStopBar({
  gradient,
  activeIndex,
  onSelectStop,
  onMoveStop,
  onAddStop,
}: {
  gradient: GradientConfig;
  activeIndex: number;
  onSelectStop: (i: number) => void;
  onMoveStop: (i: number, offset: number) => void;
  onAddStop: (offset: number, color: string) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const sorted = [...gradient.stops].sort((a, b) => a.offset - b.offset);
  const gradientCss = sorted.map((s) => `${s.color} ${s.offset * 100}%`).join(", ");

  return (
    <div className="relative h-8 w-full">
      <div
        ref={barRef}
        className="absolute inset-0 cursor-pointer rounded-lg"
        style={{ background: `linear-gradient(to right, ${gradientCss})` }}
        onClick={(e) => {
          if (e.target !== barRef.current) return;
          const rect = barRef.current!.getBoundingClientRect();
          const offset = (e.clientX - rect.left) / rect.width;
          // interpolate color at that offset
          const color = gradient.stops[activeIndex]?.color ?? "#888888";
          onAddStop(Math.max(0, Math.min(1, offset)), color);
        }}
      />
      {gradient.stops.map((stop, i) => (
        <div
          key={i}
          className={cn(
            "absolute top-1/2 h-6 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-[4px] border-2 shadow-md",
            i === activeIndex ? "border-blue-400 ring-1 ring-blue-400" : "border-white",
          )}
          style={{ left: `${stop.offset * 100}%`, background: stop.color }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelectStop(i);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            const rect = barRef.current!.getBoundingClientRect();
            const offset = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onMoveStop(i, offset);
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ColorPickerPopoverProps {
  value: ColorValue;
  onChange: (value: ColorValue) => void;
  className?: string;
  disabled?: boolean;
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
}

const DEFAULT_GRADIENT: GradientConfig = {
  angle: 90,
  stops: [
    { offset: 0, color: "#1a1a2e" },
    { offset: 1, color: "#e94560" },
  ],
};

export function ColorPickerPopover({
  value,
  onChange,
  className,
  disabled,
  side = "left",
  align = "start",
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  // Internal state ─ synced from `value` on open
  const [mode, setMode] = useState<"solid" | "gradient">(value.mode);
  const [hsv, setHsv] = useState(() =>
    hexToHsv(value.mode === "solid" ? value.hex : (value.gradient.stops[0]?.color ?? "#000000")),
  );
  const [hexInput, setHexInput] = useState(
    value.mode === "solid" ? value.hex : (value.gradient.stops[0]?.color ?? "#000000"),
  );
  const [gradient, setGradient] = useState<GradientConfig>(
    value.mode === "gradient" ? value.gradient : DEFAULT_GRADIENT,
  );
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  // Sync internal state when popover opens
  useEffect(() => {
    if (!open) return;
    setMode(value.mode);
    if (value.mode === "solid") {
      const h = hexToHsv(value.hex);
      setHsv(h);
      setHexInput(value.hex);
    } else {
      setGradient(value.gradient);
      const stopColor = value.gradient.stops[0]?.color ?? "#000000";
      setHsv(hexToHsv(stopColor));
      setHexInput(stopColor);
      setActiveStopIndex(0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The hex color currently being edited
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // When HSV changes
  function handleHsvChange(newHsv: { h: number; s: number; v: number }) {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(hex);
    if (mode === "solid") {
      onChange({ mode: "solid", hex });
    } else {
      const next = {
        ...gradient,
        stops: gradient.stops.map((s, i) =>
          i === activeStopIndex ? { ...s, color: hex } : s,
        ),
      };
      setGradient(next);
      onChange({ mode: "gradient", gradient: next });
    }
  }

  function handleHexInputChange(raw: string) {
    const hex = raw.startsWith("#") ? raw : "#" + raw;
    setHexInput(hex);
    if (!isValidHex(hex)) return;
    const newHsv = hexToHsv(hex);
    setHsv(newHsv);
    if (mode === "solid") {
      onChange({ mode: "solid", hex });
    } else {
      const next = {
        ...gradient,
        stops: gradient.stops.map((s, i) =>
          i === activeStopIndex ? { ...s, color: hex } : s,
        ),
      };
      setGradient(next);
      onChange({ mode: "gradient", gradient: next });
    }
  }

  function switchMode(next: "solid" | "gradient") {
    setMode(next);
    if (next === "solid") {
      onChange({ mode: "solid", hex: currentHex });
    } else {
      onChange({ mode: "gradient", gradient });
    }
  }

  function handleSelectStop(i: number) {
    setActiveStopIndex(i);
    const stopColor = gradient.stops[i]?.color ?? "#000000";
    setHsv(hexToHsv(stopColor));
    setHexInput(stopColor);
  }

  function handleMoveStop(i: number, offset: number) {
    const next = {
      ...gradient,
      stops: gradient.stops.map((s, idx) => (idx === i ? { ...s, offset } : s)),
    };
    setGradient(next);
    onChange({ mode: "gradient", gradient: next });
  }

  function handleAddStop(offset: number, color: string) {
    const next = { ...gradient, stops: [...gradient.stops, { offset, color }] };
    setGradient(next);
    setActiveStopIndex(next.stops.length - 1);
    setHsv(hexToHsv(color));
    setHexInput(color);
    onChange({ mode: "gradient", gradient: next });
  }

  function handleRemoveStop(i: number) {
    if (gradient.stops.length <= 2) return;
    const next = { ...gradient, stops: gradient.stops.filter((_, idx) => idx !== i) };
    const nextActive = Math.min(activeStopIndex, next.stops.length - 1);
    setGradient(next);
    setActiveStopIndex(nextActive);
    const stopColor = next.stops[nextActive]?.color ?? "#000000";
    setHsv(hexToHsv(stopColor));
    setHexInput(stopColor);
    onChange({ mode: "gradient", gradient: next });
  }

  function handleAngleChange(angle: number) {
    const next = { ...gradient, angle };
    setGradient(next);
    onChange({ mode: "gradient", gradient: next });
  }

  // Trigger swatch preview
  const swatchStyle =
    value.mode === "gradient"
      ? {
          background: `linear-gradient(${value.gradient.angle}deg, ${value.gradient.stops
            .sort((a, b) => a.offset - b.offset)
            .map((s) => `${s.color} ${s.offset * 100}%`)
            .join(", ")})`,
        }
      : { background: value.hex };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl border-2 border-white/[0.12] shadow-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40",
            className,
          )}
          style={swatchStyle}
        />
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[256px] border-white/[0.08] bg-[#1e1b18] p-0 text-white shadow-[0_24px_56px_-16px_rgba(0,0,0,0.9)]"
      >
        {/* Mode tabs */}
        <div className="flex border-b border-white/[0.07]">
          {(["solid", "gradient"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 py-2.5 text-[13px] transition-colors",
                mode === m
                  ? "text-white"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              {m === "solid" ? "纯色" : "渐变"}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-[2px] bg-white transition-all"
            style={{
              left: mode === "solid" ? "0%" : "50%",
              width: "50%",
            }}
          />
        </div>

        <div className="space-y-3 p-3">
          {/* Gradient bar (gradient mode) */}
          {mode === "gradient" ? (
            <div className="space-y-2">
              <GradientStopBar
                gradient={gradient}
                activeIndex={activeStopIndex}
                onSelectStop={handleSelectStop}
                onMoveStop={handleMoveStop}
                onAddStop={handleAddStop}
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-white/40">角度</label>
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={gradient.angle}
                  onChange={(e) => handleAngleChange(Number(e.target.value) % 360)}
                  className="h-7 w-16 rounded-lg border border-white/[0.08] bg-[#171411] px-2 text-center text-sm text-white [appearance:textfield]"
                />
                <span className="text-[11px] text-white/40">°</span>
                {gradient.stops.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveStop(activeStopIndex)}
                    className="ml-auto text-[11px] text-white/30 hover:text-white/60"
                  >
                    删除节点
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Spectrum */}
          <SpectrumPicker
            hue={hsv.h}
            s={hsv.s}
            v={hsv.v}
            onChange={(s, v) => handleHsvChange({ h: hsv.h, s, v })}
          />

          {/* Hue slider */}
          <HueSlider hue={hsv.h} onChange={(h) => handleHsvChange({ ...hsv, h })} />

          {/* Hex + preview row */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 shrink-0 rounded-lg border border-white/[0.12]"
              style={{ background: currentHex }}
            />
            <input
              type="text"
              value={hexInput.toUpperCase()}
              onChange={(e) => handleHexInputChange(e.target.value)}
              maxLength={7}
              className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#171411] px-2 text-center font-mono text-sm text-white"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Helpers for Fabric integration ──────────────────────────────────────────

/** Convert GradientConfig to Fabric.js Gradient constructor options */
export function gradientConfigToFabricOptions(config: GradientConfig) {
  const angle = (config.angle * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    type: "linear" as const,
    gradientUnits: "percentage" as const,
    coords: {
      x1: 0.5 - cos * 0.5,
      y1: 0.5 - sin * 0.5,
      x2: 0.5 + cos * 0.5,
      y2: 0.5 + sin * 0.5,
    },
    colorStops: config.stops.map((s) => ({ offset: s.offset, color: s.color })),
  };
}

/** Try to read a GradientConfig from a Fabric fill value (may be string or Gradient object) */
export function fabricFillToColorValue(fill: unknown): ColorValue {
  if (typeof fill === "string") {
    return { mode: "solid", hex: isValidHex(fill) ? fill : "#111111" };
  }
  if (fill && typeof fill === "object") {
    const f = fill as Record<string, unknown>;
    if (
      f.type === "linear" &&
      Array.isArray(f.colorStops) &&
      f.coords &&
      typeof f.coords === "object"
    ) {
      const coords = f.coords as { x1: number; y1: number; x2: number; y2: number };
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      const stops: GradientStop[] = (f.colorStops as Array<{ offset: number; color: string }>).map(
        (s) => ({ offset: s.offset, color: s.color }),
      );
      return { mode: "gradient", gradient: { angle: angleDeg, stops } };
    }
  }
  return { mode: "solid", hex: "#111111" };
}
