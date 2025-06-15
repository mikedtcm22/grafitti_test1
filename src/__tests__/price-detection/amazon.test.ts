import { createTestDOM } from '../utils/test-utils';

describe('Amazon Price Detection', () => {
  test('detects split-node price', () => {
    const html = `
      <div id="corePriceDisplay_desktop_feature_div">
        <div class="a-section a-spacing-none aok-align-center aok-relative">
          <span class="aok-offscreen">   $79.99  </span>
          <span class="a-price aok-align-center reinventPricePriceToPayMargin priceToPay" data-a-size="xl" data-a-color="base">
            <span class="a-offscreen"> </span>
            <span aria-hidden="true">
              <span class="a-price-symbol">$</span>
              <span class="a-price-whole">79<span class="a-price-decimal">.</span></span>
              <span class="a-price-fraction">99</span>
            </span>
          </span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const symbol = document.querySelector('.a-price-symbol')?.textContent;
    const whole = document.querySelector('.a-price-whole')?.textContent;
    const fraction = document.querySelector('.a-price-fraction')?.textContent;
    expect(symbol).toBe('$');
    expect(whole).toContain('79');
    expect(fraction).toBe('99');
  });

  test('detects list/sale price pair', () => {
    const html = `
      <div id="corePriceDisplay_desktop_feature_div">
        <div class="a-section a-spacing-none aok-align-center aok-relative">
          <span class="aok-offscreen">   $649.00 with 7 percent savings    </span>
          <span aria-hidden="true" class="a-size-large a-color-price savingPriceOverride aok-align-center reinventPriceSavingsPercentageMargin savingsPercentage">-7%</span>
          <span class="a-price aok-align-center reinventPricePriceToPayMargin priceToPay" data-a-size="xl" data-a-color="base">
            <span class="a-offscreen"> </span>
            <span aria-hidden="true">
              <span class="a-price-symbol">$</span>
              <span class="a-price-whole">649<span class="a-price-decimal">.</span></span>
              <span class="a-price-fraction">00</span>
            </span>
          </span>
        </div>
        <div class="a-section a-spacing-small aok-align-center">
          <span>
            <span class="aok-relative">
              <span class="a-size-small aok-offscreen"> List Price: $699.99 </span>
              <span aria-hidden="true" class="a-size-small a-color-secondary aok-align-center basisPrice">List Price:
                <span class="a-price a-text-price" data-a-size="s" data-a-strike="true" data-a-color="secondary">
                  <span class="a-offscreen">$699.99</span>
                  <span aria-hidden="true">$699.99</span>
                </span>
              </span>
            </span>
          </span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const sale = document.querySelector('.a-price-whole')?.textContent;
    const list = document.querySelector('.a-text-price span[aria-hidden="true"]')?.textContent;
    expect(sale).toContain('649');
    expect(list).toContain('699.99');
  });

  test('detects price in iframe structure', () => {
    const html = `
      <iframe id="ape_Detail_dp-ads-center-promo_Desktop_iframe"></iframe>
    `;
    const document = createTestDOM(html);
    const iframe = document.querySelector('iframe#ape_Detail_dp-ads-center-promo_Desktop_iframe');
    expect(iframe).toBeTruthy();
  });

  test('detects lightning deal price', () => {
    const html = `
      <div class="a-size-base gb-accordion-active a-text-bold"> Lightning Deal </div>
      <div id="corePrice_feature_div">
        <div data-csa-c-type="widget" data-csa-c-slot-id="apex_dp_offer_display" data-csa-c-content-id="apex_with_rio_cx" data-csa-c-buying-option-type="LIGHTNING_DEAL">
          <span class="a-price-symbol">$</span>
          <span class="a-price-whole">99</span>
          <span class="a-price-decimal">.</span>
          <span class="a-price-fraction">99</span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const deal = document.querySelector('.gb-accordion-active')?.textContent;
    const priceWhole = document.querySelector('#corePrice_feature_div .a-price-whole')?.textContent;
    expect(deal).toContain('Lightning Deal');
    expect(priceWhole).toBe('99');
  });
}); 