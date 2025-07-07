import { createTestDOMDocument } from '../utils/test-utils';
import fs from 'fs';
import path from 'path';
import { OverlayManager } from '../../overlay/OverlayManager';
import { getVisiblePriceRect } from '../../overlay/position-utils';

// Helper to extract HTML from markdown fixture
function extractHtmlFromMarkdown(md: string): string {
  const match = md.match(/```html([\s\S]*?)```/);
  return match ? match[1].trim() : '';
}

// Helper to extract bounding rect from markdown fixture
function extractBoundingRectFromMarkdown(md: string): any {
  const match = md.match(/### Raw Bounding Rect \(JSON\):\n```json\n([\s\S]*?)```/);
  return match ? JSON.parse(match[1]) : null;
}

// Helper to extract computed CSS from markdown fixture
function extractCssFromMarkdown(md: string): any {
  const match = md.match(/### Raw Metrics \(JSON\):\n```json\n([\s\S]*?)```/);
  return match ? JSON.parse(match[1]) : null;
}

// List of fixture files
const FIXTURES = [
  {
    name: 'Amazon',
    before: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/amazon-echoDot-mainPrice-before.md'),
    after: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/amazon-echoDot-mainPrice-after.md'),
  },
  {
    name: 'eBay',
    before: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/ebay-rolex-auctionPrice-before.md'),
    after: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/ebay-rolex-auctionPrice-after.md'),
  },
  {
    name: 'Walmart',
    before: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/walmart-listElement-before.md'),
    after: path.resolve(__dirname, '../../../../test/fixtures/dom-metrics/walmart-listElement-after.md'),
  },
];

describe('Overlay Centering Integration (Real-World Fixtures)', () => {
  FIXTURES.forEach(({ name, before }) => {
    it(`[${name}] getVisiblePriceRect returns accurate mid-line for centering`, () => {
      const md = fs.readFileSync(before, 'utf-8');
      const html = extractHtmlFromMarkdown(md);
      const boundingRect = extractBoundingRectFromMarkdown(md);
      const css = extractCssFromMarkdown(md);
      expect(html).toBeTruthy();
      expect(boundingRect).toBeTruthy();
      expect(css).toBeTruthy();

      // Create test DOM
      const document = createTestDOMDocument(`<div id="fixture-root">${html}</div>`);
      const priceElement = document.querySelector('span, div, a, h3');
      expect(priceElement).toBeTruthy();

      // Simulate overlay rendering
      const overlayManager = new OverlayManager();
      // Fake config for overlay
      const config = {
        id: 'test',
        targetElement: priceElement as HTMLElement,
        price: priceElement!.textContent || '',
        styleName: 'marker',
        type: 'price' as const,
        rect: priceElement!.getBoundingClientRect(),
      };
      // Render overlay
      const overlay = overlayManager.createOverlay(config);
      expect(overlay).toBeTruthy();

      // Measure centering
      const { rect, midLineY } = getVisiblePriceRect(priceElement as HTMLElement);
      // Find the cross-out SVG or element
      const crossOut = overlay.querySelector('.graffiti-cross-out-double-x, .graffiti-marker-overlay');
      expect(crossOut).toBeTruthy();
      // For now, just log the rect and midLineY for manual review
      // TODO: Use pixel-diff utility for automated check
      console.log(`[${name}] rect:`, rect, 'midLineY:', midLineY);
      // Placeholder: check that midLineY is within ±2px of rect.height/2
      const expectedCenter = rect.top + rect.height / 2;
      const error = Math.abs(midLineY - expectedCenter);
      expect(error).toBeLessThanOrEqual(2);
    });
  });
}); 