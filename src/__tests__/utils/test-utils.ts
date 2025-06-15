import { JSDOM } from 'jsdom';

export const createTestDOM = (html: string): Document => {
  const dom = new JSDOM(html);
  return dom.window.document;
};

export const createPriceElement = (price: string, className?: string): HTMLElement => {
  const element = document.createElement('div');
  element.textContent = price;
  if (className) {
    element.className = className;
  }
  return element;
};

export const createSplitPriceElement = (
  symbol: string,
  whole: string,
  fraction: string
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'price-container';

  const symbolSpan = document.createElement('span');
  symbolSpan.textContent = symbol;
  symbolSpan.className = 'price-symbol';

  const wholeSpan = document.createElement('span');
  wholeSpan.textContent = whole;
  wholeSpan.className = 'price-whole';

  const fractionSpan = document.createElement('span');
  fractionSpan.textContent = fraction;
  fractionSpan.className = 'price-fraction';

  container.appendChild(symbolSpan);
  container.appendChild(wholeSpan);
  container.appendChild(fractionSpan);

  return container;
};

export const createPriceRangeElement = (
  minPrice: string,
  maxPrice: string
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'price-range';

  const minSpan = document.createElement('span');
  minSpan.textContent = minPrice;
  minSpan.className = 'price-min';

  const separator = document.createElement('span');
  separator.textContent = ' - ';
  separator.className = 'price-separator';

  const maxSpan = document.createElement('span');
  maxSpan.textContent = maxPrice;
  maxSpan.className = 'price-max';

  container.appendChild(minSpan);
  container.appendChild(separator);
  container.appendChild(maxSpan);

  return container;
};

export const createMonthlyPaymentElement = (
  price: string,
  term: string
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'monthly-payment';

  const priceSpan = document.createElement('span');
  priceSpan.textContent = price;
  priceSpan.className = 'payment-price';

  const termSpan = document.createElement('span');
  termSpan.textContent = term;
  termSpan.className = 'payment-term';

  container.appendChild(priceSpan);
  container.appendChild(termSpan);

  return container;
};

// --- Flag-based test-building logic ---
const shouldRebuild = process.env.REBUILD_TESTS === '1' || process.env.IS_NEW_TEST === '1';

// --- Real World Test Utilities (stubs/conditional) ---
export interface RealWorldTestCase {
  html: string;
  sourceUrl: string;
  elementSelector: string;
  expectedPrices: string[];
  surroundingContext?: Record<string, any>;
  detectedPrices?: string[];
  notes?: string;
}

export function createTestFromRealWorld(
  html: string,
  sourceUrl: string,
  elementSelector: string,
  options: { expectedPrices: string[], surroundingContext?: Record<string, any> }
): RealWorldTestCase {
  if (!shouldRebuild) {
    throw new Error('createTestFromRealWorld should only be called when REBUILD_TESTS or IS_NEW_TEST is set');
  }
  return {
    html,
    sourceUrl,
    elementSelector,
    expectedPrices: options.expectedPrices,
    surroundingContext: options.surroundingContext,
  };
}

export function addManualTestResult(
  testCase: RealWorldTestCase,
  result: { detectedPrices: string[], notes: string }
): RealWorldTestCase {
  if (!shouldRebuild) {
    throw new Error('addManualTestResult should only be called when REBUILD_TESTS or IS_NEW_TEST is set');
  }
  return {
    ...testCase,
    detectedPrices: result.detectedPrices,
    notes: result.notes,
  };
}

export function compareAutomatedVsManual(testCase: RealWorldTestCase): string {
  if (!shouldRebuild) {
    return 'Comparison skipped (not in rebuild mode)';
  }
  const auto = testCase.expectedPrices.join(', ');
  const manual = (testCase.detectedPrices || []).join(', ');
  return `Automated: [${auto}] vs Manual: [${manual}]\nNotes: ${testCase.notes || ''}`;
}

// --- List Item Test Utilities (stubs/conditional) ---
export interface TestCase {
  name: string;
  description: string;
  html: string;
  expectedPrices: string[];
  context?: Record<string, any>;
  interactions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TestResult {
  testId?: string;
  detectedPrices: string[];
  expectedPrices: string[];
  passed: boolean;
}

export function createListContainer(items: { title: string, price: string }[]): HTMLElement {
  if (!shouldRebuild) {
    throw new Error('createListContainer should only be called when REBUILD_TESTS or IS_NEW_TEST is set');
  }
  const container = document.createElement('div');
  container.className = 'product-list';
  const ul = document.createElement('ul');
  ul.className = 'product-items';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'product-item';
    const h3 = document.createElement('h3');
    h3.textContent = item.title;
    const priceDiv = document.createElement('div');
    priceDiv.className = 'product-price';
    priceDiv.textContent = item.price;
    li.appendChild(h3);
    li.appendChild(priceDiv);
    ul.appendChild(li);
  }
  container.appendChild(ul);
  return container;
}

export function createTestEvent(type: string, target: HTMLElement): Event {
  if (!shouldRebuild) {
    throw new Error('createTestEvent should only be called when REBUILD_TESTS or IS_NEW_TEST is set');
  }
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, enumerable: true });
  return event;
} 