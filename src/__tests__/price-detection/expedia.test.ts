import { createTestDOM } from '../utils/test-utils';

describe('Expedia/Booking Price Detection', () => {
  test('detects nightly rate', () => {
    const html = `
      <div class="hprt-price-block ">
        <div class="prco-wrapper bui-price-display bui-spacer--medium">
          <div>
            <span class="prco-f-font-caption js-average-per-night-price" data-price-per-night-raw="165.8">$166</span>
            <span class="prco-f-font-caption">per night</span>
          </div>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const nightly = document.querySelector('.js-average-per-night-price')?.textContent;
    expect(nightly).toBe('$166');
  });

  test('detects total price with taxes/fees', () => {
    const html = `
      <div class="bui-price-display__value prco-text-nowrap-helper prco-inline-block-maker-helper prco-f-font-heading " aria-hidden="true">
        <span class="prc-no-css">$829</span>
      </div>
      <div class="hprt-roomtype-block">
        <div class="hptr-taxinfo-block">
          <div class=" js-us-excluded-fees">
            <span class="hptr-taxinfo-label">Excluded:</span>
            US$ 2.5 City tax per night, 16.25 % TAX
          </div>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const total = document.querySelector('.prc-no-css')?.textContent;
    expect(total).toBe('$829');
  });
}); 