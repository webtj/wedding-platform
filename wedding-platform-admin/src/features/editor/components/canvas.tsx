'use client';

import { useRef, useEffect, useCallback } from 'react';
import { PixiEditorApp } from '../lib/pixi-app';
import { InteractionManager } from '../lib/interaction';
import { useSceneStore } from '../store/scene-store';

interface EditorCanvasProps {
  onReady?: () => void;
}

export function EditorCanvas({ onReady }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiRef = useRef<PixiEditorApp | null>(null);
  const interactionRef = useRef<InteractionManager | null>(null);
  const initializedRef = useRef(false);

  const venue = useSceneStore((s) => s.venue);
  const objects = useSceneStore((s) => s.objects);

  // Initialize PixiJS — wait for container to have proper dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const tryInit = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 10 && h > 10) {
        startPixi(w, h);
        return true;
      }
      return false;
    };

    const startPixi = (w: number, h: number) => {
      if (cancelled || initializedRef.current) return;

      const vw = venue?.width ?? 20;
      const vd = venue?.depth ?? 30;

      const pixi = new PixiEditorApp(w, h, vw, vd);

      pixi.init().then(() => {
        if (cancelled) { pixi.destroy(); return; }

        initializedRef.current = true;
        pixiRef.current = pixi;

        // Append canvas to DOM
        const canvas = pixi.canvas;
        canvas.style.display = 'block';
        container.appendChild(canvas);

        // Set up interaction
        interactionRef.current = new InteractionManager(pixi);

        onReady?.();
      }).catch((err) => {
        console.error('[EditorCanvas] PixiJS init failed:', err);
      });
    };

    // Try immediate init, or wait for ResizeObserver
    if (!tryInit()) {
      const sizeObserver = new ResizeObserver((entries) => {
        if (cancelled) { sizeObserver.disconnect(); return; }
        for (const entry of entries) {
          if (entry.contentRect.width > 10 && entry.contentRect.height > 10) {
            sizeObserver.disconnect();
            startPixi(entry.contentRect.width, entry.contentRect.height);
            return;
          }
        }
      });
      sizeObserver.observe(container);
    }

    // Handle ongoing resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 10 && entry.contentRect.height > 10) {
          if (pixiRef.current && initializedRef.current) {
            pixiRef.current.resize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      interactionRef.current?.destroy();
      if (pixiRef.current && container.contains(pixiRef.current.canvas)) {
        container.removeChild(pixiRef.current.canvas);
        pixiRef.current.destroy();
      }
      pixiRef.current = null;
      interactionRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync venue size
  useEffect(() => {
    if (pixiRef.current && initializedRef.current) {
      pixiRef.current.setVenueSize(venue.width, venue.depth);
    }
  }, [venue.width, venue.depth]);

  // Sync objects
  useEffect(() => {
    if (interactionRef.current && initializedRef.current) {
      interactionRef.current.syncObjects(objects);
    }
  }, [objects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        interactionRef.current?.deleteSelected();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            useSceneStore.getState().redo();
          } else {
            useSceneStore.getState().undo();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle drag and drop from material panel
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const materialData = e.dataTransfer.getData('application/material');
    if (materialData && interactionRef.current) {
      interactionRef.current.handleDrop(e.clientX, e.clientY, materialData);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 overflow-hidden'
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}