// Content script for Graffiti Extension

import { extractAllPricesFromSubtree, parsePrice, fetchBtcUsdRate, usdToBtcAndSats, isLikelyPrice } from './priceUtils';
import { OverlayManager } from './overlay/OverlayManager';

// Add version identifier
const VERSION = '1.0.2';

// Log initialization
console.log('[Graffiti Extension] Content script initialized - Version:', VERSION);

// Initialize overlay manager
const overlayManager = new OverlayManager();

// Store overlay state for robust tracking
let graffitiOverlayState: {
  targetNode: Node | null,
  rect: DOMRect | null,
  observers: Array<ResizeObserver | null>,
  cleanup: (() => void) | null
} = {
  targetNode: null,
  rect: null,
  observers: [],
  cleanup: null
};

// Remove all graffiti overlays
function removeGraffitiOverlays() {
  document.querySelectorAll('.graffiti-overlay, .graffiti-label-overlay').forEach(el => el.remove());
  // Clean up observers and listeners
  graffitiOverlayState.observers.forEach(obs => obs && obs.disconnect && obs.disconnect());
  graffitiOverlayState.observers = [];
  if (graffitiOverlayState.cleanup) graffitiOverlayState.cleanup();
  graffitiOverlayState.cleanup = null;
  graffitiOverlayState.targetNode = null;
  graffitiOverlayState.rect = null;
}

// Overlay for the X
function injectXOverlayInContainer(rect: DOMRect, parent: HTMLElement) {
  const overlay = document.createElement('div');
  overlay.className = 'graffiti-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${rect.left - parent.getBoundingClientRect().left}px`,
    top: `${rect.top - parent.getBoundingClientRect().top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: 2147483647,
    pointerEvents: 'none',
    background: 'rgba(255, 140, 0, 0.10)',
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', `${rect.width}`);
  svg.setAttribute('height', `${rect.height}`);
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.pointerEvents = 'none';
  svg.innerHTML = `
    <line x1="10" y1="10" x2="${rect.width-10}" y2="${rect.height-10}" stroke="#ff9900" stroke-width="4" stroke-linecap="round" />
    <line x1="${rect.width-10}" y1="10" x2="10" y2="${rect.height-10}" stroke="#ff9900" stroke-width="4" stroke-linecap="round" />
  `;
  overlay.appendChild(svg);
  parent.appendChild(overlay);
}

// Overlay for the graffiti label
function injectLabelOverlayInContainer(rect: DOMRect, graffitiText: string, parent: HTMLElement) {
  const margin = 4;
  const labelHeight = Math.max(20, rect.height * 0.7);
  const labelWidth = Math.max(80, rect.width * 1.2);
  const viewport = {
    width: parent.offsetWidth,
    height: parent.offsetHeight
  };
  let top = rect.bottom - parent.getBoundingClientRect().top + margin;
  let left = rect.left - parent.getBoundingClientRect().left;
  if (rect.bottom - parent.getBoundingClientRect().top + labelHeight + margin < viewport.height) {
    top = rect.bottom - parent.getBoundingClientRect().top + margin;
    left = rect.left - parent.getBoundingClientRect().left;
  } else if (rect.top - parent.getBoundingClientRect().top - labelHeight - margin > 0) {
    top = rect.top - parent.getBoundingClientRect().top - labelHeight - margin;
    left = rect.left - parent.getBoundingClientRect().left;
  } else if (rect.right - parent.getBoundingClientRect().left + labelWidth + margin < viewport.width) {
    top = rect.top - parent.getBoundingClientRect().top;
    left = rect.right - parent.getBoundingClientRect().left + margin;
  } else if (rect.left - parent.getBoundingClientRect().left - labelWidth - margin > 0) {
    top = rect.top - parent.getBoundingClientRect().top;
    left = rect.left - parent.getBoundingClientRect().left - labelWidth - margin;
  } else {
    top = rect.bottom - parent.getBoundingClientRect().top + margin;
    left = rect.left - parent.getBoundingClientRect().left;
  }
  const label = document.createElement('div');
  label.className = 'graffiti-label-overlay';
  Object.assign(label.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${labelWidth}px`,
    height: `${labelHeight}px`,
    zIndex: 2147483647,
    pointerEvents: 'none',
    fontFamily: 'Chalkduster, "Comic Sans MS", "Comic Sans", cursive',
    color: '#ff9900',
    fontSize: `${labelHeight * 0.7}px`,
    fontWeight: 'bold',
    textShadow: '1px 1px 2px #fff, 0 0 2px #ff9900',
    background: 'rgba(255,255,255,0.7)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  });
  label.textContent = graffitiText;
  parent.appendChild(label);
}

function injectGraffitiWithTracking(rect: DOMRect, graffitiText: string, targetNode: Node) {
  removeGraffitiOverlays();
  let parentEl = (targetNode.parentElement || (targetNode as HTMLElement).parentElement) as HTMLElement;
  if (!parentEl) return;
  // Set position: relative if static
  const computed = window.getComputedStyle(parentEl);
  if (computed.position === 'static') {
    parentEl.style.position = 'relative';
  }
  injectXOverlayInContainer(rect, parentEl);
  injectLabelOverlayInContainer(rect, graffitiText, parentEl);
  graffitiOverlayState.targetNode = targetNode;
  graffitiOverlayState.rect = rect;
  let lastRect = rect;
  const updateOverlay = () => {
    if (!document.body.contains(targetNode)) {
      removeGraffitiOverlays();
      return;
    }
    const range = document.createRange();
    try {
      range.selectNode(targetNode);
    } catch {
      removeGraffitiOverlays();
      return;
    }
    const newRect = range.getBoundingClientRect();
    if (newRect.width === 0 || newRect.height === 0) {
      removeGraffitiOverlays();
      return;
    }
    if (
      Math.abs(newRect.left - lastRect.left) > 1 ||
      Math.abs(newRect.top - lastRect.top) > 1 ||
      Math.abs(newRect.width - lastRect.width) > 1 ||
      Math.abs(newRect.height - lastRect.height) > 1
    ) {
      removeGraffitiOverlays();
      injectXOverlayInContainer(newRect, parentEl);
      injectLabelOverlayInContainer(newRect, graffitiText, parentEl);
      lastRect = newRect;
    }
  };
  const resizeObs = new ResizeObserver(updateOverlay);
  resizeObs.observe(parentEl);
  graffitiOverlayState.observers.push(resizeObs);
  const scrollListener = () => updateOverlay();
  window.addEventListener('scroll', scrollListener, true);
  window.addEventListener('resize', scrollListener, true);
  graffitiOverlayState.cleanup = () => {
    window.removeEventListener('scroll', scrollListener, true);
    window.removeEventListener('resize', scrollListener, true);
  };
}

// Track the last right-clicked element
declare let window: any;
(window as any).graffitiLastRightClickedElement = null;
document.addEventListener('contextmenu', (event) => {
  (window as any).graffitiLastRightClickedElement = event.target;
}, true);

// Listen for messages from background
// @ts-expect-error: Chrome types may not be available in the build environment
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message && (message.type === 'GRAFFITI_GET_TARGET' || message.action === 'convertToBTC')) {
    // For manual testing: log detection attempt
    console.log('\n[Graffiti Extension] ===== Price Detection Started =====');
    console.log('[Graffiti Extension] URL:', window.location.href);

    let found: any[] = [];
    // FAST PATH: Check right-clicked node (or its parent) for direct price before anything else
    let candidateNode = (window as any).graffitiLastRightClickedElement;
    let root: Node = document.body; // Default to body
    if (candidateNode && candidateNode.nodeType !== Node.ELEMENT_NODE) {
      candidateNode = candidateNode.parentElement;
    }
    // Diagnostic logging for node attachment and context
    let isAttached = false;
    if (candidateNode) {
      isAttached = document.body.contains(candidateNode);
      let nodeInfo = '';
      if (candidateNode instanceof Element) {
        nodeInfo = candidateNode.outerHTML.slice(0, 200) + '...';
      } else if (candidateNode) {
        nodeInfo = candidateNode.textContent;
      }
      // Log parent chain
      let parentChain = [];
      let parent = candidateNode.parentElement;
      while (parent && parent !== document.body) {
        parentChain.push({
          tag: parent.tagName,
          class: parent.className,
          id: parent.id
        });
        parent = parent.parentElement;
      }
      console.log('[Graffiti-DIAG] Right-clicked node attachment:', isAttached, '| Node:', nodeInfo, '| Parent chain:', parentChain);
    }
    // Always use the right-clicked node as root if it exists and is attached
    if (candidateNode && isAttached) {
      root = candidateNode;
      console.log('[Graffiti-DIAG] Using right-clicked node as root for price detection.');
      const text = candidateNode.textContent?.trim() || '';
      if ((window as any).isLikelyPrice ? (window as any).isLikelyPrice(text) : false) {
        console.log('[Graffiti-DIAG] Fast path: Clicked node contains price, skipping traversal:', text);
        found = [{ priceStr: text, nodes: [candidateNode] }];
      }
    } else {
      // Only fall back to selection if no valid right-clicked node
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const selectedRoot = selection.getRangeAt(0).commonAncestorContainer;
        if (selectedRoot) {
          console.log('[Graffiti-DIAG] Using selection as root');
          root = selectedRoot;
        }
      } else {
        root = document.body;
        console.log('[Graffiti Extension] Using document.body as root');
      }
    }

    // If fast path fails, check for selection
    if (found.length === 0) {
      // Only run extraction if fast-path did not find a price
      if (found.length === 0) {
        // --- Enhanced Diagnostic Logging ---
        if (root instanceof Element) {
          const snippet = root.outerHTML ? root.outerHTML.slice(0, 300) + '...': '';
          console.log('[Graffiti-DIAG] Root node:', {
            tag: root.tagName,
            class: root.className,
            id: root.id,
            snippet
          });
          const childCount = root.querySelectorAll('*').length;
          console.log(`[Graffiti-DIAG] Subtree size: ${childCount} elements`);
          // Log parent chain for context
          let parent = root.parentElement;
          let parentChain = [];
          while (parent && parent !== document.body) {
            parentChain.push({
              tag: parent.tagName,
              class: parent.className,
              id: parent.id
            });
            parent = parent.parentElement;
          }
          console.log('[Graffiti-DIAG] Parent chain:', parentChain);
        } else {
          console.log('[Graffiti-DIAG] Root node is not an Element:', root);
        }
        // --- End Enhanced Diagnostic Logging ---
        // --- Existing Diagnostic Logging ---
        function findLikelyPriceContainer(start: Node): Element | null {
          let node: Node | null = start;
          let steps = 0;
          while (node && node !== document.body) {
            steps++;
            if (node instanceof Element) {
              console.log(`[Graffiti-DIAG] Step ${steps}: Checking node:`, {
                tag: node.tagName,
                class: node.className,
                id: node.id,
                childCount: node.children.length
              });
              if (
                node.classList.contains('a-price') ||
                node.classList.contains('a-price-text-price') ||
                node.classList.contains('a-button-inner')
              ) {
                console.log(`[Graffiti Extension] Found price container after ${steps} steps:`, node.className);
                return node;
              }
              // Heuristic: if node has at least 2 children with price-like classes
              const priceLike = Array.from(node.children).filter(
                (el: Element) => el.classList.contains('a-price') || el.classList.contains('a-price-text-price')
              );
              if (priceLike.length >= 1) {
                console.log(`[Graffiti Extension] Found container with price-like children after ${steps} steps:`, node.className);
                console.log('[Graffiti-DIAG] Price-like children:', priceLike.map((el: Element) => ({
                  tag: el.tagName,
                  class: el.className,
                  id: el.id
                })));
                return node;
              }
            }
            node = node.parentNode;
          }
          console.log('[Graffiti Extension] No price container found after ascending to body');
          return null;
        }
        let detectionRoot = root;
        const ascended = findLikelyPriceContainer(root);
        if (ascended) {
          detectionRoot = ascended;
          console.log('[Graffiti Extension] Using ascended container as detection root');
          console.log('[Graffiti-DIAG] Ascended container:', {
            tag: ascended.tagName,
            class: ascended.className,
            id: ascended.id,
            childCount: ascended.children.length
          });
        }
        // --- End Diagnostic Logging ---
        found = extractAllPricesFromSubtree(detectionRoot);
      }
    }

    // --- Enhanced Diagnostic Logging: Detected Prices ---
    if (found.length === 0) {
      console.log('[Graffiti-DIAG] Detected prices: [] (no price found)');
    } else {
      console.log('[Graffiti-DIAG] Detected prices:', found.map(f => ({
        price: f.priceStr,
        nodeCount: f.nodes.length,
        nodeSnippets: f.nodes.map((n: Node) => n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML.slice(0, 100) : n.textContent),
        parentContext: f.nodes[0]?.parentElement ? {
          tag: f.nodes[0].parentElement.tagName,
          class: f.nodes[0].parentElement.className,
          id: f.nodes[0].parentElement.id
        } : null
      })));
    }
    // --- End Enhanced Diagnostic Logging ---

    if (found.length === 0) {
      console.log('[Graffiti Extension] Detected prices: [] (no price found)');
      // Create fallback overlay if no price found
      if (root instanceof Element) {
        const rect = root.getBoundingClientRect();
        try {
          console.log('[Graffiti Extension] Creating fallback overlay');
          overlayManager.createOverlay({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            type: 'fallback',
            position: 'auto',
            targetElement: root as HTMLElement,
            rect,
            price: '',
            style: overlayManager.getStyle('default')
          });
          console.log('[Graffiti Extension] Fallback overlay created successfully');
        } catch (error) {
          console.error('[Graffiti Extension] Error creating fallback overlay:', error);
        }
      }
    } else {
      console.log('[Graffiti Extension] Detected prices:', found.map(f => ({
        price: f.priceStr,
        nodeCount: f.nodes.length,
        containerType: f.container?.nodeType,
        containerName: f.container?.nodeName,
        containerClass: f.container?.className
      })));
      // Send response with container information
      sendResponse({ 
        detected: found.map(f => ({
          price: f.priceStr,
          node: f.nodes[0],
          container: f.container
        }))
      });
      // --- Conversion Calculation Logging ---
      (async () => {
        try {
          console.log('[Graffiti Extension] Starting BTC conversion process');
          const btcUsdRate = await fetchBtcUsdRate();
          if (btcUsdRate === null) {
            console.log('[Graffiti Extension] BTC/USD rate fetch failed.');
            return;
          }
          console.log(`[Graffiti Extension] BTC/USD rate: $${btcUsdRate}`);
          
          console.log('[Graffiti Extension] Starting price conversion loop');
          for (const f of found) {
            try {
              console.log('[Graffiti Extension] Processing price:', f.priceStr);
              const { value, currency } = parsePrice(f.priceStr);
              if (currency !== 'USD') {
                console.log(`[Graffiti Extension] Skipping non-USD price: ${f.priceStr}`);
                continue;
              }
              const btcDisplay = usdToBtcAndSats(value, btcUsdRate);
              console.log(`[Graffiti Extension] Conversion: ${f.priceStr} (USD ${value}) / $${btcUsdRate} = BTC value. Display: ${btcDisplay}`);
              
              // Find the price container (parent element that contains all price nodes)
              const priceContainer = f.container || f.nodes[0].closest('.a-price') || f.nodes[0].parentElement;
              
              if (priceContainer) {
                console.log('[Graffiti Extension] Creating overlay for price:', {
                  price: f.priceStr,
                  btcValue: btcDisplay,
                  containerType: priceContainer.nodeType,
                  containerName: priceContainer.nodeName,
                  containerClass: priceContainer.className
                });
                
                // Helper to find the best anchor for overlay
                function findBestPriceAnchor(container: HTMLElement, priceStr: string): HTMLElement {
                  const containerRect = container.getBoundingClientRect();
                  let bestAnchor = container;
                  let bestWidth = containerRect.width;
                  // Search for child elements whose text matches the price string
                  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
                  let node: Node | null = walker.currentNode;
                  while (node) {
                    if (node instanceof HTMLElement) {
                      const text = node.textContent?.replace(/\s+/g, '').trim();
                      const price = priceStr.replace(/\s+/g, '').trim();
                      if (text === price) {
                        const rect = node.getBoundingClientRect();
                        if (rect.width < bestWidth) {
                          bestAnchor = node;
                          bestWidth = rect.width;
                        }
                      }
                    }
                    node = walker.nextNode();
                  }
                  // If the best anchor is much smaller than the container, use it
                  if (containerRect.width / bestWidth > 2.5) {
                    return bestAnchor;
                  }
                  return container;
                }
                const anchor = findBestPriceAnchor(priceContainer as HTMLElement, f.priceStr);
                const rect = anchor.getBoundingClientRect();
                console.log('[Graffiti Extension] Got bounding rect:', {
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height
                });

                try {
                  console.log('[Graffiti Extension] Calling overlayManager.createOverlay');
                  overlayManager.createOverlay({
                    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                    type: 'price',
                    position: 'auto',
                    targetElement: anchor,
                    rect,
                    price: `${f.priceStr} / ${btcDisplay}`,
                    style: {
                      theme: {
                        primary: '#FF6B00',
                        secondary: '#FFB800',
                        background: '#FFFFFF',
                        text: '#000000'
                      },
                      animation: {
                        duration: 300,
                        easing: 'ease-in-out'
                      }
                    }
                  });
                  console.log('[Graffiti Extension] Overlay creation completed successfully');
                } catch (error) {
                  console.error('[Graffiti Extension] Error creating overlay:', error);
                  // Log the full error details
                  if (error instanceof Error) {
                    console.error('[Graffiti Extension] Error details:', {
                      name: error.name,
                      message: error.message,
                      stack: error.stack
                    });
                  }
                }
              } else {
                console.log('[Graffiti Extension] Could not find price container for node:', f.nodes[0]);
              }
            } catch (e) {
              console.error('[Graffiti Extension] Error processing price:', e);
              if (e instanceof Error) {
                console.error('[Graffiti Extension] Error details:', {
                  name: e.name,
                  message: e.message,
                  stack: e.stack
                });
              }
            }
          }
        } catch (e) {
          console.error('[Graffiti Extension] Error in BTC conversion process:', e);
          if (e instanceof Error) {
            console.error('[Graffiti Extension] Error details:', {
              name: e.name,
              message: e.message,
              stack: e.stack
            });
          }
        }
      })().catch(e => {
        console.error('[Graffiti Extension] Unhandled promise rejection in BTC conversion:', e);
        if (e instanceof Error) {
          console.error('[Graffiti Extension] Error details:', {
            name: e.name,
            message: e.message,
            stack: e.stack
          });
        }
      });
      // --- End Conversion Calculation Logging ---
    }
    console.log('[Graffiti Extension] ===== Price Detection Complete =====\n');
    sendResponse({ received: true });

    // Clean up data-clicked attributes
    if (root instanceof Element) {
      root.removeAttribute('data-clicked');
      const parentLi = root.closest('li');
      if (parentLi) {
        parentLi.removeAttribute('data-clicked');
      }
    }

    return true;
  }
  if (message && message.type === 'GRAFFITI_OVERLAY' && message.rect) {
    // Try to find the target node from the current selection
    const selection = window.getSelection();
    let node = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
    if (!node) {
      sendResponse({ overlay: false });
      return true;
    }
    injectGraffitiWithTracking(message.rect, message.graffitiText || 'Graffiti', node);
    sendResponse({ overlay: true });
    return true;
  }
  if (message.type === 'PRICE_DETECTED') {
    console.log('[ContentScript] Received price detection message:', message);
    const { price, node, container } = message;
    
    // Create overlay for the detected price
    if (price && node) {
      console.log('[ContentScript] Creating overlay for price:', {
        price,
        nodeType: node.nodeType,
        nodeName: node.nodeName,
        containerType: container?.nodeType,
        containerName: container?.nodeName,
        containerClass: container?.className
      });
      
      // Use the container if available, otherwise fall back to node's parent
      const targetContainer = container || (node instanceof Element ? node : node.parentElement);
      if (!targetContainer) {
        console.error('[ContentScript] No container element found for node:', node);
        return;
      }
      
      // Get the bounding rectangle of the container
      const rect = targetContainer.getBoundingClientRect();
      console.log('[ContentScript] Container rectangle:', {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
      
      // Create the overlay
      try {
        const overlayManager = new OverlayManager();
        overlayManager.createOverlay({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          type: 'price',
          position: 'auto',
          style: {
            theme: {
              primary: '#FF6B00',
              secondary: '#FFB800',
              background: '#FFFFFF',
              text: '#000000'
            },
            animation: {
              duration: 300,
              easing: 'ease-in-out'
            }
          },
          targetElement: targetContainer as HTMLElement,
          rect: rect,
          price: String(price)
        });
        console.log('[ContentScript] Overlay created successfully with container:', {
          type: targetContainer.nodeType,
          name: targetContainer.nodeName,
          class: targetContainer.className
        });
      } catch (error) {
        console.error('[ContentScript] Error creating overlay:', error);
      }
    }
  }
  // Placeholder: will handle graffiti overlay in future steps
  sendResponse({ received: true });
});

(window as any).isLikelyPrice = isLikelyPrice;

console.log('[Graffiti Extension] Content script loaded'); 
console.log('[Graffiti Extension] Content script loaded'); 