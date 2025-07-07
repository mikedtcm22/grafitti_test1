import { OverlayState, OverlayStyle, OverlayConfig } from './types';
import { GraffitiCrossOut } from './graffiti/GraffitiCrossOut';
import { CrossOutRenderers } from './cross-out-renderers';
import { Style } from '../data/types';
import { getVisiblePriceRect } from './position-utils';

export class OverlayManager {
  private state: OverlayState;
  private styles: Map<string, OverlayStyle>;
  private defaultStyle: OverlayStyle;
  private currentStyle: Style | null = null;

  constructor(style?: Style) {
    this.state = {
      overlays: new Map(),
      activeStyle: 'default'
    };

    this.styles = new Map();
    this.defaultStyle = {
      theme: {
        primary: '#FF6B00',
        secondary: '#FFB800',
        background: '#FFFFFF',
        text: '#000000'
      },
      animation: {
        duration: 300,
        easing: 'ease-in-out'
      }
    };

    this.registerStyle('default', this.defaultStyle);
    
    // Set the current style if provided
    if (style) {
      this.setCurrentStyle(style);
    }

    // Inject graffiti font if not already present
    if (!document.getElementById('graffiti-font-permanent-marker')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'graffiti-font-permanent-marker';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
      document.head.appendChild(fontLink);
    }
  }

  public setCurrentStyle(style: Style): void {
    this.currentStyle = style;
    console.log('[OverlayManager] Set current style:', style.name);
  }

  public getCurrentStyle(): Style | null {
    return this.currentStyle;
  }

  public registerStyle(name: string, style: OverlayStyle): void {
    this.styles.set(name, style);
  }

  public getStyle(name: string): OverlayStyle {
    return this.styles.get(name) || this.defaultStyle;
  }

  public setActiveStyle(name: string): void {
    if (this.styles.has(name)) {
      this.state.activeStyle = name;
      const overlay = this.state.overlays.get(name);
      if (overlay) {
        this.updateOverlayStyle(overlay, this.getStyle(name));
      }
    }
  }

  public getActiveStyle(): OverlayStyle {
    return this.getStyle(this.state.activeStyle);
  }

  private updateOverlayStyle(overlay: { element: HTMLElement; observer: ResizeObserver; style: OverlayStyle }, style: OverlayStyle): void {
    overlay.style = style;
    // Apply the style to the element
    Object.assign(overlay.element.style, {
      color: style.theme.text,
      backgroundColor: style.theme.background,
      transition: `all ${style.animation.duration}ms ${style.animation.easing}`
    });
  }

  private createCrossOut(targetElement: HTMLElement, midLineY?: number): HTMLElement {
    const rect = targetElement.getBoundingClientRect();
    
    // Use new renderers if we have a current style with known names
    if (this.currentStyle) {
      const options = {
        width: rect.width,
        height: rect.height,
        style: this.currentStyle,
        midLineY
      };

      // Choose renderer based on style name
      if (this.currentStyle.name === 'spray-paint') {
        return CrossOutRenderers.renderDoubleXCrossOut(options);
      } else if (this.currentStyle.name === 'marker') {
        return CrossOutRenderers.renderMarkerStrokeCrossOut(options);
      }
      // For unknown style names, fall through to original renderer
    }

    // Fallback to original renderer
    return GraffitiCrossOut.createCrossOut(targetElement);
  }

  private updateCrossOut(targetElement: HTMLElement, crossOut: HTMLElement): void {
    // Use new renderers if we have a current style
    if (this.currentStyle) {
      if (this.currentStyle.name === 'spray-paint' || this.currentStyle.name === 'marker') {
        CrossOutRenderers.updateCrossOut(targetElement, crossOut);
        return;
      }
    }

    // Fallback to original renderer
    GraffitiCrossOut.updateCrossOut(targetElement, crossOut);
  }

  private getFontFamily(): string {
    if (!this.currentStyle) {
      return "'Permanent Marker', 'Rock Salt', cursive, sans-serif";
    }

    // Try font_family first, then fallback chain
    if (this.currentStyle.font_family) {
      return this.currentStyle.font_family;
    }
    
    // Legacy fallback
    if (this.currentStyle.font_url) {
      return "'Permanent Marker', 'Rock Salt', cursive, sans-serif";
    }

    return "'Permanent Marker', 'Rock Salt', cursive, sans-serif";
  }

  public createOverlay(config: OverlayConfig): HTMLElement {
    console.log('[Graffiti] OverlayManager.createOverlay called', config);
    console.log('[OverlayManager] Creating overlay with config:', config);
    const style = this.getStyle(config.styleName || this.state.activeStyle);

    // Use robust price rect for overlay positioning
    const { rect, midLineY } = getVisiblePriceRect(config.targetElement);

    // Create container with more specific styles
    const container = document.createElement('div');
    container.className = 'graffiti-overlay-container';
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
    `;

    // Create the actual overlay
    const overlay = document.createElement('div');
    overlay.className = 'graffiti-overlay';
    overlay.style.cssText = `
      position: absolute !important;
      top: ${rect.top}px !important;
      left: ${rect.left}px !important;
      width: ${rect.width}px !important;
      height: ${rect.height}px !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      transform: translate(0, 0); /* will update for centering if needed */
      `;

    // Create cross-out effect using createCrossOut method
    console.log('[OverlayManager] Creating cross-out effect');
    const crossOut = this.createCrossOut(config.targetElement, midLineY);
    overlay.appendChild(crossOut);

    // Create BTC price display
    console.log('[OverlayManager] Creating BTC price display');
    const btcPrice = document.createElement('div');
    btcPrice.className = 'btc-price';
    // Only show BTC price (remove USD)
    const btcOnly = (config.price || '').split('/').pop()?.trim() || '';
    btcPrice.textContent = btcOnly;

    // Compute font size based on target element
    let computedFontSize = '2em';
    try {
      const style = window.getComputedStyle(config.targetElement);
      const fontSize = parseFloat(style.fontSize);
      if (!isNaN(fontSize)) {
        computedFontSize = (fontSize * 1.3) + 'px';
      }
    } catch (e) {
      // fallback to default
    }

    // Get font family from current style
    const fontFamily = this.getFontFamily();

    btcPrice.style.cssText = `
      color: #FF6B00 !important;
      background: transparent !important;
      padding: 0 8px !important;
      border-radius: 4px !important;
      font-weight: bold !important;
      font-family: ${fontFamily} !important;
      font-size: ${computedFontSize} !important;
      position: absolute !important;
      top: -24px !important;
      left: 60px !important;
      z-index: 2147483647 !important;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000 !important;
      -webkit-text-stroke: 1px #000;
      pointer-events: none !important;
    `;
    overlay.appendChild(btcPrice);

    // Add overlay to container
    container.appendChild(overlay);

    // Set up resize observer
    const observer = new ResizeObserver(() => {
      const { rect: newRect, midLineY: newMidLineY } = getVisiblePriceRect(config.targetElement);
      overlay.style.top = `${newRect.top}px`;
      overlay.style.left = `${newRect.left}px`;
      overlay.style.width = `${newRect.width}px`;
      overlay.style.height = `${newRect.height}px`;
      // Update cross-out effect using new renderers
      if (this.currentStyle) {
        const newCrossOut = this.currentStyle.name === 'spray-paint'
          ? CrossOutRenderers.renderDoubleXCrossOut({
              width: newRect.width,
              height: newRect.height,
              style: this.currentStyle,
              midLineY: newMidLineY
            })
          : CrossOutRenderers.renderMarkerStrokeCrossOut({
              width: newRect.width,
              height: newRect.height,
              style: this.currentStyle,
              midLineY: newMidLineY
            });
        overlay.replaceChild(newCrossOut, crossOut);
      } else {
        this.updateCrossOut(config.targetElement, crossOut);
      }
    });
    observer.observe(config.targetElement);

    // Add scroll listener
    const scrollListener = () => {
      const { rect: newRect } = getVisiblePriceRect(config.targetElement);
      overlay.style.top = `${newRect.top}px`;
      overlay.style.left = `${newRect.left}px`;
    };
    window.addEventListener('scroll', scrollListener, true);

    // Store observer and cleanup function
    this.state.overlays.set(config.id, {
      element: container,
      observer,
      style,
      cleanup: () => {
        window.removeEventListener('scroll', scrollListener, true);
      }
    });

    // Attach overlay as sibling of targetElement
    if (config.targetElement.parentElement) {
      config.targetElement.parentElement.insertBefore(container, config.targetElement.nextSibling);
      config.targetElement.setAttribute('data-graffiti-target', 'true');
      console.log('[OverlayManager] Overlay attached as sibling to targetElement');
    } else {
      document.body.appendChild(container);
      console.log('[OverlayManager] Overlay attached to document.body (fallback)');
    }

    // Add debug attribute and log
    container.setAttribute('data-graffiti-debug', Date.now().toString());
    console.log('[OverlayManager] Overlay element:', container);

    return container;
  }

  public removeOverlay(id: string): void {
    const overlay = this.state.overlays.get(id);
    if (overlay) {
      overlay.observer.disconnect();
      overlay.element.remove();
      this.state.overlays.delete(id);
    }
  }

  public cleanup(): void {
    this.state.overlays.forEach((_overlay, id) => {
      this.removeOverlay(id);
    });
  }
} 