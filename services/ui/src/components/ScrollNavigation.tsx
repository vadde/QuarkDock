import React from 'react';
import { ArrowUp, ArrowDown, Compass } from 'lucide-react';

interface ScrollNavigationProps {
  showScrollTop: boolean;
  showScrollBottom: boolean;
  isStreaming: boolean;
  isUserScrolledUp: boolean;
  scrollProgress: number;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

/**
 * ⚛️ Quantum Viewport Teleport & Navigation HUD (Year 2500 Vision)
 * Provides seamless spatial orientation, one-click Apex/Nadir navigation,
 * and live-stream pulse detection when the viewport is decoupled from generation.
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
  // If neither button is needed, don't render HUD
  if (!showScrollTop && !showScrollBottom && !(isStreaming && isUserScrolledUp)) {
    return null;
  }

  const isLiveStreamActive = isStreaming && isUserScrolledUp;

  return (
    <div className="quantum-nav-dock" role="navigation" aria-label="Chat Viewport Navigation">
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
    </div>
  );
};
