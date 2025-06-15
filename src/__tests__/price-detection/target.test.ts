import { createTestDOM } from '../utils/test-utils';

describe('Target Price Detection', () => {
  test('detects main price on React-driven page', () => {
    const html = `
      <div data-module-type="ProductDetailPrice"><div class="h-margin-a-module-gap" style="max-width: 480px;"><div class="sc-44e8b7a0-0 jEdQOF sc-f1b5c60b-1 jgWhOI" data-test="@web/Price/PriceFull"><div><span><span data-test="product-price" class="sc-44e8b7a0-1 LjEZN">$349.00</span></span></div></div></div></div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('[data-test="product-price"]')?.textContent;
    expect(price).toBe('$349.00');
  });
}); 