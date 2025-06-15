import { GraffitiCrossOut } from '../../../overlay/graffiti/GraffitiCrossOut';

describe.skip('GraffitiCrossOut', () => {
  let targetElement: HTMLElement;

  beforeEach(() => {
    targetElement = document.createElement('div');
    targetElement.textContent = '$19.99';
    document.body.appendChild(targetElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a cross-out effect with correct structure', () => {
    const crossOut = GraffitiCrossOut.createCrossOut(targetElement);
    expect(crossOut).toBeInstanceOf(HTMLElement);
    expect(crossOut.className).toBe('graffiti-cross-out');
    expect(crossOut.querySelector('div')).toBeTruthy();
    expect(crossOut.querySelector('svg')).toBeTruthy();
  });

  it('applies correct styles to the cross-out effect', () => {
    const crossOut = GraffitiCrossOut.createCrossOut(targetElement);
    const lineContainer = crossOut.querySelector('div');
    expect(lineContainer).toBeInstanceOf(HTMLElement);
    if (lineContainer instanceof HTMLElement) {
      expect(lineContainer.style.transform).toContain('rotate');
      expect(lineContainer.style.borderTop).toContain('solid');
    }
  });

  it('adds animation keyframes to the document', () => {
    GraffitiCrossOut.createCrossOut(targetElement);
    const styleSheet = document.querySelector('style');
    expect(styleSheet).not.toBeNull();
    expect(styleSheet?.textContent).toContain('@keyframes');
  });

  it('updates the cross-out effect when element is resized', () => {
    const crossOut = GraffitiCrossOut.createCrossOut(targetElement);
    const initialSvg = crossOut.querySelector('svg');
    expect(initialSvg).not.toBeNull();
    
    // Resize the target element
    targetElement.style.width = '200px';
    targetElement.style.height = '50px';
    
    // Update the cross-out effect
    GraffitiCrossOut.updateCrossOut(targetElement, crossOut);
    
    const updatedSvg = crossOut.querySelector('svg');
    expect(updatedSvg).not.toBeNull();
    expect(updatedSvg).not.toBe(initialSvg);
  });
}); 