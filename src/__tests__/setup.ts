import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node.js
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock window.getComputedStyle for price detection tests
const mockComputedStyle = {
  getPropertyValue: (prop: string) => {
    // Mock common style properties used in price detection
    const styles: { [key: string]: string } = {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    };
    return styles[prop] || '';
  },
};

Object.defineProperty(window, 'getComputedStyle', {
  value: () => mockComputedStyle,
});

// Mock CoinGecko API for BTC conversion tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        bitcoin: {
          usd: 50000, // Mock BTC price
        },
      }),
  })
) as jest.Mock;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 