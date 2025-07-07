import { ORANGE_MAIN } from '../styles/color';
import { calculateTwoOClockPosition } from './position-utils';

export interface SprayPaintOverlayOptions {
  width: number;
  fontSize: number;
  btcText: string;
  originalRect?: DOMRect; // Add original rect for positioning
}

export function generateSprayPaintOverlay({ width, fontSize, btcText, originalRect }: SprayPaintOverlayOptions): HTMLElement {
  // Load stencil font if not already loaded
  if (!document.getElementById('graffiti-stencil-font')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'graffiti-stencil-font';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Stardos+Stencil:wght@400;700&family=Bungee&family=Special+Elite&display=swap';
    document.head.appendChild(fontLink);
  }

  const btcFontSize = fontSize * 1.75;
  const estimatedTextWidth = btcFontSize * btcText.length * 0.6;

  // Calculate two-o'clock positioning if original rect is provided
  let textX = width + 5; // fallback
  let textY = -fontSize * 0.2; // fallback
  let viewBoxX = 0;
  let viewBoxY = -fontSize;
  let viewBoxWidth = width + estimatedTextWidth + 40;
  let viewBoxHeight = Math.max(fontSize * 2, btcFontSize + 20);

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
  overlayElement.className = 'graffiti-spray-overlay';
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

  // Create the defs section with filters
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Main spray paint texture filter
  const sprayFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  sprayFilter.setAttribute('id', 'spray-paint-texture');
  sprayFilter.setAttribute('x', '-50%');
  sprayFilter.setAttribute('y', '-50%');
  sprayFilter.setAttribute('width', '200%');
  sprayFilter.setAttribute('height', '200%');
  
  const turbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
  turbulence.setAttribute('type', 'fractalNoise');
  turbulence.setAttribute('baseFrequency', '0.1 0.4');
  turbulence.setAttribute('numOctaves', '3');
  turbulence.setAttribute('seed', '10');
  turbulence.setAttribute('result', 'turbulence');
  
  const displacement = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
  displacement.setAttribute('in', 'SourceGraphic');
  displacement.setAttribute('in2', 'turbulence');
  displacement.setAttribute('scale', '5');
  displacement.setAttribute('xChannelSelector', 'R');
  displacement.setAttribute('yChannelSelector', 'G');
  displacement.setAttribute('result', 'displaced');
  
  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('in', 'displaced');
  blur.setAttribute('stdDeviation', '1.5');
  blur.setAttribute('result', 'blurred');
  
  sprayFilter.appendChild(turbulence);
  sprayFilter.appendChild(displacement);
  sprayFilter.appendChild(blur);
  
  defs.appendChild(sprayFilter);

  // Create the spray paint group
  const sprayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  sprayGroup.setAttribute('filter', 'url(#spray-paint-texture)');

  // Create organic brush-style X inspired by paint brush strokes
  const centerY = fontSize * 0.5;
  
  // First diagonal stroke (top-left to bottom-right) - main orange brush stroke
  const brushStroke1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const stroke1Path = `M${width * 0.1},${centerY - fontSize * 0.3} 
                       Q${width * 0.25},${centerY - fontSize * 0.2} ${width * 0.4},${centerY - fontSize * 0.1}
                       Q${width * 0.6},${centerY + fontSize * 0.1} ${width * 0.9},${centerY + fontSize * 0.3}
                       Q${width * 0.85},${centerY + fontSize * 0.35} ${width * 0.8},${centerY + fontSize * 0.25}
                       Q${width * 0.6},${centerY + fontSize * 0.05} ${width * 0.4},${centerY - fontSize * 0.05}
                       Q${width * 0.25},${centerY - fontSize * 0.15} ${width * 0.15},${centerY - fontSize * 0.25} Z`;
  brushStroke1.setAttribute('d', stroke1Path);
  brushStroke1.setAttribute('fill', ORANGE_MAIN);
  brushStroke1.setAttribute('filter', 'url(#spray-paint-texture)');
  brushStroke1.style.cssText = `
    opacity: 0;
    animation: fade-in-stroke 0.8s ease-out forwards;
  `;

  // Second diagonal stroke (top-right to bottom-left) - main orange brush stroke
  const brushStroke2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const stroke2Path = `M${width * 0.9},${centerY - fontSize * 0.3} 
                       Q${width * 0.75},${centerY - fontSize * 0.2} ${width * 0.6},${centerY - fontSize * 0.1}
                       Q${width * 0.4},${centerY + fontSize * 0.1} ${width * 0.1},${centerY + fontSize * 0.3}
                       Q${width * 0.15},${centerY + fontSize * 0.35} ${width * 0.2},${centerY + fontSize * 0.25}
                       Q${width * 0.4},${centerY + fontSize * 0.05} ${width * 0.6},${centerY - fontSize * 0.05}
                       Q${width * 0.75},${centerY - fontSize * 0.15} ${width * 0.85},${centerY - fontSize * 0.25} Z`;
  brushStroke2.setAttribute('d', stroke2Path);
  brushStroke2.setAttribute('fill', ORANGE_MAIN);
  brushStroke2.setAttribute('filter', 'url(#spray-paint-texture)');
  brushStroke2.style.cssText = `
    opacity: 0;
    animation: fade-in-stroke 0.8s ease-out forwards 0.2s;
  `;

  // Add some paint speckles around the X
  const speckles = [];
  for (let i = 0; i < 8; i++) {
    const speckle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const speckleX = width * (0.1 + Math.random() * 0.8);
    const speckleY = centerY + (Math.random() - 0.5) * fontSize * 0.8;
    const speckleSize = 1 + Math.random() * 2;
    
    speckle.setAttribute('cx', speckleX.toString());
    speckle.setAttribute('cy', speckleY.toString());
    speckle.setAttribute('r', speckleSize.toString());
    speckle.setAttribute('fill', ORANGE_MAIN);
    speckle.setAttribute('opacity', (0.3 + Math.random() * 0.4).toString());
    speckle.style.cssText = `
      animation: fade-in-speckle 0.3s ease-out forwards ${0.5 + i * 0.1}s;
      opacity: 0;
    `;
    speckles.push(speckle);
  }

  sprayGroup.appendChild(brushStroke1);
  sprayGroup.appendChild(brushStroke2);
  speckles.forEach(speckle => sprayGroup.appendChild(speckle));

  // Create the BTC text
  const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  textGroup.setAttribute('transform', `translate(${textX}, ${textY})`);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('text-anchor', 'start');
  text.setAttribute('font-family', "'Stardos Stencil', 'Bungee', 'Special Elite', monospace, sans-serif");
  text.setAttribute('font-size', btcFontSize.toString());
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', ORANGE_MAIN);
  text.textContent = btcText;

  // Clean text appearance with fade-in animation
  text.style.cssText = `
    opacity: 0;
    animation: fade-in-text 0.5s ease-out forwards 1.2s;
  `;

  textGroup.appendChild(text);
  svg.appendChild(defs);
  svg.appendChild(sprayGroup);
  svg.appendChild(textGroup);
  overlayElement.appendChild(svg);

  // Add CSS animations
  if (!document.getElementById('graffiti-spray-animations')) {
    const style = document.createElement('style');
    style.id = 'graffiti-spray-animations';
    style.textContent = `
      @keyframes fade-in-stroke {
        to {
          opacity: 1;
        }
      }
      @keyframes fade-in-speckle {
        to {
          opacity: 0.6;
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