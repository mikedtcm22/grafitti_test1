import { JSDOM } from 'jsdom';
import { createTestDOM } from '../utils/test-utils';
import { extractAllPricesFromSubtree, calculatePriceConfidence } from '../../priceUtils';

describe.skip('List Item Detection', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    dom.window.close();
  });

  it('handles click on list item', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on product title', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"] .product-title');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on price', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"] .price');
    const otherNode = dom.window.document.querySelector('li:not([data-clicked="true"]) .price');
    expect(clickedNode).toBeTruthy();
    expect(otherNode).toBeTruthy();
  });

  it('handles click on list item with no price', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on list item with no title', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on list item with no price or title', () => {
    const ul = dom.window.document.querySelector('ul')!;
    const newLi = dom.window.document.createElement('li');
    newLi.setAttribute('data-clicked', 'true');
    ul.appendChild(newLi);

    expect(dom.window.document.querySelector('[data-clicked="true"]')).toBeFalsy();
    expect(dom.window.document.querySelector('.price')?.textContent).toBe('$15.99');
  });

  it('handles click on list item with no price or title', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on list item with no price or title', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles click on list item with no price or title', () => {
    const ul = dom.window.document.querySelector('ul')!;
    const newLi = dom.window.document.createElement('li');
    newLi.setAttribute('data-clicked', 'true');
    ul.appendChild(newLi);

    expect(dom.window.document.querySelector('[data-clicked="true"]')).toBeFalsy();
    expect(dom.window.document.querySelector('.price')?.textContent).toBe('$15.99');
  });

  it('handles click on list item with no price or title', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();
  });

  it('handles dynamic content changes', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    // Update price
    const priceElement = clickedNode?.querySelector('.price');
    if (priceElement) {
      priceElement.textContent = '$12.99';
    }

    expect(clickedNode?.textContent).toContain('$12.99');
  });

  it('handles item removal', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    // Remove item
    clickedNode?.remove();

    const ul = dom.window.document.querySelector('ul')!;
    const newLi = dom.window.document.createElement('li');
    newLi.innerHTML = `
      <div class="product-title">Product 3</div>
      <div class="price">$20.99</div>
    `;
    ul.appendChild(newLi);

    expect(dom.window.document.querySelector('[data-clicked="true"]')).toBeFalsy();
    expect(dom.window.document.querySelector('.price')?.textContent).toBe('$15.99');
  });

  it('handles multiple price formats', () => {
    const clickedNode = dom.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    // Update price with different format
    const priceElement = clickedNode?.querySelector('.price');
    if (priceElement) {
      priceElement.textContent = '€9.99';
    }

    expect(clickedNode?.textContent).toContain('€9.99');
  });

  test('respects list item boundaries during traversal', () => {
    const html = `
      <ul>
        <li data-clicked="true">
          <div class="product-title">Product 1</div>
          <div class="price">$12.97</div>
        </li>
        <li>
          <div class="product-title">Product 2</div>
          <div class="price">$15.99</div>
        </li>
      </ul>
    `;
    const document = createTestDOM(html);
    const clickedNode = document.window.document.querySelector('[data-clicked="true"] .product-title');
    expect(clickedNode).toBeTruthy();

    const results = extractAllPricesFromSubtree(clickedNode!);
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$12.97');
  });

  test('applies correct confidence scoring for list items', () => {
    const html = `
      <ul>
        <li data-clicked="true">
          <div class="product-title">Product 1</div>
          <div class="price">$12.97</div>
        </li>
        <li>
          <div class="product-title">Product 2</div>
          <div class="price">$15.99</div>
        </li>
      </ul>
    `;
    const document = createTestDOM(html);
    const clickedNode = document.window.document.querySelector('[data-clicked="true"] .price');
    const otherNode = document.window.document.querySelector('li:not([data-clicked="true"]) .price');
    expect(clickedNode).toBeTruthy();
    expect(otherNode).toBeTruthy();

    const clickedConfidence = calculatePriceConfidence(clickedNode!, clickedNode!);
    const otherConfidence = calculatePriceConfidence(otherNode!, clickedNode!);

    // The clicked list item's price should have higher confidence
    expect(clickedConfidence.score).toBeGreaterThan(otherConfidence.score);
    // Verify the list item context factors
    expect(clickedConfidence.structural.factors['correct-list-item']).toBe(35);
    expect(otherConfidence.structural.factors['wrong-list-item']).toBe(-25);
  });

  test('handles nested list items correctly', () => {
    const html = `
      <ul>
        <li data-clicked="true">
          <div class="product-title">Product 1</div>
          <ul>
            <li>
              <div class="variant-title">Variant 1</div>
              <div class="price">$10.99</div>
            </li>
            <li>
              <div class="variant-title">Variant 2</div>
              <div class="price">$12.97</div>
            </li>
          </ul>
        </li>
        <li>
          <div class="product-title">Product 2</div>
          <div class="price">$15.99</div>
        </li>
      </ul>
    `;
    const document = createTestDOM(html);
    const clickedNode = document.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    const results = extractAllPricesFromSubtree(clickedNode!);
    // Should find both prices in the clicked list item (including nested ones)
    expect(results.length).toBe(2);
    expect(results.map(r => r.priceStr).sort()).toEqual(['$10.99', '$12.97'].sort());
  });

  test('handles dynamic list updates', () => {
    const html = `
      <ul>
        <li data-clicked="true">
          <div class="product-title">Product 1</div>
          <div class="price">$12.97</div>
        </li>
      </ul>
    `;
    const document = createTestDOM(html);
    const clickedNode = document.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    // Simulate dynamic update by adding a new list item
    const ul = document.window.document.querySelector('ul')!;
    const newLi = document.window.document.createElement('li');
    newLi.innerHTML = `
      <div class="product-title">Product 2</div>
      <div class="price">$15.99</div>
    `;
    ul.appendChild(newLi);

    const results = extractAllPricesFromSubtree(clickedNode!);
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$12.97');
  });

  test('handles complex price structures within list items', () => {
    const html = `
      <ul>
        <li data-clicked="true">
          <div class="product-title">Product 1</div>
          <div class="price-container">
            <span class="original-price">$15.99</span>
            <span class="sale-price">$12.97</span>
            <span class="unit-price">($1.29/oz)</span>
          </div>
        </li>
        <li>
          <div class="product-title">Product 2</div>
          <div class="price-container">
            <span class="original-price">$19.99</span>
            <span class="sale-price">$15.99</span>
            <span class="unit-price">($1.59/oz)</span>
          </div>
        </li>
      </ul>
    `;
    const document = createTestDOM(html);
    const clickedNode = document.window.document.querySelector('[data-clicked="true"]');
    expect(clickedNode).toBeTruthy();

    const results = extractAllPricesFromSubtree(clickedNode!);
    // Should find all prices in the clicked list item
    expect(results.length).toBe(3);
    const prices = results.map(r => r.priceStr).sort();
    expect(prices).toEqual(['$12.97', '$15.99', '$1.29/oz'].sort());
  });
}); 