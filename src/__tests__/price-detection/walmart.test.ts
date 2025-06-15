import { createTestDOM } from '../utils/test-utils';
import { extractAllPricesFromSubtree } from '../../../graffiti-ext/src/priceUtils';

describe('Walmart Price Detection', () => {
  test('detects strikethrough/rollback price', () => {
    const html = `
      <div class="price-main">
        <div class="price-characteristic">
          <span class="visuallyhidden">Was </span>
          <span class="price-characteristic">$19.99</span>
        </div>
        <div class="price-characteristic">
          <span class="visuallyhidden">Now </span>
          <span class="price-characteristic">$14.99</span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const wasPrice = document.querySelector('.price-characteristic:first-child .price-characteristic')?.textContent;
    const nowPrice = document.querySelector('.price-characteristic:last-child .price-characteristic')?.textContent;
    expect(wasPrice).toBe('$19.99');
    expect(nowPrice).toBe('$14.99');
  });

  test('detects price per unit', () => {
    const html = `
      <div class="price-main">
        <div class="price-characteristic">
          <span class="price-characteristic">$4.99</span>
          <span class="price-unit">/lb</span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const price = document.querySelector('.price-characteristic:first-child .price-characteristic')?.textContent;
    const unit = document.querySelector('.price-unit')?.textContent;
    expect(price).toBe('$4.99');
    expect(unit).toBe('/lb');
  });

  test('detects bulk selector price', () => {
    const html = `
      <div class="price-main">
        <div class="price-characteristic">
          <span class="price-characteristic">$9.99</span>
          <span class="price-unit">each</span>
        </div>
        <div class="price-characteristic">
          <span class="price-characteristic">$8.99</span>
          <span class="price-unit">per 2</span>
        </div>
      </div>
    `;
    const document = createTestDOM(html);
    const singlePrice = document.querySelector('.price-characteristic:first-child .price-characteristic')?.textContent;
    const bulkPrice = document.querySelector('.price-characteristic:last-child .price-characteristic')?.textContent;
    expect(singlePrice).toBe('$9.99');
    expect(bulkPrice).toBe('$8.99');
  });

  test('detects only the price for the right-clicked list item (provided HTML)', () => {
    const html = `
      <div class="flex flex-column justify-center relative" data-testid="horizontal-scroller-Made for him" data-dca-type="module" data-dca-module-id="dd4159a7-501f-4f85-be0c-4239781dc77a">
        <ul data-testid="carousel-container" class="list ma0 pl0 overflow-x-scroll hidesb hidesb-wk relative overflow-y-hidden carousel-peek-2 carousel-6-l carousel-3-m pr3-m" style="display: grid; grid-auto-flow: column; scroll-snap-type: x mandatory; max-height: fit-content;">
          <li class="flex flex-column pa1 pr2 pb2 items-center" data-slide="0" style="scroll-snap-align: start;">
            <div role="group" data-item-id="62GSV85QD3TY" data-dca-catalog-id="62GSV85QD3TY" data-dca-item-id="455212536" class="sans-serif mid-gray relative flex flex-column w-100 h-100 hide-child-opacity" data-testid="product-tile-0" aria-label="Product">
              <a link-identifier="455212536" class="w-100 h-100 z-1 hide-sibling-opacity  absolute" target="" href="#" data-clicked="true"><span class="w_iUH7"><h3>Rooibos Vanilla | Madagascar Dream African Tea - Loose Leaf Tea (3.5 oz / 100 g)</h3></span></a>
              <div class="h2 relative mv2"></div>
              <div class="relative">
                <div class="relative overflow-hidden" style="max-width: 175px; height: 175px; padding-bottom: min(175px, 100%); align-self: center; width: 175px;"><span></span></div>
              </div>
              <div class="mt0 mb0" data-testid="variant-62GSV85QD3TY" style="height: 24px;"></div>
              <div>
                <div data-automation-id="product-price" class="flex flex-wrap justify-start items-center lh-title mb1-m">
                  <div class="mr1 mr2-xl b black lh-copy f5 f4-l" aria-hidden="true">$12.97</div>
                  <span class="w_iUH7">current price $12.97</span>
                  <div class="gray mr1 f7 f6-l">$3.71/oz</div>
                  <div class="gray f7 f6-l">+$2.99 shipping</div>
                </div>
              </div>
            </div>
          </li>
          <li class="flex flex-column pa1 pr2 pb2 items-center" data-slide="1">
            <div role="group" data-item-id="57O4B4YA3PCO" data-dca-catalog-id="57O4B4YA3PCO" data-dca-item-id="973056286" class="sans-serif mid-gray relative flex flex-column w-100 h-100 hide-child-opacity" data-testid="product-tile-1" aria-label="Product">
              <a link-identifier="973056286" class="w-100 h-100 z-1 hide-sibling-opacity  absolute" target="" href="#"><span class="w_iUH7"><h3>BEVEL Men's Shave Starter Kit</h3></span></a>
              <div class="h2 relative mv2"></div>
              <div class="relative">
                <div class="relative overflow-hidden" style="max-width: 175px; height: 175px; padding-bottom: min(175px, 100%); align-self: center; width: 175px;"><span></span></div>
              </div>
              <div class="mt0 mb0" data-testid="variant-57O4B4YA3PCO" style="height: 24px;"></div>
              <div>
                <div data-automation-id="product-price" class="flex flex-wrap justify-start items-center lh-title mb1-m">
                  <div class="mr1 mr2-xl b black green lh-copy f5 f4-l" aria-hidden="true">Now $35.99</div>
                  <span class="w_iUH7">current price Now $35.99</span>
                  <div class="gray mr1 strike f7 f6-l" aria-hidden="true">$39.99</div>
                  <span class="w_iUH7">Was $39.99</span>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    `;
    const document = createTestDOM(html);
    // Simulate right-click on the <a> inside the first <li>
    const firstA = document.querySelector('ul > li:first-child a');
    expect(firstA).toBeTruthy();
    // Log the node being passed
    // eslint-disable-next-line no-console
    console.log('[Test] Node passed to extractAllPricesFromSubtree:', firstA?.outerHTML);
    // Run price detection from this node
    const results = extractAllPricesFromSubtree(firstA!);
    // Diagnostic logging
    if (results.length !== 1) {
      // eslint-disable-next-line no-console
      console.log('Detected prices:', results.map(r => r.priceStr));
    }
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toContain('$12.97');
  });

  test('detects price in product listing with unit price', () => {
    const html = `
      <li class="flex flex-column pa1 pr2 pb2 items-center" data-slide="0" style="scroll-snap-align: start;">
        <div role="group" data-item-id="619Y0GHOTHGN" data-dca-catalog-id="619Y0GHOTHGN" data-dca-item-id="933218952" class="sans-serif mid-gray relative flex flex-column w-100 h-100 hide-child-opacity" data-testid="product-tile-0" aria-label="Product">
          <div>
            <div data-automation-id="product-price" class="flex flex-wrap justify-start items-center lh-title mb1-m">
              <div class="mr1 mr2-xl b black lh-copy f5 f4-l" aria-hidden="true">$15.98</div>
              <span class="w_iUH7">current price $15.98</span>
              <div class="gray mr1 f7 f6-l">$15.98/ca</div>
            </div>
          </div>
        </div>
      </li>
    `;
    const document = createTestDOM(html);
    const priceElement = document.querySelector('[data-automation-id="product-price"]');
    expect(priceElement).toBeTruthy();
    
    // Test main price
    const mainPrice = document.querySelector('.mr1.mr2-xl.b.black.lh-copy.f5.f4-l')?.textContent;
    expect(mainPrice).toBe('$15.98');
    
    // Test screen reader price
    const screenReaderPrice = document.querySelector('.w_iUH7')?.textContent;
    expect(screenReaderPrice).toContain('$15.98');
    
    // Test unit price
    const unitPrice = document.querySelector('.gray.mr1.f7.f6-l')?.textContent;
    expect(unitPrice).toBe('$15.98/ca');
  });

  test('detects price from actual Walmart product listing HTML', () => {
    const html = `
      <li class="flex flex-column pa1 pr2 pb2 items-center" data-slide="0" style="scroll-snap-align: start;">
        <div role="group" data-item-id="619Y0GHOTHGN" data-dca-catalog-id="619Y0GHOTHGN" data-dca-item-id="933218952" class="sans-serif mid-gray relative flex flex-column w-100 h-100 hide-child-opacity" data-testid="product-tile-0" aria-label="Product">
          <a link-identifier="933218952" class="w_100 h-100 z-1 hide-sibling-opacity absolute" target="" href="/ip/6-Pack-A-Dozen-Cousins-Cuban-Black-Beans-10-oz-Pouch/933218952" data-clicked="true">
            <span class="w_iUH7"><h3>A Dozen Cousins Seasoned Black Beans, Vegan Gluten-Free Microwaveable Beans with Avocado Oil, 10 oz Pouches, 6 Pack</h3></span>
          </a>
          <div class="h2 relative mv2"></div>
          <div class="relative">
            <div class="relative overflow-hidden" style="max-width: 175px; height: 175px; padding-bottom: min(175px, 100%); align-self: center; width: 175px;">
              <img loading="lazy" src="https://i5.walmartimages.com/asr/dc6ec664-13a2-4af9-b165-e7612aa7807e.0360ec401c008ddbc0da4034448dc2af.jpeg" alt="A Dozen Cousins Seasoned Black Beans">
            </div>
          </div>
          <div class="mt0 mb0" data-testid="variant-619Y0GHOTHGN" style="height: 24px;"></div>
          <div>
            <div data-automation-id="product-price" class="flex flex-wrap justify-start items-center lh-title mb1-m">
              <div class="mr1 mr2-xl b black lh-copy f5 f4-l" aria-hidden="true">$15.98</div>
              <span class="w_iUH7">current price $15.98</span>
              <div class="gray mr1 f7 f6-l">$15.98/ca</div>
            </div>
          </div>
        </div>
      </li>
    `;
    const document = createTestDOM(html);
    
    // Find the clicked node
    const clickedNode = document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
    
    // Test price detection
    const results = extractAllPricesFromSubtree(clickedNode!);
    
    // Should find exactly one price (the main price, not the unit price)
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$15.98');
    
    // Verify we got the main price element, not the unit price
    const priceNode = results[0].nodes[0] as HTMLElement;
    const classes = priceNode.className.split(' ');
    expect(classes).toContain('mr1');
    expect(classes).toContain('mr2-xl');
    expect(classes).toContain('b');
    expect(classes).toContain('black');
    expect(classes).toContain('lh-copy');
    expect(classes).toContain('f5');
    expect(classes).toContain('f4-l');
  });
}); 