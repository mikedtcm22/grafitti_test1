import { createTestDOM, createTestFromRealWorld, addManualTestResult, compareAutomatedVsManual, RealWorldTestCase } from '../utils/test-utils';
import { extractAllPricesFromSubtree } from '../../../graffiti-ext/src/priceUtils';

describe('Real World Price Detection', () => {
  let currentTestCase: RealWorldTestCase;
  const shouldRebuild = process.env.REBUILD_TESTS === '1' || process.env.IS_NEW_TEST === '1';

  // This function will be used to create new test cases from real-world HTML
  const createNewTestCase = (
    html: string,
    sourceUrl: string,
    elementSelector: string,
    expectedPrices: string[]
  ) => {
    if (shouldRebuild) {
      currentTestCase = createTestFromRealWorld(html, sourceUrl, elementSelector, {
        expectedPrices,
        surroundingContext: {
          // We can add surrounding context here if needed
        }
      });
    } else {
      // Use static test case for repeated runs
      currentTestCase = {
        html,
        sourceUrl,
        elementSelector,
        expectedPrices
      };
    }
  };

  // This function will be used to add manual test results
  const addManualResult = (detectedPrices: string[], notes: string) => {
    if (shouldRebuild) {
      currentTestCase = addManualTestResult(currentTestCase, {
        detectedPrices,
        notes
      });
      console.log(compareAutomatedVsManual(currentTestCase));
    } else {
      // In repeated mode, just log the result
      console.log('Manual result (repeated mode):', { detectedPrices, notes });
    }
  };

  // Example test structure (this will be replaced with real test cases)
  test('can create and run test from real-world HTML', () => {
    // This is just a placeholder - we'll replace this with real HTML
    const html = `
      <div class="product-list">
        <ul class="product-items">
          <li class="product-item">
            <h3>Test Product</h3>
            <div class="product-price">$19.99</div>
          </li>
        </ul>
      </div>
    `;

    createNewTestCase(
      html,
      'https://example.com/test',
      '.product-price',
      ['$19.99']
    );

    // Run automated test
    const document = createTestDOM(currentTestCase.html);
    const element = document.querySelector(currentTestCase.elementSelector);
    expect(element).toBeTruthy();

    const results = extractAllPricesFromSubtree(element!);
    expect(results.length).toBe(currentTestCase.expectedPrices.length);
    expect(results[0].priceStr).toBe(currentTestCase.expectedPrices[0]);

    // Simulate adding manual test result
    addManualResult(['$19.99'], 'Manual test passed');
  });
}); 