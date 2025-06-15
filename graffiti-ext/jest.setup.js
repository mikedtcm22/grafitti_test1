const { TextEncoder, TextDecoder } = require('util');

// Set up TextEncoder and TextDecoder globally
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.scrollTo = () => {};
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
} 