import { createTestDOM, createPriceElement } from '../utils/test-utils';

describe('Basic Price Detection', () => {
  test('detects simple price', () => {
    const html = '<div class="price">$19.99</div>';
    const document = createTestDOM(html);
    const priceElement = document.querySelector('.price');
    expect(priceElement).toBeTruthy();
    expect(priceElement?.textContent).toBe('$19.99');
  });

  test('detects price with currency code', () => {
    const html = '<div class="price">19.99 USD</div>';
    const document = createTestDOM(html);
    const priceElement = document.querySelector('.price');
    expect(priceElement).toBeTruthy();
    expect(priceElement?.textContent).toBe('19.99 USD');
  });

  test('detects price with text context', () => {
    const html = '<div class="product"><span>Price: </span><span class="price">$19.99</span></div>';
    const document = createTestDOM(html);
    const priceElement = document.querySelector('.price');
    expect(priceElement).toBeTruthy();
    expect(priceElement?.textContent).toBe('$19.99');
  });
}); 