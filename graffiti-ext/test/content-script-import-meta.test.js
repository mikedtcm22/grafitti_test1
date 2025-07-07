const fs = require('fs');
const path = require('path');

describe('Content Script Import Meta Test', () => {
  test('content script should not contain import.meta references', () => {
    const contentScriptPath = path.join(__dirname, '..', 'dist', 'contentScript.js');
    
    // Check if file exists
    expect(fs.existsSync(contentScriptPath)).toBe(true);
    
    // Read file content
    const content = fs.readFileSync(contentScriptPath, 'utf8');
    
    // Check for import.meta references
    const importMetaRegex = /import\.meta/gi;
    const matches = content.match(importMetaRegex);
    
    if (matches) {
      console.error('Found import.meta references:', matches);
      console.error('These would cause "Cannot use \'import.meta\' outside a module" errors in Chrome MV3');
    }
    
    expect(matches).toBeNull();
  });
  
  test('content script should be in IIFE format', () => {
    const contentScriptPath = path.join(__dirname, '..', 'dist', 'contentScript.js');
    const content = fs.readFileSync(contentScriptPath, 'utf8');
    
    // Check that it starts with IIFE pattern
    const iifePattern = /^!function\(/;
    expect(iifePattern.test(content)).toBe(true);
  });
  
  test('content script should be properly minified', () => {
    const contentScriptPath = path.join(__dirname, '..', 'dist', 'contentScript.js');
    const stats = fs.statSync(contentScriptPath);
    
    // Should be reasonably sized (not too small indicating missing deps, not too large indicating bloat)
    expect(stats.size).toBeGreaterThan(100000); // At least 100KB
    expect(stats.size).toBeLessThan(1000000); // Less than 1MB
  });
}); 