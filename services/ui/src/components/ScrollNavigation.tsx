import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Compass, GripVertical, RotateCcw } from 'lucide-react';

interface ScrollNavigationProps {
  showScrollTop: boolean;
  showScrollBottom: boolean;
  isStreaming: boolean;
  isUserScrolledUp: boolean;
  scrollProgress: number;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

const STORAGE_KEY_POS = 'quarkdock_hud_pos_v3';

/**
 * ⚛️ Quantum Viewport Teleport & Navigation HUD (Year 2500 Vision)
 * - Freeform Drag & Drop: Drag anywhere on screen to prevent content collision
 * - Persistent spatial coordinates across browser sessions (localStorage)
 * - 1-Click reset to default center docking
 * - Apex/Nadir teleports & Live Generation plasma pulse beacon
 */
export const ScrollNavigation: React.FC<ScrollNavigationProps> = ({
  showScrollTop,
  showScrollBottom,
  isStreaming,
  isUserScrolledUp,
  scrollProgress,
  onScrollToTop,
  onScrollToBottom,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    elemX: number;
    elemY: number;
    hasMoved: boolean;
  }>({ pointerX: 0, pointerY: 0, elemX: 0, elemY: 0, hasMoved: false });

  // Load custom position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition({ x: parsed.x, y: parsed.y });
        }
      }
    } catch (e) {
      console.warn('Failed to restore HUD position:', e);
    }
  }, []);

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary mouse button / touch
    if (e.button !== 0) return;

    // Do not initiate drag if user clicked an action button or reset button
    const target = e.target as HTMLElement;
    if (target.closest('.quantum-nav-btn') || target.closest('.quantum-reset-btn')) {
      return;
    }

    const hud = hudRef.current;
    if (!hud) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const hudRect = hud.getBoundingClientRect();
    const parentRect = hud.parentElement?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elemX: hudRect.left - parentRect.left,
      elemY: hudRect.top - parentRect.top,
      hasMoved: false,
    };

    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !hudRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    const parent = hudRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const hudRect = hudRef.current.getBoundingClientRect();

    let newX = dragStartRef.current.elemX + deltaX;
    let newY = dragStartRef.current.elemY + deltaY;

    // Constrain within parent bounds with a 12px margin
    const maxX = Math.max(0, parentRect.width - hudRect.width - 12);
    const maxY = Math.max(0, parentRect.height - hudRect.height - 12);

    newX = Math.min(Math.max(12, newX), maxX);
    newY = Math.min(Math.max(12, newY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (dragStartRef.current.hasMoved && position) {
      try {
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position));
      } catch (err) {
        console.warn('Failed to save HUD position:', err);
      }
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem(STORAGE_KEY_POS);
    } catch {}
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.quantum-nav-btn')) {
      handleResetPosition(e);
    }
  };

  // If neither navigation action is needed AND not streaming, hide HUD
  if (!showScrollTop && !showScrollBottom && !isStreaming) {
    return null;
  }

  const isLiveStreamActive = isStreaming && isUserScrolledUp;

  return (
    <div
      ref={hudRef}
      className={`quantum-nav-dock ${isDragging ? 'is-dragging' : ''} ${position ? 'custom-positioned' : ''}`}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              transform: 'none',
            }
          : undefined
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      role="navigation"
      aria-label="Chat Viewport Navigation"
      title={position ? "Double-click to reset to top menu bar" : "Drag anywhere to reposition"}
    >
      {/* Ergonomic Drag Grip */}
      <div className="quantum-drag-handle" title="Drag to reposition anywhere on screen">
        <GripVertical size={13} className="drag-icon" />
      </div>

      {/* Teleport to Apex (Top) */}
      {showScrollTop && (
        <button
          className="quantum-nav-btn apex-btn"
          onClick={onScrollToTop}
          title="Teleport to Apex (Top of Chat)"
          aria-label="Scroll to top"
        >
          <ArrowUp size={14} className="quantum-icon" />
          <span className="quantum-label">Top</span>
        </button>
      )}

      {/* Spatial Telemetry Indicator (Scroll Depth) */}
      {(showScrollTop || showScrollBottom) && (
        <div className="quantum-telemetry-badge" title={`Viewport depth: ${scrollProgress}%`}>
          <Compass size={11} className="telemetry-compass" />
          <span>{scrollProgress}%</span>
        </div>
      )}

      {/* Teleport to Nadir (Bottom) or Live Stream Teleport */}
      {(showScrollBottom || isLiveStreamActive) && (
        <button
          className={`quantum-nav-btn nadir-btn ${isLiveStreamActive ? 'live-streaming' : ''}`}
          onClick={onScrollToBottom}
          title={isLiveStreamActive ? 'Receiving live tokens - Click to lock view' : 'Teleport to Nadir (Latest Message)'}
          aria-label="Scroll to bottom"
        >
          {isLiveStreamActive ? (
            <>
              <span className="live-pulse-beacon">
                <span className="beacon-ping" />
                <span className="beacon-core" />
              </span>
              <span className="quantum-label live-text">Live Generation</span>
              <ArrowDown size={14} className="quantum-icon live-bounce" />
            </>
          ) : (
            <>
              <span className="quantum-label">Latest</span>
              <ArrowDown size={14} className="quantum-icon" />
            </>
          )}
        </button>
      )}

      {/* Reset Position Button (visible when custom positioned) */}
      {position && (
        <button
          className="quantum-reset-btn"
          onClick={handleResetPosition}
          title="Snap back to top menu bar"
          aria-label="Reset position"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
};
