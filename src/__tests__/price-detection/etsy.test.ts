import { createTestDOM } from '../utils/test-utils';

describe('Etsy Price Detection', () => {
  test('detects price range with plus', () => {
    const html = `
      <div class="wt-display-flex-xs wt-align-items-center wt-flex-wrap appears-ready" data-selector="price-only" data-buy-box-region="price">
        <p class="wt-text-title-larger wt-mr-xs-1 wt-text-slime">
          <span class="wt-screen-reader-only">Price:</span>
          $56.00+
        </p>
        <p class="wt-text-caption wt-text-gray">
          <span class="wt-screen-reader-only">Original Price:</span>
          <span class="wt-text-strikethrough">$140.00+</span>
        </p>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.wt-text-title-larger')?.textContent?.trim();
    const original = document.querySelector('.wt-text-strikethrough')?.textContent;
    expect(price).toContain('$56.00+');
    expect(original).toBe('$140.00+');
  });

  test('detects variant-driven price', () => {
    const html = `
      <div class="wt-display-flex-xs wt-align-items-center wt-flex-wrap appears-ready" data-selector="price-only" data-buy-box-region="price">
        <p class="wt-text-title-larger wt-mr-xs-1 wt-text-slime">
          <span class="wt-screen-reader-only">Price:</span>
          $64.00
        </p>
        <p class="wt-text-caption wt-text-gray">
          <span class="wt-screen-reader-only">Original Price:</span>
          <span class="wt-text-strikethrough">$160.00</span>
        </p>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.wt-text-title-larger')?.textContent?.trim();
    const original = document.querySelector('.wt-text-strikethrough')?.textContent;
    expect(price).toContain('$64.00');
    expect(original).toBe('$160.00');
  });
}); 