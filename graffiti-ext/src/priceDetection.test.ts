import { isLikelyPrice, isLikelyPriceRange, parsePrice, getCombinedPriceString, findPriceNodes, extractAllPricesFromSubtree } from './priceUtils';

describe('isLikelyPrice', () => {
  it('detects simple USD prices', () => {
    expect(isLikelyPrice('$10.99')).toBe(true);
    expect(isLikelyPrice('1,299.99 USD')).toBe(true);
    expect(isLikelyPrice('1,299.99')).toBe(true);
    expect(isLikelyPrice('$1,299.99')).toBe(true);
  });
  it('ignores non-USD and non-prices', () => {
    expect(isLikelyPrice('€10.99')).toBe(false);
    expect(isLikelyPrice('Not a price')).toBe(false);
  });
});

describe('parsePrice', () => {
  it('parses USD prices', () => {
    expect(parsePrice('$10.99')).toEqual({ value: 10.99, currency: 'USD' });
    expect(parsePrice('1,299.99 USD')).toEqual({ value: 1299.99, currency: 'USD' });
    expect(parsePrice('$1,299.99')).toEqual({ value: 1299.99, currency: 'USD' });
  });
  it('throws on invalid price', () => {
    expect(() => parsePrice('Not a price')).toThrow();
  });
});

describe('split-node price detection', () => {
  it('detects price split across multiple text nodes', () => {
    // Simulate: <div>$1,299.99</div> as split nodes
    const div = document.createElement('div');
    const dollar = document.createTextNode('$');
    const main = document.createTextNode('1,299');
    const cents = document.createTextNode('.99');
    div.appendChild(dollar);
    div.appendChild(main);
    div.appendChild(cents);
    // Test getCombinedPriceString on the middle node
    const { priceStr, nodes } = getCombinedPriceString(main);
    expect(priceStr).toBe('$1,299.99');
    expect(nodes.length).toBeGreaterThan(1);
  });

  it('detects price in a DOM tree using findPriceNodes', () => {
    // Simulate: <div><span>$</span><span>1,299</span><span>.99</span></div>
    const div = document.createElement('div');
    const dollar = document.createTextNode('$');
    const main = document.createTextNode('1,299');
    const cents = document.createTextNode('.99');
    div.appendChild(dollar);
    div.appendChild(main);
    div.appendChild(cents);
    const found = findPriceNodes(div);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].priceStr).toBe('$1,299.99');
  });
});

describe('extractAllPricesFromSubtree', () => {
  it('detects a single price in a simple node', () => {
    const div = document.createElement('div');
    div.textContent = '$10.99';
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$10.99');
  });

  it('detects a split-node price', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('$'));
    div.appendChild(document.createTextNode('1,299'));
    div.appendChild(document.createTextNode('.99'));
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$1,299.99');
  });

  it('detects multiple prices in a single container (price range)', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('$10.99'));
    div.appendChild(document.createTextNode(' - '));
    div.appendChild(document.createTextNode('$150.99'));
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(2);
    expect(results[0].priceStr).toBe('$10.99');
    expect(results[1].priceStr).toBe('$150.99');
  });

  it('ignores non-USD and non-prices', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('€10.99'));
    div.appendChild(document.createTextNode('Not a price'));
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(0);
  });
});

describe('isLikelyPriceRange', () => {
  it('detects $X - $Y format', () => {
    expect(isLikelyPriceRange('$5.99 - $15.99')).toBe(true);
    expect(isLikelyPriceRange('$10 - $20')).toBe(true);
  });
  it('detects from $X to $Y format', () => {
    expect(isLikelyPriceRange('from $5.99 to $15.99')).toBe(true);
  });
  it('detects between $X and $Y format', () => {
    expect(isLikelyPriceRange('between $5.99 and $15.99')).toBe(true);
  });
  it('detects $X to $Y format', () => {
    expect(isLikelyPriceRange('$5.99 to $15.99')).toBe(true);
  });
  it('ignores non-range prices', () => {
    expect(isLikelyPriceRange('$5.99')).toBe(false);
    expect(isLikelyPriceRange('Not a price')).toBe(false);
  });
});

describe('extractAllPricesFromSubtree (range extraction)', () => {
  it('detects and splits a price range', () => {
    const div = document.createElement('div');
    div.textContent = '$5.99 - $15.99';
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(2);
    expect(results[0].priceStr).toBe('$5.99');
    expect(results[1].priceStr).toBe('$15.99');
  });
  it('detects and splits a price range with "from ... to ..."', () => {
    const div = document.createElement('div');
    div.textContent = 'from $10 to $20';
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(2);
    expect(results[0].priceStr).toBe('$10');
    expect(results[1].priceStr).toBe('$20');
  });
});

describe('extractAllPricesFromSubtree (deduplication)', () => {
  it('does not duplicate split-node prices', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('$'));
    div.appendChild(document.createTextNode('2,599'));
    div.appendChild(document.createTextNode('.99'));
    const results = extractAllPricesFromSubtree(div);
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$2,599.99');
  });
});

describe('extractAllPricesFromSubtree (real-world Amazon HTML)', () => {
  it('detects only one clean price for Amazon split-node price structure', () => {
    // Simulate the relevant DOM structure for the first element
    const container = document.createElement('div');
    container.innerHTML = `
      <span class="aok-offscreen">   $2,599.99  </span>
      <span class="a-price aok-align-center reinventPricePriceToPayMargin priceToPay" data-a-size="xl" data-a-color="base">
        <span class="a-offscreen"> </span>
        <span aria-hidden="true">
          <span class="a-price-symbol">$</span>
          <span class="a-price-whole">2,599<span class="a-price-decimal">.</span></span>
          <span class="a-price-fraction">99</span>
        </span>
      </span>
      <span id="taxInclusiveMessage" class="a-size-mini a-color-base aok-align-center aok-nowrap">  </span>
      <span class="aok-relative">
        <span class="a-size-mini aok-offscreen"> $1,300.00 per count </span>
        <span aria-hidden="true" class="a-size-mini a-color-base aok-align-center pricePerUnit">
          (<span class="a-price a-text-price" data-a-size="mini" data-a-color="base">
            <span class="a-offscreen">$1,300.00</span>
            <span aria-hidden="true">$1,300.00</span>
          </span> / count)
        </span>
      </span>
    `;
    // Focus on the entire price container instead of just .a-price-whole
    const priceContainer = container.querySelector('.a-price')!;
    // Debug: log visible text nodes and their content
    function logVisibleTextNodes(node: Node): Node[] {
      const nodes: Node[] = [];
      function walk(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) {
          nodes.push(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          if (el.classList.contains('a-offscreen') || el.getAttribute('aria-hidden') === 'true') return;
          n.childNodes.forEach(walk);
        }
      }
      walk(node);
      return nodes;
    }
    const visibleNodes = logVisibleTextNodes(priceContainer);
    // eslint-disable-next-line no-console
    console.log('DEBUG visible text nodes:', visibleNodes.map(n => n.textContent));
    const results = extractAllPricesFromSubtree(priceContainer);
    // Should only detect one clean price
    expect(results.length).toBe(1);
    expect(results[0].priceStr.replace(/\s/g, '')).toMatch(/\$?2,599\.99/);
  });

  it('detects only one clean price for Amazon button-inner structure', () => {
    // Simulate the relevant DOM structure for the second element
    const container = document.createElement('div');
    container.innerHTML = `
      <span class="a-button-inner">
        <div class="a-section text-swatch-container">
          <div class="a-section a-spacing-none swatch-title-text-container">
            <span class="a-size-base swatch-title-text-display swatch-title-text swatch-title-text-single-line" style="height: 15px;"> Row of 2 </span>
          </div>
          <hr aria-hidden="true" class="a-spacing-none a-divider-normal">
          <div class="a-section dimension-slot-info">
            <div><div><div><div class="a-section a-spacing-none aok-align-center aok-relative">
              <span class="aok-offscreen"> $2,599.99</span>
              <span class="a-price a-text-price aok-align-center centralizedApexPricePriceToPayMargin" data-a-size="s" data-a-color="base">
                <span class="a-offscreen"></span>
                <span aria-hidden="true">$2,599.99</span>
              </span>
            </div></div></div></div>
          </div>
        </div>
      </span>
    `;
    // Focus on the <span class="a-button-inner"> element
    const buttonInner = container.querySelector('.a-button-inner')!;
    const results = extractAllPricesFromSubtree(buttonInner);
    // Should only detect one clean price
    expect(results.length).toBe(1);
    expect(results[0].priceStr.replace(/\s/g, '')).toMatch(/\$?2,599\.99/);
  });
}); 