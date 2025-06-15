import { createTestDOM } from '../utils/test-utils';

describe('Shop.app Price Detection', () => {
  test('detects main price', () => {
    const html = `
      <div data-testid="product-card-price"><span class="flex flex-row gap-space-4 text-text font-bodyTitleLarge text-bodyTitleLarge"><span class="false" data-testid="regularPrice">$14.00</span></span></div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('[data-testid="regularPrice"]')?.textContent;
    expect(price).toBe('$14.00');
  });

  test('detects price after variant switch', () => {
    const html = `
      <div class="flex flex-col gap-space-16"><span class="rc-prices-currentprice typography-label"><span class="as-pricepoint-fullprice">$100.00</span></span></div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.as-pricepoint-fullprice')?.textContent;
    expect(price).toBe('$100.00');
  });
}); 