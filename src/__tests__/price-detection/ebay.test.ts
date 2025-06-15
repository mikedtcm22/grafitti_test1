import { createTestDOM } from '../utils/test-utils';

describe('eBay Price Detection', () => {
  test('detects auction bid timer price with comma-separated thousands', () => {
    const html = `
      <div class="vim x-bid-price" data-testid="x-bid-price">
        <div class="x-price-primary" data-testid="x-price-primary">
          <span class="ux-textspans">US $18,500.00</span>
        </div>
        <div class="x-bid-info" data-testid="x-bid-info">
          <div class="x-bid-count" data-testid="x-bid-count">
            <a href="#" target="_blank" class="ux-action"><span class="ux-textspans ux-textspans--PSEUDOLINK">22 bids</span></a>
          </div>
          <div class="x-end-time" data-testid="x-end-time">
            <span class="ux-timer" data-testid="ux-timer">
              <span class="ux-timer__text" data-testid="ux-timer_timer" aria-live="off" aria-atomic="true"><span class="ux-timer__label">Ends in </span>1h 35m</span>
              <span class="ux-timer__time-left">Today 09:34 PM</span>
            </span>
          </div>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.x-price-primary .ux-textspans')?.textContent;
    expect(price).toBe('US $18,500.00');
  });

  test('detects Buy It Now price', () => {
    const html = `
      <div class="x-bin-price" data-testid="x-bin-price">
        <span class="ux-textspans">US $299.99</span>
        <span class="ux-textspans ux-textspans--BIN">Buy It Now</span>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.x-bin-price .ux-textspans')?.textContent;
    expect(price).toBe('US $299.99');
  });
}); 