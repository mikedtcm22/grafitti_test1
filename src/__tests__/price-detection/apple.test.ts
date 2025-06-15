import { createTestDOM } from '../utils/test-utils';

describe('Apple Store Price Detection', () => {
  test('detects lump-sum price', () => {
    const html = `
      <div class="rf-digitalmat-price">
        <span class="as-pricepoint-fullprice">From <span class="nowrap">$399</span></span>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.as-pricepoint-fullprice .nowrap')?.textContent;
    expect(price).toBe('$399');
  });

  test('detects monthly payment price', () => {
    const html = `
      <div class="rc-monthly-price">
        <span class="as-pricepoint-installmentprice">$33.25<span aria-hidden="true">/mo.</span></span>
      </div>
    `;
    const document = createTestDOM(html);
    const monthly = document.querySelector('.as-pricepoint-installmentprice')?.textContent;
    expect(monthly).toContain('$33.25');
  });
}); 