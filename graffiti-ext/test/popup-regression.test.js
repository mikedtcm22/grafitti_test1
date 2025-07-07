/**
 * Popup Build Regression Test
 * Ensures the popup is built correctly and contains expected content
 * CRITICAL: This test prevents the "Vite + React" fallback skeleton from appearing
 */

const fs = require('fs');
const path = require('path');

describe('Popup Build Regression', () => {
  const distPath = path.join(__dirname, '../dist');
  const popupHtmlPath = path.join(distPath, 'popup/index.html');
  const popupAssetsPath = path.join(distPath, 'popup/assets');
  const manifestPath = path.join(distPath, 'manifest.json');

  test('popup HTML file should exist in correct location', () => {
    expect(fs.existsSync(popupHtmlPath)).toBe(true);
  });

  test('popup assets directory should exist', () => {
    expect(fs.existsSync(popupAssetsPath)).toBe(true);
  });

  test('popup JavaScript bundle should exist', () => {
    const files = fs.readdirSync(popupAssetsPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test('popup HTML should reference correct assets', () => {
    const htmlContent = fs.readFileSync(popupHtmlPath, 'utf8');
    expect(htmlContent).toContain('./assets/');
    expect(htmlContent).toContain('<div id="root"></div>');
  });

  test('manifest should point to correct popup location', () => {
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifestContent.action.default_popup).toBe('popup/index.html');
  });

  test('CRITICAL: popup HTML should not have default Vite + React title', () => {
    const htmlContent = fs.readFileSync(popupHtmlPath, 'utf8');
    
    // Should not contain default Vite title - this is the main regression we're preventing
    expect(htmlContent).not.toContain('Vite + React + TS');
    expect(htmlContent).not.toContain('Vite + React');
    
    // Should contain our extension title
    expect(htmlContent).toContain('Graffiti Extension');
  });

  test('popup HTML should use relative asset paths (Chrome MV3 requirement)', () => {
    const htmlContent = fs.readFileSync(popupHtmlPath, 'utf8');
    
    // Should use relative paths (./assets/...) not absolute (/assets/...)
    expect(htmlContent).not.toMatch(/src="\//);
    expect(htmlContent).not.toMatch(/href="\//);
    
    // Should contain relative paths
    expect(htmlContent).toMatch(/src="\.\//);
    expect(htmlContent).toMatch(/href="\.\//);
  });

  test('popup should have required Supabase environment variables in build', () => {
    const files = fs.readdirSync(popupAssetsPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
    
    // Read the main JS bundle
    const mainJsFile = jsFiles[0];
    const jsContent = fs.readFileSync(path.join(popupAssetsPath, mainJsFile), 'utf8');
    
    // Should contain Supabase URL (indicating env vars were loaded)
    expect(jsContent).toContain('supabase.co');
  });

  test('popup JS bundle should contain React popup components', () => {
    const files = fs.readdirSync(popupAssetsPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    const mainJsFile = jsFiles[0];
    const jsContent = fs.readFileSync(path.join(popupAssetsPath, mainJsFile), 'utf8');
    
    // Should contain references to our popup components
    expect(jsContent).toMatch(/react/i);
  });
}); 