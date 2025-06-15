export type OverlayType = 'price' | 'fallback';
export type StyleVariant = 'default' | 'dark' | 'minimal';

export interface OverlayStyle {
  theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

export interface OverlayState {
  overlays: Map<string, {
    element: HTMLElement;
    observer: ResizeObserver;
    style: OverlayStyle;
    cleanup: () => void;
  }>;
  activeStyle: string;
}

export interface OverlayConfig {
  id: string;
  targetElement: HTMLElement;
  targetNode?: Node;
  btcPrice?: string;
  price?: string;
  styleName?: string;
  type: 'price' | 'fallback';
  position?: 'above' | 'below' | 'auto';
  style?: OverlayStyle;
  rect: DOMRect;
}

export interface SprayPaintEffect {
  texture: SVGElement;
  opacity: number;
  spread: number;
  color?: string;
  drips: Array<{
    path: string;
    opacity: number;
  }>;
  splatter: Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
  }>;
} 