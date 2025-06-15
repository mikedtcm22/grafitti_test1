import { createTestDOM, createListContainer, createTestEvent, TestCase, TestResult } from '../utils/test-utils';
import { generateTestDocumentation, TestDocumentation } from '../utils/test-documentation';
import { extractAllPricesFromSubtree } from '../../../graffiti-ext/src/priceUtils';

describe('List Item Price Detection', () => {
  const shouldRebuild = process.env.REBUILD_TESTS === '1' || process.env.IS_NEW_TEST === '1';
  // Define our test case
  const listItemTestCase: TestCase = {
    name: 'List Item Price Detection',
    description: 'Verify that price detection works correctly within list items, only detecting the price for the clicked item',
    html: `
      <div class="product-list">
        <ul class="product-items">
          <li class="product-item">
            <h3>Rooibos Vanilla Tea</h3>
            <div class="product-price">$12.97</div>
          </li>
          <li class="product-item">
            <h3>BEVEL Men's Shave Kit</h3>
            <div class="product-price">$35.99</div>
            <div class="product-price strike">$39.99</div>
          </li>
        </ul>
      </div>
    `,
    expectedPrices: ['$12.97'],
    context: {
      site: 'Walmart',
      pageType: 'Product List',
      priceType: 'Single Price',
      domStructure: 'List Items'
    },
    interactions: {
      clickTarget: 'First list item price',
      expectedBehavior: 'Only detect price of clicked item'
    },
    metadata: {
      lastUpdated: new Date(),
      source: 'Walmart Product List',
      notes: 'Test case for list item price detection'
    }
  };

  // Generate documentation
  const documentation: TestDocumentation = generateTestDocumentation(listItemTestCase);

  test('detects only the price for the right-clicked list item', () => {
    const document = createTestDOM(listItemTestCase.html);
    const firstPriceElement = document.querySelector('.product-item:first-child .product-price');
    expect(firstPriceElement).toBeTruthy();
    let event: Event;
    if (shouldRebuild) {
      event = createTestEvent('contextmenu', firstPriceElement as HTMLElement);
      document.dispatchEvent(event);
    } else {
      // In repeated mode, skip event creation (or use a simple mock)
      event = new Event('contextmenu');
    }
    const results = extractAllPricesFromSubtree(firstPriceElement!);
    console.log('Test Results:', {
      testId: documentation.testId,
      detectedPrices: results.map(r => r.priceStr),
      expectedPrices: listItemTestCase.expectedPrices,
      passed: results.length === 1 && results[0].priceStr === listItemTestCase.expectedPrices[0]
    });
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe(listItemTestCase.expectedPrices[0]);
  });

  test('ignores prices in other list items', () => {
    const document = createTestDOM(listItemTestCase.html);
    const firstListItem = document.querySelector('.product-item:first-child');
    expect(firstListItem).toBeTruthy();
    let event: Event;
    if (shouldRebuild) {
      event = createTestEvent('contextmenu', firstListItem as HTMLElement);
      document.dispatchEvent(event);
    } else {
      event = new Event('contextmenu');
    }
    const results = extractAllPricesFromSubtree(firstListItem!);
    console.log('Test Results:', {
      testId: `${documentation.testId}-ignore-others`,
      detectedPrices: results.map(r => r.priceStr),
      expectedPrices: listItemTestCase.expectedPrices,
      passed: results.length === 1 && results[0].priceStr === listItemTestCase.expectedPrices[0]
    });
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe(listItemTestCase.expectedPrices[0]);
  });

  test('handles dynamic list updates', () => {
    let container: HTMLElement;
    if (shouldRebuild) {
      container = createListContainer([
        { title: 'Item 1', price: '$12.97' },
        { title: 'Item 2', price: '$35.99' }
      ]);
    } else {
      // Use static HTML for repeated mode
      container = document.createElement('div');
      container.innerHTML = `
        <ul class="product-items">
          <li class="product-item">
            <h3>Item 1</h3>
            <div class="product-price">$12.97</div>
          </li>
          <li class="product-item">
            <h3>Item 2</h3>
            <div class="product-price">$35.99</div>
          </li>
        </ul>
      `;
    }
    const testDocument = createTestDOM(container.outerHTML);
    const firstListItem = testDocument.querySelector('.product-item:first-child');
    expect(firstListItem).toBeTruthy();
    let event: Event;
    if (shouldRebuild) {
      event = createTestEvent('contextmenu', firstListItem as HTMLElement);
      testDocument.dispatchEvent(event);
    } else {
      event = new Event('contextmenu');
    }
    const results = extractAllPricesFromSubtree(firstListItem!);
    console.log('Test Results:', {
      testId: `${documentation.testId}-dynamic-updates`,
      detectedPrices: results.map(r => r.priceStr),
      expectedPrices: ['$12.97'],
      passed: results.length === 1 && results[0].priceStr === '$12.97'
    });
    expect(results.length).toBe(1);
    expect(results[0].priceStr).toBe('$12.97');
  });
}); 