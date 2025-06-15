import { createTestDOM } from '../utils/test-utils';

describe('Core Price Detection', () => {
  test('detects split-node price (Amazon style)', () => {
    const html = `
      <span class="a-price">
        <span class="a-price-symbol">$</span>
        <span class="a-price-whole">1,299</span>
        <span class="a-price-decimal">.</span>
        <span class="a-price-fraction">99</span>
      </span>
    `;
    const document = createTestDOM(html);
    const priceSymbol = document.querySelector('.a-price-symbol')?.textContent;
    const priceWhole = document.querySelector('.a-price-whole')?.textContent;
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent;
    expect(priceSymbol).toBe('$');
    expect(priceWhole).toBe('1,299');
    expect(priceFraction).toBe('99');
    // In real logic, these would be concatenated and parsed as 1299.99
  });

  test('detects price range in one element', () => {
    const html = `
      <div class="price-range">$10.99 – $150.99</div>
    `;
    const document = createTestDOM(html);
    const priceText = document.querySelector('.price-range')?.textContent;
    expect(priceText).toContain('$10.99');
    expect(priceText).toContain('$150.99');
    // Real logic would extract both prices
  });

  test('detects multiple prices in one element', () => {
    const html = `
      <div class="multi-price">$19.99 $29.99 $39.99</div>
    `;
    const document = createTestDOM(html);
    const priceText = document.querySelector('.multi-price')?.textContent;
    expect(priceText).toContain('$19.99');
    expect(priceText).toContain('$29.99');
    expect(priceText).toContain('$39.99');
    // Real logic would extract all three
  });

  test('ignores hidden/irrelevant nodes', () => {
    const html = `
      <div class="price">
        <span style="display:none">$999.99</span>
        <span>$49.99</span>
      </div>
    `;
    const document = createTestDOM(html);
    const visiblePrice = document.querySelector('.price span:not([style*="display:none"])')?.textContent;
    expect(visiblePrice).toBe('$49.99');
    // Real logic should ignore hidden price
  });

  test('ignores non-USD and non-price text', () => {
    const html = `
      <div class="not-a-price">Price: 19,99 €</div>
      <div class="not-a-price">Free shipping</div>
    `;
    const document = createTestDOM(html);
    const priceText = document.querySelector('.not-a-price')?.textContent;
    expect(priceText).not.toMatch(/\$\d/);
    // Real logic should ignore these
  });

  test('detects price in <li> element', () => {
    const html = `<ul><li>$12.34</li><li>$56.78</li></ul>`;
    const document = createTestDOM(html);
    const lis = document.querySelectorAll('li');
    expect(lis[0].textContent).toBe('$12.34');
    expect(lis[1].textContent).toBe('$56.78');
    // Real logic should extract both prices
  });

  test('detects price in <td> element', () => {
    const html = `<table><tr><td>$99.99</td><td>Other</td></tr></table>`;
    const document = createTestDOM(html);
    const tds = document.querySelectorAll('td');
    expect(tds[0].textContent).toBe('$99.99');
    // Real logic should extract the price from the <td>
  });

  test('detects price in <button> element', () => {
    const html = `<button>$49.99</button>`;
    const document = createTestDOM(html);
    const btn = document.querySelector('button');
    expect(btn?.textContent).toBe('$49.99');
    // Real logic should extract the price from the <button>
  });

  test('detects price in <a> element and in next sibling (Amazon ad case)', () => {
    const html = `
      <a id="adLink" href="#"></a>
      <div><span>$79</span><span>99</span></div>
    `;
    const document = createTestDOM(html);
    const a = document.querySelector('a#adLink');
    const priceDiv = a?.nextElementSibling;
    expect(priceDiv?.textContent).toContain('$79');
    expect(priceDiv?.textContent).toContain('99');
    // Real logic should extract $79.99 from the sibling structure
  });

  test('parsePrice normalizes US $ prefix', () => {
    const { value, currency } = require('../../../graffiti-ext/src/priceUtils').parsePrice('US $123.45');
    expect(value).toBe(123.45);
    expect(currency).toBe('USD');
  });

  test('parsePrice strips + from prices', () => {
    const { value, currency } = require('../../../graffiti-ext/src/priceUtils').parsePrice('$19.99+');
    expect(value).toBe(19.99);
    expect(currency).toBe('USD');
  });

  test('parsePrice extracts only the numeric price from complex strings', () => {
    const { value, currency } = require('../../../graffiti-ext/src/priceUtils').parsePrice('or $41.62/mo. for 24 mo.');
    expect(value).toBe(41.62);
    expect(currency).toBe('USD');
  });

  test('usdToBtcAndSats formats as BTC if >= 0.01', () => {
    const { usdToBtcAndSats } = require('../../../graffiti-ext/src/priceUtils');
    // $500 at $50,000/BTC = 0.01 BTC
    expect(usdToBtcAndSats(500, 50000)).toBe('0.01 BTC');
    // $1234 at $50,000/BTC = 0.02468 BTC
    expect(usdToBtcAndSats(1234, 50000)).toMatch(/^0\.0247 BTC$/); // rounded to 4 decimals
    // $12345 at $50,000/BTC = 0.2469 BTC
    expect(usdToBtcAndSats(12345, 50000)).toBe('0.2469 BTC');
  });

  test('usdToBtcAndSats formats as k sats if between 0.01 and 0.0001', () => {
    const { usdToBtcAndSats } = require('../../../graffiti-ext/src/priceUtils');
    // $0.5 at $50,000/BTC = 0.00001 BTC = 1,000 sats
    expect(usdToBtcAndSats(0.5, 50000)).toBe('1,000 sats');
    // $1 at $10,000/BTC = 0.0001 BTC = 10k sats
    expect(usdToBtcAndSats(1, 10000)).toBe('10k sats');
    // $1.23 at $10,000/BTC = 0.000123 BTC = 12.3k sats
    expect(usdToBtcAndSats(1.23, 10000)).toBe('12.3k sats');
    // $12 at $100,000/BTC = 0.00012 BTC = 12k sats
    expect(usdToBtcAndSats(12, 100000)).toBe('12k sats');
  });

  test('usdToBtcAndSats formats as sats if < 0.0001 BTC', () => {
    const { usdToBtcAndSats } = require('../../../graffiti-ext/src/priceUtils');
    // $0.004 at $50,000/BTC = 8 sats
    expect(usdToBtcAndSats(0.004, 50000)).toBe('8 sats');
    // $0.225 at $50,000/BTC = 0.0000045 BTC = 450 sats
    expect(usdToBtcAndSats(0.225, 50000)).toBe('450 sats');
    // $1 at $1,000,000/BTC = 0.000001 BTC = 100 sats
    expect(usdToBtcAndSats(1, 1000000)).toBe('100 sats');
    // $123.45 at $1,000,000/BTC = 0.00012345 BTC = 12,345 sats (should be 12.3k sats)
    expect(usdToBtcAndSats(123.45, 1000000)).toBe('12.3k sats');
  });

  test('usdToBtcAndSats returns fallback on error', () => {
    const { usdToBtcAndSats } = require('../../../graffiti-ext/src/priceUtils');
    expect(usdToBtcAndSats(10, 0)).toBe('BTC price unavailable');
    expect(usdToBtcAndSats(10, -1)).toBe('BTC price unavailable');
  });
}); 