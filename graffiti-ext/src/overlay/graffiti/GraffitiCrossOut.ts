export class GraffitiCrossOut {
  /**
   * Creates a graffiti-style cross-out effect for the given element
   */
  public static createCrossOut(targetElement: HTMLElement): HTMLElement {
    const rect = targetElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const container = document.createElement('div');
    container.className = 'graffiti-cross-out';
    container.style.position = 'absolute';
    container.style.top = '0px';
    container.style.left = '0px';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';

    // SVG with two diagonal lines (X)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';

    // Spray-paint filter
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', 'spray-paint-x');
    filter.innerHTML = `
      <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="${Math.random()}"/>
      <feDisplacementMap in="SourceGraphic" scale="8"/>
      <feGaussianBlur stdDeviation="1.2"/>
    `;
    svg.appendChild(filter);

    // Diagonal line 1 (top-left to bottom-right)
    const line1 = document.createElementNS(svgNS, 'line');
    line1.setAttribute('x1', '0');
    line1.setAttribute('y1', '0');
    line1.setAttribute('x2', width.toString());
    line1.setAttribute('y2', height.toString());
    line1.setAttribute('stroke', '#C04000');
    line1.setAttribute('stroke-width', '2.5');
    line1.setAttribute('opacity', '1.0');
    line1.setAttribute('filter', 'url(#spray-paint-x)');
    svg.appendChild(line1);

    // Diagonal line 2 (top-right to bottom-left)
    const line2 = document.createElementNS(svgNS, 'line');
    line2.setAttribute('x1', width.toString());
    line2.setAttribute('y1', '0');
    line2.setAttribute('x2', '0');
    line2.setAttribute('y2', height.toString());
    line2.setAttribute('stroke', '#C04000');
    line2.setAttribute('stroke-width', '2.5');
    line2.setAttribute('opacity', '1.0');
    line2.setAttribute('filter', 'url(#spray-paint-x)');
    svg.appendChild(line2);

    container.appendChild(svg);
    return container;
  }

  /**
   * Updates the cross-out effect for a resized element
   */
  public static updateCrossOut(targetElement: HTMLElement, crossOut: HTMLElement): void {
    const rect = targetElement.getBoundingClientRect();
    const svg = crossOut.querySelector('svg');
    if (!svg) return;
    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    // Optionally, update the line coordinates if needed
    const lines = svg.querySelectorAll('line');
    if (lines.length === 2) {
      lines[0].setAttribute('x2', rect.width.toString());
      lines[0].setAttribute('y2', rect.height.toString());
      lines[1].setAttribute('x1', rect.width.toString());
      lines[1].setAttribute('y2', rect.height.toString());
    }
  }
} 