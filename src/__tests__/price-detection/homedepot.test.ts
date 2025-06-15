import { createTestDOM } from '../utils/test-utils';

describe('HomeDepot Price Detection', () => {
  test('detects unit price per sqft', () => {
    const html = `
      <div class="sui-flex sui-flex-row sui-leading-none">
        <span class="sui-text-3xl sui-font-display sui-leading-none">$</span>
        <span class="sui-font-display sui-leading-none sui-text-9xl sui--translate-y-[0.5rem] sui-px-[2px]">3</span>
        <span class="sui-sr-only">.</span>
        <span class="sui-font-display sui-leading-none sui-text-3xl">04</span>
        <div class="sui-ml-2"><span class="sui-font-bold sui-text-base sui-leading-none"> /sq. ft. </span><div><span>($27.36 /square yard)</span></div></div>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.sui-font-display.sui-text-9xl')?.textContent;
    const unit = document.querySelector('.sui-font-bold.sui-text-base')?.textContent;
    expect(price).toBe('3');
    expect(unit).toContain('/sq. ft.');
  });

  test('detects cart/total price', () => {
    const html = `
      <div data-automation-id="orderSummary">
        <div class="sui-inline-flex sui-justify-self-end" data-automation-id="totalsSubTotal">
          <p class="sui-font-bold sui-text-base sui-tracking-normal sui-normal-case sui-line-clamp-unset sui-font-normal sui-text-primary">$1,053.98</p>
        </div>
        <div class="sui-inline-flex sui-justify-self-end" data-automation-id="totalsTotal">
          <h3 class="sui-h3-bold sui-line-clamp-unset sui-font-normal sui-text-primary">$1,053.98</h3>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const subtotal = document.querySelector('[data-automation-id="totalsSubTotal"] p')?.textContent;
    const total = document.querySelector('[data-automation-id="totalsTotal"] h3')?.textContent;
    expect(subtotal).toBe('$1,053.98');
    expect(total).toBe('$1,053.98');
  });
}); 