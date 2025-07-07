import { CrossOutRenderers, CrossOutOptions } from '../../overlay/cross-out-renderers';
import { Style } from '../../data/types';

describe('CrossOutRenderers', () => {
  let mockStyle: Style;

  beforeEach(() => {
    mockStyle = {
      id: 'test-style',
      name: 'test',
      font_family: 'Arial',
      premium: false,
      created_at: '2025-01-01'
    };
  });

  describe('renderDoubleXCrossOut', () => {
    it('should generate correct SVG for spray-paint style', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: {
          ...mockStyle,
          name: 'spray-paint',
          meta: {
            layer_1_color: '#000000',
            layer_1_weight: 2,
            layer_2_color: '#ff7f00',
            layer_2_weight: 3,
            layer_2_opacity: 0.8
          }
        }
      };

      const result = CrossOutRenderers.renderDoubleXCrossOut(options);

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.className).toBe('graffiti-cross-out-double-x');
      
      const svg = result.querySelector('svg');
      expect(svg).toBeTruthy();
      
      const lines = svg?.querySelectorAll('line');
      expect(lines).toHaveLength(4); // 2 layers × 2 lines each
      
      // Check first layer (black) - no opacity attribute set (defaults to 1.0)
      expect(lines?.[0].getAttribute('stroke')).toBe('#000000');
      expect(lines?.[0].getAttribute('stroke-width')).toBe('2');
      expect(lines?.[0].getAttribute('opacity')).toBeNull(); // No opacity attribute set
      
      // Check second layer (orange)
      expect(lines?.[2].getAttribute('stroke')).toBe('#ff7f00');
      expect(lines?.[2].getAttribute('stroke-width')).toBe('3');
      expect(lines?.[2].getAttribute('opacity')).toBe('0.8');
    });

    it('should use default values when meta is missing', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: {
          ...mockStyle,
          name: 'spray-paint'
        }
      };

      const result = CrossOutRenderers.renderDoubleXCrossOut(options);
      const svg = result.querySelector('svg');
      const lines = svg?.querySelectorAll('line');
      
      // Should use defaults
      expect(lines?.[0].getAttribute('stroke')).toBe('#000000');
      expect(lines?.[0].getAttribute('stroke-width')).toBe('2');
      expect(lines?.[2].getAttribute('stroke')).toBe('#ff7f00');
      expect(lines?.[2].getAttribute('stroke-width')).toBe('3');
      expect(lines?.[2].getAttribute('opacity')).toBe('0.8');
    });

    it('should handle different element sizes', () => {
      const smallOptions: CrossOutOptions = {
        width: 50,
        height: 20,
        style: { ...mockStyle, name: 'spray-paint' }
      };

      const largeOptions: CrossOutOptions = {
        width: 200,
        height: 100,
        style: { ...mockStyle, name: 'spray-paint' }
      };

      const smallResult = CrossOutRenderers.renderDoubleXCrossOut(smallOptions);
      const largeResult = CrossOutRenderers.renderDoubleXCrossOut(largeOptions);

      const smallSvg = smallResult.querySelector('svg');
      const largeSvg = largeResult.querySelector('svg');

      expect(smallSvg?.getAttribute('width')).toBe('50');
      expect(smallSvg?.getAttribute('height')).toBe('20');
      expect(largeSvg?.getAttribute('width')).toBe('200');
      expect(largeSvg?.getAttribute('height')).toBe('100');
    });
  });

  describe('renderMarkerStrokeCrossOut', () => {
    it('should generate correct SVG for marker style', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: {
          ...mockStyle,
          name: 'marker',
          meta: {
            color: '#ff0000',
            stroke_width: 3
          }
        }
      };

      const result = CrossOutRenderers.renderMarkerStrokeCrossOut(options);

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.className).toBe('graffiti-cross-out-marker');
      
      const svg = result.querySelector('svg');
      expect(svg).toBeTruthy();
      
      const path = svg?.querySelector('path');
      expect(path).toBeTruthy();
      expect(path?.getAttribute('stroke')).toBe('#ff0000');
      expect(path?.getAttribute('stroke-width')).toBe('3');
      expect(path?.getAttribute('fill')).toBe('none');
      expect(path?.getAttribute('stroke-linecap')).toBe('round');
    });

    it('should use default values when meta is missing', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: {
          ...mockStyle,
          name: 'marker'
        }
      };

      const result = CrossOutRenderers.renderMarkerStrokeCrossOut(options);
      const svg = result.querySelector('svg');
      const path = svg?.querySelector('path');
      
      expect(path?.getAttribute('stroke')).toBe('#ff0000');
      expect(path?.getAttribute('stroke-width')).toBe('3');
    });

    it('should create curved path for marker stroke', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: { ...mockStyle, name: 'marker' }
      };

      const result = CrossOutRenderers.renderMarkerStrokeCrossOut(options);
      const svg = result.querySelector('svg');
      const path = svg?.querySelector('path');
      
      const pathData = path?.getAttribute('d');
      expect(pathData).toContain('M'); // Move command
      expect(pathData).toContain('Q'); // Quadratic curve command
    });
  });

  describe('updateCrossOut', () => {
    it('should update double X cross-out for resized elements', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: { ...mockStyle, name: 'spray-paint' }
      };

      const crossOut = CrossOutRenderers.renderDoubleXCrossOut(options);
      const mockTargetElement = document.createElement('div');
      
      // Mock getBoundingClientRect
      Object.defineProperty(mockTargetElement, 'getBoundingClientRect', {
        value: () => ({ width: 150, height: 75 })
      });

      CrossOutRenderers.updateCrossOut(mockTargetElement, crossOut);
      
      const svg = crossOut.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('150');
      expect(svg?.getAttribute('height')).toBe('75');
    });

    it('should update marker stroke for resized elements', () => {
      const options: CrossOutOptions = {
        width: 100,
        height: 50,
        style: { ...mockStyle, name: 'marker' }
      };

      const crossOut = CrossOutRenderers.renderMarkerStrokeCrossOut(options);
      const mockTargetElement = document.createElement('div');
      
      // Mock getBoundingClientRect
      Object.defineProperty(mockTargetElement, 'getBoundingClientRect', {
        value: () => ({ width: 150, height: 75 })
      });

      CrossOutRenderers.updateCrossOut(mockTargetElement, crossOut);
      
      const svg = crossOut.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('150');
      expect(svg?.getAttribute('height')).toBe('75');
    });
  });
}); 