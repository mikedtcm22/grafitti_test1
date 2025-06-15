import { OverlayState, OverlayStyle, OverlayConfig } from './types';
import { GraffitiCrossOut } from './graffiti/GraffitiCrossOut';

export class OverlayManager {
  private state: OverlayState;
  private styles: Map<string, OverlayStyle>;
  private defaultStyle: OverlayStyle;

  constructor() {
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

    // Inject graffiti font if not already present
    if (!document.getElementById('graffiti-font-permanent-marker')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'graffiti-font-permanent-marker';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
      document.head.appendChild(fontLink);
    }
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

  public createOverlay(config: OverlayConfig): HTMLElement {
    console.log('[OverlayManager] Creating overlay with config:', config);
    const style = this.getStyle(config.styleName || this.state.activeStyle);
    
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
      top: ${config.rect.top}px !important;
      left: ${config.rect.left}px !important;
      width: ${config.rect.width}px !important;
      height: ${config.rect.height}px !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      `;

      // Create cross-out effect
      console.log('[OverlayManager] Creating cross-out effect');
    const crossOut = GraffitiCrossOut.createCrossOut(config.targetElement);
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
    btcPrice.style.cssText = `
      color: #FF6B00 !important;
      background: transparent !important;
      padding: 0 8px !important;
      border-radius: 4px !important;
      font-weight: bold !important;
      font-family: 'Permanent Marker', 'Rock Salt', cursive, sans-serif !important;
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
      const rect = config.targetElement.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      
      // Update cross-out effect
      GraffitiCrossOut.updateCrossOut(config.targetElement, crossOut);
    });
    observer.observe(config.targetElement);

    // Add scroll listener
    const scrollListener = () => {
      const rect = config.targetElement.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
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
    this.state.overlays.forEach((overlay) => {
      overlay.observer.disconnect();
      overlay.element.remove();
    });
    this.state.overlays.clear();
  }
} 