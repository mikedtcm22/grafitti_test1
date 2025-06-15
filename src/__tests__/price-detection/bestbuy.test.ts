import { createTestDOM } from '../utils/test-utils';

describe('BestBuy Price Detection', () => {
  test('detects multiple prices in one card', () => {
    const html = `
      <div id="pricing-price-99165304" class="_none">
        <div class="pricing-price">
          <div class="priceView-hero-price priceView-customer-price" data-testid="customer-price" tabindex="-1">
            <span aria-hidden="true">$3,099.99</span>
            <span class="sr-only">Your price for this item is $3,099.99</span>
          </div>
          <div data-testid="savings-regular-price" class="pricing-price__savings-regular-price">
            <div data-testid="savings" class="pricing-price__savings pricing-price__savings--promo-red">Save $1,400</div>
            <div class="pricing-price__regular-price-content--block pricing-price__regular-price-content--block-mt">
              <div class="pricing-price__regular-price" data-testid="regular-price"><span aria-hidden="true">Comp. Value: $4,499.99</span></div>
            </div>
          </div>
          <div data-testid="suggested-monthly-payments">
            <div class="total-cost-clarity-content__monthly-payment"><strong>$129.17</strong><span>/mo.<span aria-hidden="true">*</span></span></div>
          </div>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const mainPrice = document.querySelector('[data-testid="customer-price"] span[aria-hidden="true"]')?.textContent;
    const compPrice = document.querySelector('[data-testid="regular-price"] span[aria-hidden="true"]')?.textContent;
    const monthly = document.querySelector('.total-cost-clarity-content__monthly-payment strong')?.textContent;
    expect(mainPrice).toBe('$3,099.99');
    expect(compPrice).toContain('$4,499.99');
    expect(monthly).toBe('$129.17');
  });

  test('detects open-box prices', () => {
    const html = `
      <div class="pdp-openBox-condition-tiles flex gap-100">
        <div class="c-tile border rounded v-base condition-tile available unselected text-center">
          <button class="c-button-unstyled py-150 px-200 w-full" type="button" aria-label="Excellent">
            <div id="open-box-single-customer-price" data-testid="open-box-single-customer-price" class="single-condition-tile-price">$330.99</div>
          </button>
        </div>
        <div class="c-tile border rounded v-base condition-tile available unselected text-center">
          <button class="c-button-unstyled py-150 px-200 w-full" type="button" aria-label="Good">
            <div id="open-box-single-customer-price" data-testid="open-box-single-customer-price" class="single-condition-tile-price">$319.99</div>
          </button>
        </div>
        <div class="c-tile border rounded v-base condition-tile available selected text-center border-selected">
          <button class="c-button-unstyled py-150 px-200 w-full" type="button" aria-label="Fair selected">
            <div id="open-box-single-customer-price" data-testid="open-box-single-customer-price" class="single-condition-tile-price">$309.99</div>
          </button>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const prices = Array.from(document.querySelectorAll('.single-condition-tile-price')).map(e => e.textContent);
    expect(prices).toContain('$330.99');
    expect(prices).toContain('$319.99');
    expect(prices).toContain('$309.99');
  });
}); 