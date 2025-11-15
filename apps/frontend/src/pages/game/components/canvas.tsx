import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { CanvasStrokeSegment, CanvasPoint } from "@scribble/shared";

export type CanvasHandle = {
  clear: () => void;
  applyRemoteSegments: (segments: CanvasStrokeSegment[]) => void;
};

type CanvasProps = {
  className?: string;
  statusMessage?: string;
  canDraw?: boolean;
  onLocalSegments?: (segments: CanvasStrokeSegment[]) => void;
  onRequestClear?: () => void;
  clearDisabled?: boolean;
};

const colorOptions = [
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#f97316",
  "#fde047",
  "#64748b",
  "#ffffff",
];
const sizeOptions = [2, 4, 6, 8, 12];

const createStrokeId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

type HoverToolProps = {
  label?: string;
  indicator: ReactNode;
  children: ReactNode;
};

function HoverTool({ label, indicator, children }: HoverToolProps) {
  return (
    <div className="pointer-events-auto">
      <HoverCard openDelay={80} closeDelay={120}>
        <HoverCardTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex items-center gap-2 border-primary/25 bg-background/80 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              {indicator}
              {label || ""}
            </span>
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          side="bottom"
          sideOffset={12}
          className="w-auto min-w-[220px] border-primary/25 p-3"
        >
          {children}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      className,
      statusMessage = "Ready to draw",
      canDraw = true,
      onLocalSegments,
      onRequestClear,
      clearDisabled = false,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const currentStrokeIdRef = useRef<string | null>(null);
    const pendingSegmentsRef = useRef<CanvasStrokeSegment[]>([]);
    const batchTimeoutRef = useRef<number | null>(null);
    const [brushColor, setBrushColor] = useState<string>(colorOptions[0]);
    const [brushSize, setBrushSize] = useState<number>(6);

    useEffect(() => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      contextRef.current = ctx;
      const resizeCanvas = () => {
        if (!wrapper || !canvas) return;
        const { width, height } = wrapper.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.resetTransform?.();
        ctx.scale(ratio, ratio);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }, []);

    useEffect(() => {
      if (!contextRef.current) return;
      contextRef.current.strokeStyle = brushColor;
    }, [brushColor]);

    useEffect(() => {
      if (!contextRef.current) return;
      contextRef.current.lineWidth = brushSize;
    }, [brushSize]);

    const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const getCanvasDimensions = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return { width: 1, height: 1 };
      }
      const rect = canvas.getBoundingClientRect();
      return {
        width: rect.width || 1,
        height: rect.height || 1,
      };
    };

    const normalizePoint = ({ x, y }: { x: number; y: number }): CanvasPoint => {
      const { width, height } = getCanvasDimensions();
      return {
        x: width ? x / width : 0,
        y: height ? y / height : 0,
      };
    };

    const denormalizePoint = ({ x, y }: CanvasPoint) => {
      const { width, height } = getCanvasDimensions();
      return {
        x: x * width,
        y: y * height,
      };
    };

    const flushPendingSegments = useCallback(() => {
      if (batchTimeoutRef.current !== null) {
        window.clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      if (pendingSegmentsRef.current.length === 0 || !onLocalSegments) {
        pendingSegmentsRef.current = [];
        return;
      }
      const batch = pendingSegmentsRef.current;
      pendingSegmentsRef.current = [];
      onLocalSegments(batch);
    }, [onLocalSegments]);

    useEffect(() => {
      return () => {
        flushPendingSegments();
      };
    }, [flushPendingSegments]);

    const queueSegment = useCallback(
      (segment: CanvasStrokeSegment) => {
        if (!onLocalSegments) {
          return;
        }
        pendingSegmentsRef.current.push(segment);
        if (batchTimeoutRef.current !== null) {
          return;
        }
        batchTimeoutRef.current = window.setTimeout(() => {
          batchTimeoutRef.current = null;
          flushPendingSegments();
        }, 50);
      },
      [flushPendingSegments, onLocalSegments]
    );

    const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !canDraw) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      lastPointRef.current = getPoint(event);
      currentStrokeIdRef.current = createStrokeId();
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !contextRef.current || !canDraw) return;
      const currentPoint = getPoint(event);
      const lastPoint = lastPointRef.current;
      if (!lastPoint) {
        lastPointRef.current = currentPoint;
        return;
      }
      const ctx = contextRef.current;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      ctx.closePath();
      if (currentStrokeIdRef.current) {
        queueSegment({
          strokeId: currentStrokeIdRef.current,
          color: brushColor,
          size: brushSize,
          points: [lastPoint, currentPoint].map((point) =>
            normalizePoint(point)
          ),
        });
      }
      lastPointRef.current = currentPoint;
    };

    const endDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {}
      }
      if (isDrawingRef.current) {
        flushPendingSegments();
      }
      isDrawingRef.current = false;
      lastPointRef.current = null;
      currentStrokeIdRef.current = null;
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawSegments = useCallback((segments: CanvasStrokeSegment[]) => {
      const ctx = contextRef.current;
      if (!ctx || segments.length === 0) {
        return;
      }
      const previousStrokeStyle = ctx.strokeStyle;
      const previousLineWidth = ctx.lineWidth;

      for (const segment of segments) {
        if (!Array.isArray(segment.points) || segment.points.length < 2) {
          continue;
        }
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = segment.size;
        const [first, ...rest] = segment.points;
        const firstPoint = denormalizePoint(first);
        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        rest.forEach((point) => {
          const actualPoint = denormalizePoint(point);
          ctx.lineTo(actualPoint.x, actualPoint.y);
        });
        ctx.stroke();
        ctx.closePath();
      }

      ctx.strokeStyle = previousStrokeStyle;
      ctx.lineWidth = previousLineWidth;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        clear: clearCanvas,
        applyRemoteSegments: drawSegments,
      }),
      [drawSegments]
    );

    const handleClearClick = () => {
      if (clearDisabled) {
        return;
      }
      clearCanvas();
      onRequestClear?.();
    };

    return (
      <div
        ref={wrapperRef}
        className={cn(
          "relative flex h-full min-h-[560px] w-full overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-background/70",
          className
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full w-full bg-gradient-to-br from-background via-background/80 to-background/60",
            canDraw ? "cursor-crosshair" : "cursor-not-allowed"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
        />

        <div className="pointer-events-none absolute left-4 top-4 flex gap-3">
          <HoverTool
            indicator={
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-background/70">
                <span
                  className="block rounded-full"
                  style={{
                    backgroundColor: brushColor,
                    width: 16,
                    height: 16,
                  }}
                />
              </span>
            }
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Choose a color
              </p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select ${color} brush`}
                    onClick={() => setBrushColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full border border-white/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      brushColor === color
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </HoverTool>

          <HoverTool
            indicator={
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-background/70">
                <span
                  className="block rounded-full bg-primary"
                  style={{
                    background: brushColor,
                    width: Math.max(brushSize + 4, 10),
                    height: Math.max(brushSize + 4, 10),
                  }}
                />
              </span>
            }
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Brush size
              </p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-background/70 text-sm font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      brushSize === size &&
                        "border-primary bg-primary/10 text-foreground"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </HoverTool>

          <div className="pointer-events-auto rounded-xl border border-primary/25 bg-background/80 shadow-md">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleClearClick}
              className="w-full p-2"
              disabled={clearDisabled}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent px-6 py-4 text-center text-sm text-muted-foreground">
          {statusMessage}
        </div>
      </div>
    );
  }
);

Canvas.displayName = "Canvas";
