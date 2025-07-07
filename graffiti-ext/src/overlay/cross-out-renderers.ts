import { Style } from '../data/types';

export interface CrossOutOptions {
  width: number;
  height: number;
  style: Style;
  midLineY?: number;
}

export class CrossOutRenderers {
  /**
   * Creates a double X cross-out effect for spray-paint style
   * Layer 1: Black X (1pt thinner than current)
   * Layer 2: Orange X (1pt thicker than current) with 0.8 opacity
   */
  public static renderDoubleXCrossOut(options: CrossOutOptions): HTMLElement {
    console.log('[CrossOutRenderers] renderDoubleXCrossOut called', options);
    const { width, height, style, midLineY } = options;
    
    const container = document.createElement('div');
    container.className = 'graffiti-cross-out-double-x';
    container.style.cssText = `
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;

    // Get style parameters from meta or use defaults
    const meta = style.meta || {};
    const layer1Color = meta.layer_1_color || '#000000';
    const layer1Weight = meta.layer_1_weight || 2;
    const layer2Color = meta.layer_2_color || '#ff7f00';
    const layer2Weight = meta.layer_2_weight || 3;
    const layer2Opacity = meta.layer_2_opacity || 0.8;

    // Center Y for cross-out
    const centerY = typeof midLineY === 'number' ? midLineY : height / 2;

    // Spray-paint filter
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', `spray-paint-double-x-${Math.random()}`);
    filter.innerHTML = `
      <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="${Math.random()}"/>
      <feDisplacementMap in="SourceGraphic" scale="8"/>
      <feGaussianBlur stdDeviation="1.2"/>
    `;
    svg.appendChild(filter);

    // Layer 1: Black X (thinner)
    const line1Layer1 = document.createElementNS(svgNS, 'line');
    line1Layer1.setAttribute('x1', '0');
    line1Layer1.setAttribute('y1', '0');
    line1Layer1.setAttribute('x2', width.toString());
    line1Layer1.setAttribute('y2', height.toString());
    line1Layer1.setAttribute('stroke', layer1Color);
    line1Layer1.setAttribute('stroke-width', layer1Weight.toString());
    line1Layer1.setAttribute('filter', `url(#spray-paint-double-x-${Math.random()})`);

    const line2Layer1 = document.createElementNS(svgNS, 'line');
    line2Layer1.setAttribute('x1', width.toString());
    line2Layer1.setAttribute('y1', '0');
    line2Layer1.setAttribute('x2', '0');
    line2Layer1.setAttribute('y2', height.toString());
    line2Layer1.setAttribute('stroke', layer1Color);
    line2Layer1.setAttribute('stroke-width', layer1Weight.toString());
    line2Layer1.setAttribute('filter', `url(#spray-paint-double-x-${Math.random()})`);

    // Layer 2: Orange X (thicker) - positioned at centerY
    const line1Layer2 = document.createElementNS(svgNS, 'line');
    line1Layer2.setAttribute('x1', '0');
    line1Layer2.setAttribute('y1', centerY.toString());
    line1Layer2.setAttribute('x2', width.toString());
    line1Layer2.setAttribute('y2', centerY.toString());
    line1Layer2.setAttribute('stroke', layer2Color);
    line1Layer2.setAttribute('stroke-width', layer2Weight.toString());
    line1Layer2.setAttribute('opacity', layer2Opacity.toString());
    line1Layer2.setAttribute('filter', `url(#spray-paint-double-x-${Math.random()})`);

    const line2Layer2 = document.createElementNS(svgNS, 'line');
    line2Layer2.setAttribute('x1', width.toString());
    line2Layer2.setAttribute('y1', centerY.toString());
    line2Layer2.setAttribute('x2', '0');
    line2Layer2.setAttribute('y2', centerY.toString());
    line2Layer2.setAttribute('stroke', layer2Color);
    line2Layer2.setAttribute('stroke-width', layer2Weight.toString());
    line2Layer2.setAttribute('opacity', layer2Opacity.toString());
    line2Layer2.setAttribute('filter', `url(#spray-paint-double-x-${Math.random()})`);

    svg.appendChild(line1Layer1);
    svg.appendChild(line2Layer1);
    svg.appendChild(line1Layer2);
    svg.appendChild(line2Layer2);

    container.appendChild(svg);
    return container;
  }

  /**
   * Creates a marker stroke cross-out effect (not X shape)
   * Uses a single stroke path in bright red
   */
  public static renderMarkerStrokeCrossOut(options: CrossOutOptions): HTMLElement {
    console.log('[CrossOutRenderers] renderMarkerStrokeCrossOut called', options);
    const { width, height, style, midLineY } = options;
    
    const container = document.createElement('div');
    container.className = 'graffiti-cross-out-marker';
    container.style.cssText = `
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;

    // Get style parameters from meta or use defaults
    const meta = style.meta || {};
    const color = meta.color || '#ff0000';
    const strokeWidth = meta.stroke_width || 3;

    // Center Y for cross-out
    const centerY = typeof midLineY === 'number' ? midLineY : height / 2;

    // Create a marker stroke path (curved line across the element)
    const path = document.createElementNS(svgNS, 'path');
    const pathData = `M0,${centerY} Q${width * 0.25},${centerY - 5} ${width * 0.5},${centerY} Q${width * 0.75},${centerY + 5} ${width},${centerY}`;
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', strokeWidth.toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    // Add marker stroke effect filter
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', `marker-stroke-${Math.random()}`);
    filter.innerHTML = `
      <feGaussianBlur stdDeviation="0.5"/>
      <feOffset dx="0" dy="0"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    `;
    svg.appendChild(filter);
    path.setAttribute('filter', `url(#${filter.getAttribute('id')})`);

    svg.appendChild(path);
    container.appendChild(svg);
    return container;
  }

  /**
   * Updates cross-out effect for resized elements
   */
  public static updateCrossOut(targetElement: HTMLElement, crossOut: HTMLElement): void {
    const rect = targetElement.getBoundingClientRect();
    const svg = crossOut.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    // Update line coordinates for double X
    const lines = svg.querySelectorAll('line');
    if (lines.length >= 2) {
      lines.forEach(line => {
        if (line.getAttribute('x2') && line.getAttribute('y2')) {
          line.setAttribute('x2', rect.width.toString());
          line.setAttribute('y2', rect.height.toString());
        }
        if (line.getAttribute('x1') && line.getAttribute('y1') === '0') {
          line.setAttribute('x1', rect.width.toString());
        }
      });
    }

    // Update path for marker stroke
    const path = svg.querySelector('path');
    if (path) {
      const startX = rect.width * 0.1;
      const endX = rect.width * 0.9;
      const startY = rect.height * 0.3;
      const endY = rect.height * 0.7;
      const controlX = rect.width * 0.5;
      const controlY = rect.height * 0.1;
      
      const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      path.setAttribute('d', pathData);
    }
  }
} 