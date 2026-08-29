import React, { useEffect, useRef, useState } from 'react';
import { FileRecord } from '../types';
import { IDB } from '../lib/idb';
import { dlBlob } from '../lib/backup';
import { Icon } from './Icon';
import { clamp } from '../lib/srs';

interface ViewerModalProps {
  fileId: string;
  isEmbed?: boolean;
  onClose: () => void;
  onBack?: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({
  fileId,
  isEmbed = false,
  onClose,
  onBack,
  onToast
}) => {
  const [rec, setRec] = useState<FileRecord | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const [isHl, setIsHl] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragLastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;
    IDB.get(fileId).then((r) => {
      if (!active || !r) return;
      setRec(r);
      if (r.blob) {
        const url = URL.createObjectURL(r.blob);
        setBlobUrl(url);
        if (r.kind === 'text') {
          r.blob.text().then((txt) => {
            if (active) setTextContent(txt);
          });
        }
      }
    });

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileId]);

  // Load overlay onto canvas if image
  useEffect(() => {
    if (rec?.kind === 'image' && rec.overlay && canvasRef.current) {
      const cv = canvasRef.current;
      const ctx = cv.getContext('2d');
      const oImg = new Image();
      oImg.onload = () => {
        ctx?.drawImage(oImg, 0, 0);
      };
      oImg.src = rec.overlay;
    }
  }, [rec]);

  const handleImageLoad = () => {
    if (imgRef.current && canvasRef.current) {
      const img = imgRef.current;
      const cv = canvasRef.current;
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.style.width = `${img.naturalWidth}px`;
      cv.style.height = `${img.naturalHeight}px`;

      if (rec?.overlay) {
        const ctx = cv.getContext('2d');
        const oImg = new Image();
        oImg.onload = () => {
          ctx?.drawImage(oImg, 0, 0);
        };
        oImg.src = rec.overlay;
      }
    }
  };

  const handleZoom = (factor: number) => {
    if (factor === 0) {
      setZoom({ s: 1, x: 0, y: 0 });
    } else {
      setZoom((prev) => ({
        ...prev,
        s: clamp(prev.s * factor, 0.2, 6)
      }));
    }
  };

  const handleToggleHl = () => {
    const next = !isHl;
    setIsHl(next);
    onToast(
      next ? 'Highlighter on — draw directly on image' : 'Highlighter off',
      'pen'
    );
  };

  const handleClearHl = async () => {
    if (canvasRef.current && rec) {
      const cv = canvasRef.current;
      const ctx = cv.getContext('2d');
      ctx?.clearRect(0, 0, cv.width, cv.height);
      rec.overlay = null;
      await IDB.put(rec);
      onToast('Highlights cleared', 'trash');
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isHl && canvasRef.current) {
      setIsDrawing(true);
      const cv = canvasRef.current;
      const rect = cv.getBoundingClientRect();
      const scaleX = cv.width / rect.width;
      const scaleY = cv.height / rect.height;
      const startX = (e.clientX - rect.left) * scaleX;
      const startY = (e.clientY - rect.top) * scaleY;

      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255,217,94,.45)';
        ctx.lineWidth = Math.max(10, cv.width / 60);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
      }
      return;
    }

    if (wrapRef.current) {
      wrapRef.current.setPointerCapture(e.pointerId);
      dragLastRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isHl && isDrawing && canvasRef.current) {
      const cv = canvasRef.current;
      const rect = cv.getBoundingClientRect();
      const scaleX = cv.width / rect.width;
      const scaleY = cv.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      return;
    }

    if (e.buttons === 1 && !isHl) {
      const dx = e.clientX - dragLastRef.current.x;
      const dy = e.clientY - dragLastRef.current.y;
      dragLastRef.current = { x: e.clientX, y: e.clientY };
      setZoom((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
    }
  };

  const handlePointerUp = async () => {
    if (isHl && isDrawing && canvasRef.current && rec) {
      setIsDrawing(false);
      const cv = canvasRef.current;
      const dataUrl = cv.toDataURL();
      rec.overlay = dataUrl;
      await IDB.put(rec);
      onToast('Highlight saved ✍️', 'pen');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 1.15 : 0.87);
  };

  if (!rec) return null;

  return (
    <div className={isEmbed ? 'dvembed' : 'viewerov'}>
      <div className="vtools">
        {isEmbed && onBack && (
          <button className="ibtn" onClick={onBack} title="Back">
            <Icon name="back" size={16} />
          </button>
        )}
        <span className="vt">
          {rec.name}
          {rec.pageMemo ? ` · p.${rec.pageMemo}` : ''}
          {rec.caption ? ` — ${rec.caption}` : ''}
        </span>

        {rec.kind === 'image' && (
          <>
            <button className="ibtn" onClick={() => handleZoom(1.25)} title="Zoom In">
              <Icon name="zin" size={16} />
            </button>
            <button className="ibtn" onClick={() => handleZoom(0.8)} title="Zoom Out">
              <Icon name="zout" size={16} />
            </button>
            <button className="ibtn" onClick={() => handleZoom(0)} title="Fit / Reset">
              <Icon name="fit" size={16} />
            </button>
            <button
              className={`ibtn ${isHl ? 'on' : ''}`}
              onClick={handleToggleHl}
              title="Highlighter"
            >
              <Icon name="pen" size={16} />
            </button>
            <button className="ibtn" onClick={handleClearHl} title="Clear Highlights">
              <Icon name="trash" size={16} />
            </button>
          </>
        )}

        {rec.kind === 'pdf' && blobUrl && (
          <button
            className="ibtn"
            onClick={() => window.open(blobUrl, '_blank')}
            title="Open in new tab"
          >
            <Icon name="external" size={16} />
          </button>
        )}

        {rec.blob && (
          <button
            className="ibtn"
            onClick={() => dlBlob(rec.name, rec.blob)}
            title="Download"
          >
            <Icon name="download" size={16} />
          </button>
        )}

        <button className="ibtn" onClick={onClose} title="Close">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="vstage">
        {rec.kind === 'image' && blobUrl && (
          <div
            ref={wrapRef}
            className={`vwrap ${isHl ? 'hl' : ''}`}
            style={{
              transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`
            }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imgRef}
              src={blobUrl}
              alt={rec.name}
              onLoad={handleImageLoad}
            />
            <canvas ref={canvasRef} />
          </div>
        )}

        {rec.kind === 'pdf' && blobUrl && (
          <iframe className="vpdf" src={blobUrl} title={rec.name} />
        )}

        {rec.kind === 'audio' && blobUrl && (
          <audio src={blobUrl} controls style={{ width: '82%' }} />
        )}

        {rec.kind === 'text' && (
          <div className="vtext">{textContent}</div>
        )}
      </div>
    </div>
  );
};
