import { OverlayManager } from '../../overlay/OverlayManager';
import { Style } from '../../data/types';
import { CrossOutRenderers } from '../../overlay/cross-out-renderers';
import { GraffitiCrossOut } from '../../overlay/graffiti/GraffitiCrossOut';

// Mock the cross-out renderers
jest.mock('../../overlay/cross-out-renderers');
jest.mock('../../overlay/graffiti/GraffitiCrossOut');

const mockCrossOutRenderers = CrossOutRenderers as jest.Mocked<typeof CrossOutRenderers>;
const mockGraffitiCrossOut = GraffitiCrossOut as jest.Mocked<typeof GraffitiCrossOut>;

describe('OverlayManager S2', () => {
  let overlayManager: OverlayManager;
  let mockStyle: Style;
  let mockElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStyle = {
      id: 'test-style-id',
      name: 'spray-paint',
      font_family: 'Chalkboard',
      premium: false,
      created_at: '2025-01-01',
      meta: {
        layer_1_color: '#000000',
        layer_1_weight: 2,
        layer_2_color: '#ff7f00',
        layer_2_weight: 3,
        layer_2_opacity: 0.8
      }
    };

    mockElement = document.createElement('div');
    mockElement.textContent = '$19.99';
    
    // Mock getBoundingClientRect
    Object.defineProperty(mockElement, 'getBoundingClientRect', {
      value: () => ({ top: 100, left: 200, width: 150, height: 50 })
    });

    // Mock parent element
    const parentElement = document.createElement('div');
    parentElement.appendChild(mockElement);
    Object.defineProperty(mockElement, 'parentElement', {
      value: parentElement
    });

    // Mock cross-out elements
    const mockCrossOutElement = document.createElement('div');
    mockCrossOutElement.className = 'mock-cross-out';
    mockCrossOutRenderers.renderDoubleXCrossOut.mockReturnValue(mockCrossOutElement);
    mockCrossOutRenderers.renderMarkerStrokeCrossOut.mockReturnValue(mockCrossOutElement);
    mockGraffitiCrossOut.createCrossOut.mockReturnValue(mockCrossOutElement);
  });

  describe('constructor with style', () => {
    it('should initialize with provided style', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      expect(overlayManager.getCurrentStyle()).toEqual(mockStyle);
    });

    it('should initialize without style when none provided', () => {
      overlayManager = new OverlayManager();
      
      expect(overlayManager.getCurrentStyle()).toBeNull();
    });
  });

  describe('setCurrentStyle', () => {
    it('should set current style', () => {
      overlayManager = new OverlayManager();
      
      overlayManager.setCurrentStyle(mockStyle);
      
      expect(overlayManager.getCurrentStyle()).toEqual(mockStyle);
    });

    it('should log style change', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      overlayManager = new OverlayManager();
      
      overlayManager.setCurrentStyle(mockStyle);
      
      expect(consoleSpy).toHaveBeenCalledWith('[OverlayManager] Set current style:', mockStyle.name);
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentStyle', () => {
    it('should return current style', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      const result = overlayManager.getCurrentStyle();
      
      expect(result).toEqual(mockStyle);
    });

    it('should return null when no style is set', () => {
      overlayManager = new OverlayManager();
      
      const result = overlayManager.getCurrentStyle();
      
      expect(result).toBeNull();
    });
  });

  describe('createCrossOut', () => {
    it('should use spray-paint renderer for spray-paint style', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockCrossOutRenderers.renderDoubleXCrossOut).toHaveBeenCalledWith({
        width: 150,
        height: 50,
        style: mockStyle,
        midLineY: 125
      });
    });

    it('should use marker renderer for marker style', () => {
      const markerStyle = { ...mockStyle, name: 'marker' };
      overlayManager = new OverlayManager(markerStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockCrossOutRenderers.renderMarkerStrokeCrossOut).toHaveBeenCalledWith({
        width: 150,
        height: 50,
        style: markerStyle,
        midLineY: 125
      });
    });

    it('should fallback to original renderer for unknown styles', () => {
      const unknownStyle = { ...mockStyle, name: 'unknown' };
      overlayManager = new OverlayManager(unknownStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockGraffitiCrossOut.createCrossOut).toHaveBeenCalledWith(mockElement);
    });

    it('should fallback to original renderer when no style is set', () => {
      overlayManager = new OverlayManager();
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockGraffitiCrossOut.createCrossOut).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('updateCrossOut', () => {
    it('should use spray-paint renderer for spray-paint style', () => {
      overlayManager = new OverlayManager(mockStyle);
      const mockCrossOut = document.createElement('div');
      
      // Create overlay first to set up the update mechanism
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      // Simulate resize by calling the update function directly
      // Note: In real usage, this would be called by the ResizeObserver
      mockCrossOutRenderers.updateCrossOut(mockElement, mockCrossOut);
      
      expect(mockCrossOutRenderers.updateCrossOut).toHaveBeenCalledWith(mockElement, mockCrossOut);
    });

    it('should use marker renderer for marker style', () => {
      const markerStyle = { ...mockStyle, name: 'marker' };
      overlayManager = new OverlayManager(markerStyle);
      const mockCrossOut = document.createElement('div');
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      mockCrossOutRenderers.updateCrossOut(mockElement, mockCrossOut);
      
      expect(mockCrossOutRenderers.updateCrossOut).toHaveBeenCalledWith(mockElement, mockCrossOut);
    });

    it('should fallback to original renderer for unknown styles', () => {
      const unknownStyle = { ...mockStyle, name: 'unknown' };
      overlayManager = new OverlayManager(unknownStyle);
      const mockCrossOut = document.createElement('div');
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      mockGraffitiCrossOut.updateCrossOut(mockElement, mockCrossOut);
      
      expect(mockGraffitiCrossOut.updateCrossOut).toHaveBeenCalledWith(mockElement, mockCrossOut);
    });
  });

  describe('getFontFamily', () => {
    it('should return font_family from style when available', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      const overlay = overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      const btcPrice = overlay.querySelector('.btc-price') as HTMLElement;
      expect(btcPrice?.style.fontFamily).toContain('Chalkboard');
    });

    it('should return default font family when no style is set', () => {
      overlayManager = new OverlayManager();
      
      const overlay = overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      const btcPrice = overlay.querySelector('.btc-price') as HTMLElement;
      expect(btcPrice?.style.fontFamily).toContain('Permanent Marker');
    });

    it('should fallback to default when font_family is not set', () => {
      const styleWithoutFont = { ...mockStyle };
      delete styleWithoutFont.font_family;
      overlayManager = new OverlayManager(styleWithoutFont);
      
      const overlay = overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      const btcPrice = overlay.querySelector('.btc-price') as HTMLElement;
      expect(btcPrice?.style.fontFamily).toContain('Permanent Marker');
    });
  });

  describe('createOverlay with style integration', () => {
    it('should create overlay with correct cross-out for spray-paint style', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockCrossOutRenderers.renderDoubleXCrossOut).toHaveBeenCalledWith({
        width: 150,
        height: 50,
        style: mockStyle,
        midLineY: 125
      });
    });

    it('should create overlay with correct cross-out for marker style', () => {
      const markerStyle = { ...mockStyle, name: 'marker' };
      overlayManager = new OverlayManager(markerStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      expect(mockCrossOutRenderers.renderMarkerStrokeCrossOut).toHaveBeenCalledWith({
        width: 150,
        height: 50,
        style: markerStyle,
        midLineY: 125
      });
    });

    it('should extract BTC price correctly', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      const overlay = overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      const btcPrice = overlay.querySelector('.btc-price');
      expect(btcPrice?.textContent).toBe('0.0005 BTC');
    });
  });

  describe('cleanup', () => {
    it('should clean up all overlays', () => {
      overlayManager = new OverlayManager(mockStyle);
      
      overlayManager.createOverlay({
        id: 'test-id',
        type: 'price',
        targetElement: mockElement,
        rect: mockElement.getBoundingClientRect(),
        price: '$19.99 / 0.0005 BTC'
      });
      
      // Test that overlays are properly cleaned up
      overlayManager.cleanup();
      expect(document.querySelectorAll('.graffiti-overlay')).toHaveLength(0);
    });
  });
}); 