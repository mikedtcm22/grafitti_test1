/**
 * Test utilities for setting up and managing the test DOM environment.
 * These utilities help create consistent test environments across different test files.
 */

import { JSDOM } from 'jsdom';
import { TextEncoder, TextDecoder } from 'util';

// Set up TextEncoder and TextDecoder globally
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Create a JSDOM instance
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});

// Set up global variables
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

export interface TestDOM {
  window: Window;
  document: Document;
  navigator: Navigator;
  close: () => void;
}

/**
 * Creates a test DOM environment with the provided HTML.
 * If no HTML is provided, uses a default HTML structure with sample product list items.
 * 
 * @param html - Optional HTML string to create the test environment with
 * @returns A JSDOM instance configured for testing
 */
export function createTestDOM(html: string = ''): JSDOM {
  const defaultHTML = `
    <ul>
      <li data-clicked="true">
        <div class="product-title">Product 1</div>
        <div class="price">$10.99</div>
      </li>
      <li>
        <div class="product-title">Product 2</div>
        <div class="price">$15.99</div>
      </li>
    </ul>
  `;

  return new JSDOM(html || defaultHTML, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });
}

/**
 * Creates a test DOM environment and returns only the document object.
 * Useful for simpler test cases that only need document access.
 * 
 * @param html - HTML string to create the test environment with
 * @returns The document object from the created JSDOM instance
 */
export function createTestDOMDocument(html: string): Document {
  const dom = new JSDOM(html, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously'
  });
  return dom.window.document;
}

/**
 * Creates a test price element with the given price text.
 * 
 * @param price - The price text to set on the element
 * @returns A div element containing the price text
 */
export function createTestPrice(price: string): HTMLElement {
  const element = document.createElement('div');
  element.textContent = price;
  return element;
}

/**
 * Creates a test container element and appends it to the document body.
 * Useful for isolating test elements from the main document.
 * 
 * @returns The created container element
 */
export function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'test-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Cleans up the test DOM environment.
 * Note: In JSDOM, cleanup is handled automatically by window.close()
 */
export function cleanupTestDOM(): void {
  // Cleanup is handled by JSDOM's window.close()
} 