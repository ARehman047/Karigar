import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCrop: (croppedDataUrl: string) => void;
}

const DISPLAY_MAX = 400;
const HANDLE = 10;
const MIN_CROP = 50;

type DragType = "move" | "tl" | "tr" | "bl" | "br" | null;
interface Rect { x: number; y: number; w: number; h: number; }

export function ImageCropDialog({ open, imageSrc, onClose, onCrop }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 100, h: 100 });

  const dragRef = useRef<{ type: DragType; startX: number; startY: number; initCrop: Rect } | null>(null);

  // Load image when dialog opens
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.min(DISPLAY_MAX / img.naturalWidth, DISPLAY_MAX / img.naturalHeight, 1);
      const dw = Math.round(img.naturalWidth * scale);
      const dh = Math.round(img.naturalHeight * scale);
      setImgScale(scale);
      setDisplayW(dw);
      setDisplayH(dh);
      // Default: centered square at 80% of shorter side
      const size = Math.round(Math.min(dw, dh) * 0.8);
      setCrop({
        x: Math.round((dw - size) / 2),
        y: Math.round((dh - size) / 2),
        w: size,
        h: size,
      });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Redraw canvas on every crop change
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || displayW === 0) return;
    canvas.width = displayW;
    canvas.height = displayH;
    const ctx = canvas.getContext("2d")!;

    // Full image
    ctx.drawImage(img, 0, 0, displayW, displayH);

    // Semi-transparent overlay outside crop (4 rects)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, displayW, crop.y);                                           // top
    ctx.fillRect(0, crop.y + crop.h, displayW, displayH - crop.y - crop.h);        // bottom
    ctx.fillRect(0, crop.y, crop.x, crop.h);                                        // left
    ctx.fillRect(crop.x + crop.w, crop.y, displayW - crop.x - crop.w, crop.h);    // right

    // Crop border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(crop.x + 0.5, crop.y + 0.5, crop.w, crop.h);

    // Rule-of-thirds grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(crop.x + (crop.w / 3) * i, crop.y);
      ctx.lineTo(crop.x + (crop.w / 3) * i, crop.y + crop.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(crop.x, crop.y + (crop.h / 3) * i);
      ctx.lineTo(crop.x + crop.w, crop.y + (crop.h / 3) * i);
      ctx.stroke();
    }

    // Corner handles
    ctx.fillStyle = "#ffffff";
    [
      [crop.x, crop.y],
      [crop.x + crop.w - HANDLE, crop.y],
      [crop.x, crop.y + crop.h - HANDLE],
      [crop.x + crop.w - HANDLE, crop.y + crop.h - HANDLE],
    ].forEach(([hx, hy]) => ctx.fillRect(hx, hy, HANDLE, HANDLE));
  }, [crop, displayW, displayH]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const scaleX = displayW / r.width;
    const scaleY = displayH / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  };

  const hitTest = (x: number, y: number): DragType => {
    if (x >= crop.x && x <= crop.x + HANDLE && y >= crop.y && y <= crop.y + HANDLE) return "tl";
    if (x >= crop.x + crop.w - HANDLE && x <= crop.x + crop.w && y >= crop.y && y <= crop.y + HANDLE) return "tr";
    if (x >= crop.x && x <= crop.x + HANDLE && y >= crop.y + crop.h - HANDLE && y <= crop.y + crop.h) return "bl";
    if (x >= crop.x + crop.w - HANDLE && x <= crop.x + crop.w && y >= crop.y + crop.h - HANDLE && y <= crop.y + crop.h) return "br";
    if (x > crop.x && x < crop.x + crop.w && y > crop.y && y < crop.y + crop.h) return "move";
    return null;
  };

  const cursorForType = (t: DragType) =>
    t === "move" ? "move" : t === "tl" || t === "br" ? "nwse-resize" : t === "tr" || t === "bl" ? "nesw-resize" : "crosshair";

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const type = hitTest(pos.x, pos.y);
    if (!type) return;
    dragRef.current = { type, startX: pos.x, startY: pos.y, initCrop: { ...crop } };
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const pos = getPos(e);
    if (!dragRef.current) {
      if (canvas) canvas.style.cursor = cursorForType(hitTest(pos.x, pos.y));
      return;
    }
    const { type, startX, startY, initCrop: ic } = dragRef.current;
    const dx = pos.x - startX;
    const dy = pos.y - startY;

    setCrop(() => {
      let { x, y, w, h } = ic;
      if (type === "move") {
        x = Math.max(0, Math.min(displayW - w, ic.x + dx));
        y = Math.max(0, Math.min(displayH - h, ic.y + dy));
      } else if (type === "br") {
        w = Math.max(MIN_CROP, Math.min(displayW - ic.x, ic.w + dx));
        h = Math.max(MIN_CROP, Math.min(displayH - ic.y, ic.h + dy));
      } else if (type === "tr") {
        w = Math.max(MIN_CROP, Math.min(displayW - ic.x, ic.w + dx));
        const newH = Math.max(MIN_CROP, ic.h - dy);
        y = Math.max(0, ic.y + ic.h - newH);
        h = newH;
      } else if (type === "bl") {
        const newW = Math.max(MIN_CROP, ic.w - dx);
        x = Math.max(0, ic.x + ic.w - newW);
        w = newW;
        h = Math.max(MIN_CROP, Math.min(displayH - ic.y, ic.h + dy));
      } else if (type === "tl") {
        const newW = Math.max(MIN_CROP, ic.w - dx);
        x = Math.max(0, ic.x + ic.w - newW);
        w = newW;
        const newH = Math.max(MIN_CROP, ic.h - dy);
        y = Math.max(0, ic.y + ic.h - newH);
        h = newH;
      }
      return { x, y, w, h };
    });
  };

  const onMouseUp = () => { dragRef.current = null; };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const srcX = crop.x / imgScale;
    const srcY = crop.y / imgScale;
    const srcW = crop.w / imgScale;
    const srcH = crop.h / imgScale;
    canvas.width = Math.round(srcW);
    canvas.height = Math.round(srcH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    onCrop(canvas.toDataURL("image/jpeg", 0.95));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Drag the highlighted area to reposition · Drag corners to resize
          </p>
          <div className="flex justify-center bg-black rounded-lg overflow-hidden select-none">
            <canvas
              ref={canvasRef}
              style={{ display: "block", maxWidth: "100%", cursor: "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(crop.w / imgScale)} × {Math.round(crop.h / imgScale)} px
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="action" onClick={handleConfirm}>Apply Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
