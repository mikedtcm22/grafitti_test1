import { SprayPaintEffect } from '../types';

/**
 * Generates a spray paint texture using SVG filters and patterns
 */
export class SprayPaintTextureGenerator {
  private static readonly DEFAULT_SPREAD = 0.5;
  private static readonly DEFAULT_OPACITY = 0.8;
  private static readonly DEFAULT_COLOR = '#ff6b00';

  /**
   * Creates an SVG filter for spray paint effect
   */
  private static createSprayPaintFilter(): SVGElement {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'spray-paint');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    // Turbulence for spray texture
    const turbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', '0.05');
    turbulence.setAttribute('numOctaves', '3');
    turbulence.setAttribute('seed', Math.random().toString());
    filter.appendChild(turbulence);

    // Displacement map for spray effect
    const displacement = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    displacement.setAttribute('in', 'SourceGraphic');
    displacement.setAttribute('scale', '20');
    filter.appendChild(displacement);

    // Gaussian blur for soft edges
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '2');
    filter.appendChild(blur);

    return filter;
  }

  /**
   * Generates paint drips for the spray effect
   */
  private static generateDrips(width: number, height: number): Array<{ path: string; opacity: number }> {
    const drips: Array<{ path: string; opacity: number }> = [];
    const numDrips = Math.floor(Math.random() * 3) + 2; // 2-4 drips

    for (let i = 0; i < numDrips; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * (height * 0.3);
      const endX = startX + (Math.random() - 0.5) * 20;
      const endY = height + Math.random() * 10;
      const controlX = startX + (Math.random() - 0.5) * 30;
      const controlY = (startY + endY) / 2;

      const path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      const opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7 opacity

      drips.push({ path, opacity });
    }

    return drips;
  }

  /**
   * Generates splatter effects for the spray
   */
  private static generateSplatter(width: number, height: number): Array<{ x: number; y: number; size: number; opacity: number }> {
    const splatter: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    const numSplatter = Math.floor(Math.random() * 10) + 5; // 5-15 splatter points

    for (let i = 0; i < numSplatter; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 1 + Math.random() * 3; // 1-4px size
      const opacity = 0.1 + Math.random() * 0.3; // 0.1-0.4 opacity

      splatter.push({ x, y, size, opacity });
    }

    return splatter;
  }

  /**
   * Creates a spray paint effect for the given dimensions
   */
  public static createSprayPaintEffect(width: number, height: number, options: Partial<SprayPaintEffect> = {}): SprayPaintEffect {
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Add filter
    const filter = this.createSprayPaintFilter();
    svg.appendChild(filter);

    // Create main spray area
    const spray = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    spray.setAttribute('width', width.toString());
    spray.setAttribute('height', height.toString());
    spray.setAttribute('fill', options.color || this.DEFAULT_COLOR);
    spray.setAttribute('opacity', (options.opacity || this.DEFAULT_OPACITY).toString());
    spray.setAttribute('filter', 'url(#spray-paint)');
    svg.appendChild(spray);

    // Add drips
    const drips = options.drips || this.generateDrips(width, height);
    drips.forEach(drip => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', drip.path);
      path.setAttribute('stroke', options.color || this.DEFAULT_COLOR);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', drip.opacity.toString());
      svg.appendChild(path);
    });

    // Add splatter
    const splatter = options.splatter || this.generateSplatter(width, height);
    splatter.forEach(splat => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', splat.x.toString());
      circle.setAttribute('cy', splat.y.toString());
      circle.setAttribute('r', splat.size.toString());
      circle.setAttribute('fill', options.color || this.DEFAULT_COLOR);
      circle.setAttribute('opacity', splat.opacity.toString());
      svg.appendChild(circle);
    });

    return {
      texture: svg,
      opacity: options.opacity || this.DEFAULT_OPACITY,
      spread: options.spread || this.DEFAULT_SPREAD,
      drips,
      splatter
    };
  }
} 