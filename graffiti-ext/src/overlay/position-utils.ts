export interface PositionOptions {
  originalRect: DOMRect;
  fontSize: number;
  btcTextWidth?: number; // estimated width of BTC text
}

export interface TwoOClockPosition {
  textX: number;
  textY: number;
  viewBoxAdjustment: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Calculate "two-o'clock" position for BTC text relative to original price
 * This places text up and to the right at approximately 45-degree angle
 */
export function calculateTwoOClockPosition({ 
  originalRect, 
  fontSize, 
  btcTextWidth = 0 
}: PositionOptions): TwoOClockPosition {
  // Two-o'clock positioning: up and right from original price
  // Base position: right edge + small gap, top edge - small offset
  const baseTextX = originalRect.width + 8; // 8px gap from right edge
  const baseTextY = -fontSize * 0.6; // Move up by 60% of font size
  
  // Collision detection with viewport (simplified)
  const viewportWidth = window.innerWidth;
  
  // Get current scroll position
  const scrollX = window.scrollX || 0;
  const scrollY = window.scrollY || 0;
  
  // Calculate absolute position where text would appear
  const absoluteTextX = originalRect.left + scrollX + baseTextX;
  const absoluteTextY = originalRect.top + scrollY + baseTextY;
  
  // Check if text would overflow viewport
  let adjustedTextX = baseTextX;
  let adjustedTextY = baseTextY;
  
  // If text would go off right edge, move it left
  if (absoluteTextX + btcTextWidth > scrollX + viewportWidth) {
    adjustedTextX = Math.max(5, viewportWidth - (originalRect.left + scrollX) - btcTextWidth - 10);
  }
  
  // If text would go off top edge, move it down
  if (absoluteTextY < scrollY) {
    adjustedTextY = -fontSize * 0.2; // Less aggressive upward offset
  }
  
  // Calculate viewBox adjustments to accommodate the new position
  const minX = Math.min(0, adjustedTextX - 10);
  const minY = Math.min(0, adjustedTextY - fontSize);
  const maxX = Math.max(originalRect.width, adjustedTextX + btcTextWidth + 10);
  const maxY = Math.max(fontSize * 1.5, adjustedTextY + fontSize);
  
  return {
    textX: adjustedTextX,
    textY: adjustedTextY,
    viewBoxAdjustment: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  };
}

// Configuration for getVisiblePriceRect
const CONFIG = {
  maxDepth: 10, // Maximum DOM depth to traverse
  includeHidden: false // Whether to include hidden elements
};

/**
 * Returns the most accurate bounding rect for a visible price element,
 * handling multi-line, composite, and inline price nodes.
 *
 * - Traverses down to the most visible text node(s)
 * - Uses Range.getClientRects() for multi-line support
 * - Ignores visually hidden/zero-size nodes
 * - Returns rect and mid-line value for overlay centering
 */
export function getVisiblePriceRect(element: HTMLElement): { rect: DOMRect, midLineY: number } {
  // Helper: is node visible?
  function isVisible(node: HTMLElement): boolean {
    const style = window.getComputedStyle(node);
    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      node.offsetWidth > 0 &&
      node.offsetHeight > 0
    );
  }

  // Helper: find most visible text node
  function findVisibleTextNode(node: HTMLElement, depth = 0): HTMLElement | null {
    if (depth > CONFIG.maxDepth) return null;
    
    // Check if this node has text content and is visible
    if (node.textContent?.trim() && isVisible(node)) {
      return node;
    }
    
    // Traverse children
    for (const child of Array.from(node.children)) {
      if (child instanceof HTMLElement) {
        const result = findVisibleTextNode(child, depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  }

  // Find the most visible text node
  const target = findVisibleTextNode(element);
  
  // Fallback to original element if no visible text node found
  const finalTarget = target || element;
  
  // Log the node being used for bounding box
  console.log('[Graffiti] getVisiblePriceRect: using node:', finalTarget, finalTarget.outerHTML);
  
  // Get bounding rect
  let rect = finalTarget.getBoundingClientRect();
  
  // Try to get more accurate rect using Range API (only in browser environment)
  if (typeof window !== 'undefined' && window.document && target && target.textContent?.trim()) {
    try {
      const range = document.createRange();
      // Ensure target is a valid Node
      if (target.nodeType === Node.ELEMENT_NODE || target.nodeType === Node.TEXT_NODE) {
        range.selectNodeContents(target);
        const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
        if (rects.length === 1) {
          rect = rects[0] as DOMRect;
        } else if (rects.length > 1) {
          // Multi-line text: use the first and last rect to compute center
          const firstRect = rects[0];
          const lastRect = rects[rects.length - 1];
          rect = new DOMRect(
            firstRect.left,
            firstRect.top,
            Math.max(firstRect.width, lastRect.width),
            lastRect.bottom - firstRect.top
          );
        }
      }
    } catch (error) {
      // Fallback to getBoundingClientRect if Range API fails
      console.warn('Range API failed, using getBoundingClientRect fallback:', error);
    }
  }
  
  // Compute mid-line Y position
  const midLineY = rect.top + rect.height / 2;
  
  return { rect, midLineY };
} 