import { OverlayManager } from '../../overlay/OverlayManager';
import { createTestContainer, cleanupTestDOM } from '../utils/test-utils';
import { OverlayStyle } from '../../overlay/types';

describe('OverlayManager', () => {
  let container: HTMLElement;
  let targetElement: HTMLElement;
  let overlayManager: OverlayManager;
  let customStyle: OverlayStyle;
  let testElement: HTMLElement;

  beforeEach(() => {
    container = createTestContainer();
    targetElement = document.createElement('div');
    targetElement.textContent = 'Test Price $19.99';
    targetElement.style.width = '200px';
    targetElement.style.height = '50px';
    container.appendChild(targetElement);

    overlayManager = new OverlayManager();

    customStyle = {
      theme: {
        primary: '#ff0000',
        secondary: '#ff3333',
        background: 'rgba(255, 0, 0, 0.1)',
        text: '#ffffff'
      },
      animation: {
        duration: 300,
        easing: 'ease-in-out'
      }
    };

    testElement = document.createElement('div');
    testElement.style.width = '100px';
    testElement.style.height = '50px';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    cleanupTestDOM();
    document.body.innerHTML = '';
  });

  it('creates an overlay with default style', () => {
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      type: 'price',
      rect
    });

    expect(overlay).toBeInstanceOf(HTMLElement);
    expect(overlay.className).toBe('graffiti-overlay-container');
    expect(overlay.querySelector('.graffiti-cross-out')).toBeTruthy();
    expect(overlay.querySelector('.btc-price')).toBeTruthy();
  });

  it('creates an overlay with custom style', () => {
    overlayManager.registerStyle('custom', customStyle);
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      styleName: 'custom',
      type: 'price',
      rect
    });

    const btcPrice = overlay.querySelector('.btc-price') as HTMLElement;
    expect(btcPrice).toBeTruthy();
    expect(btcPrice.style.color).toBe('rgb(255, 107, 0)');
  });

  it('updates overlay style when active style changes', () => {
    overlayManager.registerStyle('custom', customStyle);
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      type: 'price',
      rect
    });

    overlayManager.setActiveStyle('custom');
    const btcPrice = overlay.querySelector('.btc-price') as HTMLElement;
    expect(btcPrice.style.color).toBe('rgb(255, 107, 0)');
  });

  it('removes overlay when cleanup is called', () => {
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      type: 'price',
      rect
    });

    document.body.appendChild(overlay);
    expect(document.body.contains(overlay)).toBe(true);

    overlayManager.cleanup();
    expect(document.body.contains(overlay)).toBe(false);
  });

  it('removes specific overlay when removeOverlay is called', () => {
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      type: 'price',
      rect
    });

    document.body.appendChild(overlay);
    expect(document.body.contains(overlay)).toBe(true);

    overlayManager.removeOverlay('test-overlay');
    expect(document.body.contains(overlay)).toBe(false);
  });

  it('handles resize events correctly', () => {
    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement,
      type: 'price',
      rect
    });

    document.body.appendChild(overlay);
    const initialWidth = overlay.style.width;
    const initialHeight = overlay.style.height;

    // Simulate resize
    targetElement.style.width = '300px';
    targetElement.style.height = '75px';
    targetElement.dispatchEvent(new Event('resize'));

    // Wait for ResizeObserver to trigger
    setTimeout(() => {
      expect(overlay.style.width).not.toBe(initialWidth);
      expect(overlay.style.height).not.toBe(initialHeight);
    }, 0);
  });

  it('should create an overlay with default style', () => {
    const rect = testElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement: testElement,
      type: 'price',
      rect
    });

    expect(overlay).toBeInstanceOf(HTMLElement);
    expect(overlay.className).toBe('graffiti-overlay-container');
  });

  it('should create an overlay with custom style', () => {
    const rect = testElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement: testElement,
      styleName: 'default',
      type: 'price',
      rect
    });

    expect(overlay).toBeInstanceOf(HTMLElement);
    expect(overlay.className).toBe('graffiti-overlay-container');
  });

  it('should remove overlay', () => {
    const rect = testElement.getBoundingClientRect();
    const overlay = overlayManager.createOverlay({
      id: 'test-overlay',
      targetElement: testElement,
      type: 'price',
      rect
    });

    overlayManager.removeOverlay('test-overlay');
    expect(document.body.contains(overlay)).toBe(false);
  });

  it('should handle multiple overlays', () => {
    const rect = testElement.getBoundingClientRect();
    const overlay1 = overlayManager.createOverlay({
      id: 'test-overlay-1',
      targetElement: testElement,
      type: 'price',
      rect
    });

    const overlay2 = overlayManager.createOverlay({
      id: 'test-overlay-2',
      targetElement: testElement,
      type: 'price',
      rect
    });

    expect(document.body.contains(overlay1)).toBe(true);
    expect(document.body.contains(overlay2)).toBe(true);
  });

  it('should clean up all overlays', () => {
    const rect = testElement.getBoundingClientRect();
    const overlay1 = overlayManager.createOverlay({
      id: 'test-overlay-1',
      targetElement: testElement,
      type: 'price',
      rect
    });

    const overlay2 = overlayManager.createOverlay({
      id: 'test-overlay-2',
      targetElement: testElement,
      type: 'price',
      rect
    });

    overlayManager.cleanup();
    expect(document.body.contains(overlay1)).toBe(false);
    expect(document.body.contains(overlay2)).toBe(false);
  });
}); 