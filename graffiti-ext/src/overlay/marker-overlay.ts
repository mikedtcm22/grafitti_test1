import { ORANGE_MAIN, BLACK_ACCENT } from '../styles/color';
import { calculateTwoOClockPosition } from './position-utils';

export interface MarkerOverlayOptions {
  width: number;
  fontSize: number;
  btcText: string;
  originalRect?: DOMRect; // Add original rect for positioning
}

export function generateMarkerOverlay({ width, fontSize, btcText, originalRect }: MarkerOverlayOptions): HTMLElement {
  const btcFontSize = fontSize * 1.3;
  const pathLength = width + 20; // 10px padding on each side
  const scribbleStrokeWidth = fontSize * 0.3;
  const estimatedTextWidth = btcFontSize * btcText.length * 0.6;

  // Calculate two-o'clock positioning if original rect is provided
  let textX = width + 15; // fallback
  let textY = -5; // fallback
  let viewBoxX = -10;
  let viewBoxY = -btcFontSize;
  let viewBoxWidth = pathLength + estimatedTextWidth;
  let viewBoxHeight = btcFontSize + 40;

  if (originalRect) {
    const position = calculateTwoOClockPosition({
      originalRect,
      fontSize,
      btcTextWidth: estimatedTextWidth
    });
    
    textX = position.textX;
    textY = position.textY;
    viewBoxX = position.viewBoxAdjustment.x;
    viewBoxY = position.viewBoxAdjustment.y;
    viewBoxWidth = position.viewBoxAdjustment.width;
    viewBoxHeight = position.viewBoxAdjustment.height;
  }

  // Create the overlay element
  const overlayElement = document.createElement('div');
  overlayElement.className = 'graffiti-marker-overlay';
  overlayElement.style.cssText = `
    position: absolute !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  `;

  // Create the SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
  svg.style.cssText = `
    width: ${viewBoxWidth}px;
    height: ${viewBoxHeight}px;
    overflow: visible;
  `;

  // Create the bright red scribble path centered on price
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const centerY = fontSize * 0.5; // Center the cross-out on the text height
  path.setAttribute('d', `M0,${centerY - fontSize * 0.2} L${pathLength},${centerY - fontSize * 0.1} L0,${centerY} L${pathLength},${centerY + fontSize * 0.1} L0,${centerY + fontSize * 0.2}`);
  path.setAttribute('stroke', '#FF0000'); // Bright red
  path.setAttribute('stroke-width', scribbleStrokeWidth.toString());
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  
  // Add animation
  path.style.cssText = `
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw-marker 1.5s ease-in-out forwards;
  `;

  // Create the BTC text
  const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  textGroup.style.cssText = `
    opacity: 0;
    animation: fade-in-text 1s ease-in forwards 1s;
  `;

  // Load bubble font if not already loaded
  if (!document.getElementById('graffiti-bubble-font')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'graffiti-bubble-font';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Bungee&family=Fredoka+One&family=Righteous&display=swap';
    document.head.appendChild(fontLink);
  }

  // Create background text (black outline)
  const backgroundText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  backgroundText.setAttribute('x', textX.toString());
  backgroundText.setAttribute('y', textY.toString());
  backgroundText.setAttribute('dominant-baseline', 'middle');
  backgroundText.setAttribute('text-anchor', 'start');
  backgroundText.setAttribute('font-family', "'Bungee', 'Fredoka One', 'Righteous', 'Comic Sans MS', fantasy");
  backgroundText.setAttribute('font-size', btcFontSize.toString());
  backgroundText.setAttribute('font-weight', 'bold');
  backgroundText.setAttribute('stroke-width', '4');
  backgroundText.setAttribute('stroke', BLACK_ACCENT);
  backgroundText.setAttribute('fill', BLACK_ACCENT);
  backgroundText.textContent = btcText;

  // Create foreground text (orange fill)
  const foregroundText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  foregroundText.setAttribute('x', textX.toString());
  foregroundText.setAttribute('y', textY.toString());
  foregroundText.setAttribute('dominant-baseline', 'middle');
  foregroundText.setAttribute('text-anchor', 'start');
  foregroundText.setAttribute('font-family', "'Bungee', 'Fredoka One', 'Righteous', 'Comic Sans MS', fantasy");
  foregroundText.setAttribute('font-size', btcFontSize.toString());
  foregroundText.setAttribute('font-weight', 'bold');
  foregroundText.setAttribute('fill', ORANGE_MAIN);
  foregroundText.textContent = btcText;

  textGroup.appendChild(backgroundText);
  textGroup.appendChild(foregroundText);
  svg.appendChild(path);
  svg.appendChild(textGroup);
  overlayElement.appendChild(svg);

  // Add CSS animations
  if (!document.getElementById('graffiti-marker-animations')) {
    const style = document.createElement('style');
    style.id = 'graffiti-marker-animations';
    style.textContent = `
      @keyframes draw-marker {
        to {
          stroke-dashoffset: 0;
        }
      }
      @keyframes fade-in-text {
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return overlayElement;
} 