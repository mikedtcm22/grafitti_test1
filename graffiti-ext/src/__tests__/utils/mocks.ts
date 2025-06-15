/**
 * Test utility mocks for browser APIs that are not fully implemented in JSDOM.
 * These mocks help simulate browser behavior in the test environment.
 */

/**
 * Mock implementation of ResizeObserver for testing DOM element resizing.
 * This is necessary because JSDOM does not implement ResizeObserver.
 * 
 * Usage:
 * - Automatically set up in jest.setup.js
 * - Used by tests that need to simulate element resizing
 * - Provides basic observe/unobserve/disconnect functionality
 */
class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    const index = this.elements.indexOf(element);
    if (index > -1) {
      this.elements.splice(index, 1);
    }
  }

  disconnect() {
    this.elements = [];
  }
}

// Mock ResizeObserver globally
global.ResizeObserver = MockResizeObserver as any; 