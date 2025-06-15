import { SprayPaintTextureGenerator } from '../../../../src/overlay/graffiti/SprayPaintEffect';

describe('SprayPaintTextureGenerator', () => {
  beforeEach(() => {
    // Clean up any existing elements
    const elements = document.querySelectorAll('.spray-paint-effect');
    elements.forEach(el => el.remove());
  });

  afterEach(() => {
    // Clean up any added elements
    const elements = document.querySelectorAll('.spray-paint-effect');
    elements.forEach(el => el.remove());
  });

  it('creates a spray paint effect with default options', () => {
    const effect = SprayPaintTextureGenerator.createSprayPaintEffect(100, 100);
    expect(effect).toBeDefined();
    expect(effect.texture).toBeInstanceOf(SVGElement);
    expect(effect.opacity).toBe(0.8);
    expect(effect.spread).toBe(0.5);
    expect(effect.drips.length).toBeGreaterThan(0);
    expect(effect.splatter.length).toBeGreaterThan(0);
  });

  it('creates a spray paint effect with custom options', () => {
    const customColor = '#FF0000';
    const customOpacity = 0.9;
    const customSpread = 0.7;

    const effect = SprayPaintTextureGenerator.createSprayPaintEffect(100, 100, {
      color: customColor,
      opacity: customOpacity,
      spread: customSpread
    });

    expect(effect.opacity).toBe(customOpacity);
    expect(effect.spread).toBe(customSpread);
  });

  it('generates unique effects for each call', () => {
    const effect1 = SprayPaintTextureGenerator.createSprayPaintEffect(100, 100);
    const effect2 = SprayPaintTextureGenerator.createSprayPaintEffect(100, 100);

    // Check that the SVG content is different
    expect(effect1.texture.innerHTML).not.toBe(effect2.texture.innerHTML);
  });

  it('creates effects with valid SVG structure', () => {
    const effect = SprayPaintTextureGenerator.createSprayPaintEffect(100, 100);
    
    // Check for required SVG elements
    expect(effect.texture.querySelector('filter')).toBeTruthy();
    expect(effect.texture.querySelector('rect')).toBeTruthy();
    expect(effect.texture.querySelector('path')).toBeTruthy();
    expect(effect.texture.querySelector('circle')).toBeTruthy();
  });

  it('handles different dimensions correctly', () => {
    const width = 200;
    const height = 150;
    const effect = SprayPaintTextureGenerator.createSprayPaintEffect(width, height);

    expect(effect.texture.getAttribute('width')).toBe(width.toString());
    expect(effect.texture.getAttribute('height')).toBe(height.toString());
  });
}); 