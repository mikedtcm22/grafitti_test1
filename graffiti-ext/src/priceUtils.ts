// === PRICE DETECTION UTILITIES ===
function isLikelyPrice(text: string): boolean {
  if (!text) return false;
  // Exclude euro and other non-USD currency symbols
  if (/€|eur|£|gbp|¥|jpy|₽|rub|₹|inr/i.test(text)) return false;
  const pricePatterns = [
    /\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/, // $10.99, $1,000.00
    /\d{1,3}(,\d{3})*(\.\d{2})?\s?USD/i, // 10.99 USD
    /\d{1,3}(,\d{3})*(\.\d{2})/, // 10.99, 1,234.56 (US plain)
  ];
  const cleaned = text.trim();
  return pricePatterns.some((re) => re.test(cleaned));
}

function parsePrice(text: string): { value: number, currency: string } {
  // Normalize 'US $' and similar prefixes to '$'
  let cleaned = text.replace(/US\s*\$/i, '$');
  // Strip '+' from prices
  cleaned = cleaned.replace(/\+/g, '');
  // Extract only the first price-like substring (e.g., from '$41.62/mo. for 24 mo.' get '$41.62')
  const priceMatch = cleaned.match(/\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/);
  if (priceMatch) {
    cleaned = priceMatch[0];
  }
  let currency = 'USD';
  if (cleaned.includes('$') || /usd/i.test(cleaned)) currency = 'USD';
  cleaned = cleaned.replace(/,/g, '');
  const value = parseFloat(cleaned.replace(/[^\d.]/g, ''));
  if (isNaN(value)) throw new Error('Could not parse price value');
  return { value, currency };
}

function getCombinedPriceString(node: Node): { priceStr: string, nodes: Node[] } {
  let curr = node;
  let left1 = curr.previousSibling;
  let left2 = left1 && left1.previousSibling;
  let right1 = curr.nextSibling;
  let right2 = right1 && right1.nextSibling;
  const combos = [
    [left2, left1, curr, right1, right2],
    [left1, curr, right1, right2],
    [left2, left1, curr, right1],
    [left1, curr, right1],
    [left2, left1, curr],
    [curr, right1, right2],
    [curr, right1],
    [left1, curr],
    [curr]
  ];
  for (const combo of combos) {
    const nodes = combo.filter(Boolean) as Node[];
    if (!nodes.length) continue;
    const text = nodes.map(n => n.textContent).join('').trim();
    
    // NEW: Extract only the price from the text
    const priceMatch = text.match(/\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/);
    if (priceMatch) {
      return { priceStr: priceMatch[0], nodes };
    }
  }
  
  // If no price found in combinations, try the node itself
  const text = (node.textContent || '').trim();
  const priceMatch = text.match(/\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/);
  if (priceMatch) {
    return { priceStr: priceMatch[0], nodes: [node] };
  }
  
  return { priceStr: '', nodes: [node] };
}

function findPriceNodes(root: Node): { nodes: Node[], priceStr: string }[] {
  const priceNodes: { nodes: Node[], priceStr: string }[] = [];
  const seen = new Set<Node>();
  function walk(node: Node) {
    if ((node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) && !seen.has(node)) {
      const { priceStr, nodes } = getCombinedPriceString(node);
      if (isLikelyPrice(priceStr)) {
        nodes.forEach(n => seen.add(n));
        priceNodes.push({ nodes, priceStr });
        return;
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(walk);
    }
  }
  walk(root);
  return priceNodes;
}

/**
 * Detects if a string is likely a price range (e.g., "$5.99 - $15.99", "from $5.99 to $15.99", etc.).
 */
function isLikelyPriceRange(text: string): boolean {
  if (!text) return false;
  const patterns = [
    /\$\d[\d,.]*\s*[-–—]\s*\$\d[\d,.]*/i, // $5.99 - $15.99
    /from\s*\$\d[\d,.]*\s*to\s*\$\d[\d,.]*/i, // from $5.99 to $15.99
    /between\s*\$\d[\d,.]*\s*and\s*\$\d[\d,.]*/i, // between $5.99 and $15.99
    /\$\d[\d,.]*\s*to\s*\$\d[\d,.]*/i, // $5.99 to $15.99
  ];
  const cleaned = text.trim();
  return patterns.some((re) => re.test(cleaned));
}

function extractPricesFromRange(text: string): string[] {
  // Try all patterns and extract the two price values
  const patterns = [
    /\$(\d[\d,.]*)\s*[-–—]\s*\$(\d[\d,.]*)/i,
    /from\s*\$(\d[\d,.]*)\s*to\s*\$(\d[\d,.]*)/i,
    /between\s*\$(\d[\d,.]*)\s*and\s*\$(\d[\d,.]*)/i,
    /\$(\d[\d,.]*)\s*to\s*\$(\d[\d,.]*)/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      return [`$${match[1]}`, `$${match[2]}`];
    }
  }
  return [];
}

interface ConfidenceScore {
  score: number;
  factors: Record<string, number>;
}

interface PriceConfidence {
  structural: ConfidenceScore;
  content: ConfidenceScore;
  context: ConfidenceScore;
  score: number;
}

function calculateStructuralConfidence(node: Node): ConfidenceScore {
  const factors: Record<string, number> = {};
  let score = 0;

  if (typeof (node as any).tagName === 'string') {
    const el = node as Element;
    // Check for price-specific classes
    if (el.classList.contains('price') || 
        el.classList.contains('product-price') ||
        el.getAttribute('data-automation-id') === 'product-price') {
      score += 30;
      factors['price-class'] = 30;
    }

    // Check for price-specific attributes
    if (el.getAttribute('itemprop') === 'price' ||
        el.getAttribute('data-price') ||
        el.getAttribute('data-testid')?.includes('price')) {
      score += 25;
      factors['price-attribute'] = 25;
    }

    // Check for common price container classes
    if (el.classList.contains('price-container') ||
        el.classList.contains('product-price-container')) {
      score += 20;
      factors['price-container'] = 20;
    }

    // NEW: Add list item context awareness
    const clickedLi = el.closest('li[data-clicked="true"]');
    const currentLi = el.closest('li');
    if (clickedLi && currentLi === clickedLi) {
      score += 35;
      factors['correct-list-item'] = 35;
    } else if (currentLi && !clickedLi) {
      // If we're in a list item but not the clicked one, reduce confidence
      score -= 25;
      factors['wrong-list-item'] = -25;
    }

    // NEW: Fallback - if element has price-like text, give baseline confidence
    const text = el.textContent?.trim() || '';
    if (isLikelyPrice(text)) {
      score += 40;
      factors['price-text-fallback'] = 40;
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Structural] Fallback: element with price-like text but no class/id:', el, 'Score:', score);
    }
  }

  return { score, factors };
}

function calculateContentConfidence(node: Node): ConfidenceScore {
  const factors: Record<string, number> = {};
  let score = 0;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() || '';
    if (isLikelyPrice(text)) {
      score += 40;
      factors['price-text'] = 40;
    }
  } else if (typeof (node as any).tagName === 'string') {
    const text = node.textContent?.trim() || '';
    if (isLikelyPrice(text)) {
      score += 35;
      factors['price-text'] = 35;
    }
  }

  return { score, factors };
}

function calculateContextConfidence(node: Node, clickedNode: Node): ConfidenceScore {
  const factors: Record<string, number> = {};
  let score = 0;

  // Calculate distance from clicked node
  const distance = getNodeDistance(node, clickedNode);
  if (distance <= 2) {
    score += 30;
    factors['proximity'] = 30;
  } else if (distance <= 4) {
    score += 20;
    factors['proximity'] = 20;
  } else if (distance <= 6) {
    score += 10;
    factors['proximity'] = 10;
  }

  // Check if node is visible
  if (typeof (node as any).tagName === 'string') {
    const el = node as Element;
    const style = window.getComputedStyle(el);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      score += 20;
      factors['visibility'] = 20;
    }
  }

  return { score, factors };
}

function calculatePriceConfidence(node: Node, clickedNode: Node): PriceConfidence {
  const structuralConfidence = calculateStructuralConfidence(node);
  const contentConfidence = calculateContentConfidence(node);
  const contextConfidence = calculateContextConfidence(node, clickedNode);
  
  // Boost confidence for Walmart price containers
  if (typeof (node as any).tagName === 'string') {
    const el = node as Element;
    if (el.getAttribute('data-automation-id') === 'product-price' ||
        el.closest('[data-automation-id="product-price"]')) {
      structuralConfidence.score += 20;
    }
    // Boost confidence for main price elements
    if (el.classList.contains('mr1') && 
        el.classList.contains('mr2-xl') && 
        el.classList.contains('b') && 
        el.classList.contains('black')) {
      structuralConfidence.score += 15;
    }
  }

  return {
    structural: structuralConfidence,
    content: contentConfidence,
    context: contextConfidence,
    score: structuralConfidence.score + contentConfidence.score + contextConfidence.score
  };
}

function getNodeDistance(node1: Node, node2: Node): number {
  let distance = 0;
  let current: Node | null = node1;
  
  while (current && current !== node2) {
    current = current.parentNode;
    distance++;
  }
  
  return current === node2 ? distance : Infinity;
}

interface DirectionResult {
  bestConfidence: number;
  bestPrice: { priceStr: string, nodes: Node[] } | null;
  distance: number;  // Steps from clicked node
}

function traverseInDirection(
  startNode: Node,
  direction: 'up' | 'down' | 'sibling',
  clickedNode: Node,
  visited: Set<Node>
): DirectionResult {
  let bestConfidence = 0;
  let bestPrice = null;
  let consecutiveDecreases = 0;
  let current: Node | null = startNode;
  let distance = 0;
  const MAX_CONSECUTIVE_DECREASES = 3;
  const SIGNIFICANT_INCREASE_THRESHOLD = 5;
  const MIN_CONFIDENCE_DIFFERENCE = 2;

  // Get the clicked list item context
  const clickedLi = clickedNode instanceof Element ? clickedNode.closest('li[data-clicked="true"]') : null;

  // NEW: Helper function to explore a node and its children recursively
  function exploreNode(node: Node): void {
    if (!node || visited.has(node)) return;
    visited.add(node);

    // Check if we've crossed list item boundaries
    if (node instanceof Element) {
      const currentLi = node.closest('li');
      if (clickedLi && currentLi && currentLi !== clickedLi) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Context] Stopped traversal at different <li> boundary:', currentLi);
        return;
      }
    }

    // Check for prices in this node
    const prices = extractAllPricesFromSubtree(node, visited);
    if (prices.length > 0) {
      const confidence = calculatePriceConfidence(node, clickedNode);
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Candidate] Node:', node, 'Confidence:', confidence, 'Price:', prices[0]);

      if (confidence.score > bestConfidence) {
        bestConfidence = confidence.score;
        bestPrice = prices[0];
        consecutiveDecreases = 0;
      } else if (confidence.score > bestConfidence - SIGNIFICANT_INCREASE_THRESHOLD) {
        consecutiveDecreases = 0;
      } else if (Math.abs(confidence.score - bestConfidence) < MIN_CONFIDENCE_DIFFERENCE) {
        consecutiveDecreases = 0;
      } else {
        consecutiveDecreases++;
      }
    }

    // If this is an element node, explore its children
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Traversal] Exploring children of:', element.tagName, 'Class:', element.className);
      
      // Explore all children
      for (const child of Array.from(element.children)) {
        exploreNode(child);
      }
    }
  }

  // Main traversal loop
  while (current && consecutiveDecreases < MAX_CONSECUTIVE_DECREASES && !visited.has(current)) {
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Traversal] Current node:', (current as Element).tagName, 'Direction:', direction);

    // Explore the current node and its children
    exploreNode(current);

    // Move in the specified direction
    switch (direction) {
      case 'up':
        if (current.parentNode) {
          // Explore siblings of the parent
          const siblings = Array.from(current.parentNode.childNodes);
          for (const sibling of siblings) {
            if (!visited.has(sibling)) {
              exploreNode(sibling);
            }
          }
        }
        current = current.parentNode;
        break;

      case 'down':
        // Explore all children of the current node
        if (current.nodeType === Node.ELEMENT_NODE) {
          const element = current as Element;
          for (const child of Array.from(element.children)) {
            exploreNode(child);
          }
        }
        current = current.firstChild;
        break;

      case 'sibling':
        // Explore the current sibling and its children
        if (current.nodeType === Node.ELEMENT_NODE) {
          const element = current as Element;
          // eslint-disable-next-line no-console
          console.log('[PriceDetection][Traversal] Exploring sibling:', element.tagName, 'Class:', element.className);
          exploreNode(current);
        }
        current = current.nextSibling;
        break;
    }
    distance++;
  }

  // eslint-disable-next-line no-console
  console.log('[PriceDetection][Traversal] Finished traversal. Best confidence:', bestConfidence, 'Best price:', bestPrice);
  return { bestConfidence, bestPrice, distance };
}

function findBestPriceWithConfidence(clickedNode: Node, visited: Set<Node> = new Set<Node>()): { priceStr: string, nodes: Node[], container: Element | null } | null {
  const MAX_DISTANCE = 5;  // Maximum steps from clicked node
  const MIN_CONFIDENCE = 50;  // Minimum confidence to consider

  // Try all directions
  const upResult = traverseInDirection(clickedNode, 'up', clickedNode, visited);
  const downResult = traverseInDirection(clickedNode, 'down', clickedNode, visited);
  const siblingResult = traverseInDirection(clickedNode, 'sibling', clickedNode, visited);

  // Log all direction results for debugging
  // eslint-disable-next-line no-console
  console.log('[PriceDetection][Confidence] Direction results:', {
    up: upResult,
    down: downResult,
    sibling: siblingResult
  });

  // Filter results by minimum confidence and maximum distance
  const validResults = [upResult, downResult, siblingResult]
    .filter(r => r.bestConfidence >= MIN_CONFIDENCE && r.distance <= MAX_DISTANCE);

  if (validResults.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Confidence] No valid price found. Highest confidence:', Math.max(upResult.bestConfidence, downResult.bestConfidence, siblingResult.bestConfidence));
    return null;  // No valid price found
  }

  // Sort by confidence (descending) and distance (ascending)
  validResults.sort((a, b) => {
    if (a.bestConfidence === b.bestConfidence) {
      return a.distance - b.distance;  // Tiebreaker: closer price wins
    }
    return b.bestConfidence - a.bestConfidence;
  });

  // eslint-disable-next-line no-console
  console.log('[PriceDetection][Confidence] Best candidate selected:', validResults[0].bestPrice, 'with confidence:', validResults[0].bestConfidence, 'distance:', validResults[0].distance);

  const bestPrice = validResults[0].bestPrice;
  if (bestPrice) {
    return {
      ...bestPrice,
      container: clickedNode instanceof Element ? clickedNode : null
    };
  }
  return null;
}

function extractAllPricesFromSubtree(root: Node, visited: Set<Node> = new Set<Node>()): { priceStr: string, nodes: Node[], container: Element | null }[] {
  if (visited.has(root)) {
    return [];
  }
  visited.add(root);

  const clickedLi = root instanceof Element ? root.closest('li[data-clicked="true"]') : null;
  if (clickedLi) {
    const currentLi = root instanceof Element ? root.closest('li') : null;
    if (currentLi && currentLi !== clickedLi) {
      return [];
    }
  }

  // Log every candidate node for debugging
  // eslint-disable-next-line no-console
  console.log('[PriceDetection][Candidate] Analyzing node:', root, 'Tag:', (root as any).tagName, 'Class:', (root as Element).className, 'ID:', (root as Element).id);

  function isHidden(el: HTMLElement): boolean {
    return (
      el.classList.contains('a-offscreen') ||
      el.getAttribute('aria-hidden') === 'true' ||
      window.getComputedStyle(el).display === 'none'
    );
  }

  // If we have a clicked node, use confidence-based detection
  if (typeof (root as any).tagName === 'string' && (root as Element).getAttribute('data-clicked') === 'true') {
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Entry] Entered data-clicked block for node:', (root as Element).outerHTML);
    let bestPrice = null;
    if ((root as Element).tagName.toLowerCase() === 'a') {
      bestPrice = findBestPriceWithConfidence(root, visited);
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] After confidence-based search on <a>, bestPrice:', bestPrice);
      if (bestPrice) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Entry] Returning from confidence-based search on <a>');
        return [bestPrice];
      }
      const parent = (root as Element).parentElement;
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] Entering fallback for <a> element:', (root as Element).outerHTML);
      if (parent) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Entry] Fallback parent:', parent.outerHTML);
        const priceContainers = parent.querySelectorAll('[data-automation-id="product-price"]');
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Entry] Fallback found', priceContainers.length, 'price containers');
        if (priceContainers.length > 0) {
          for (const priceContainer of priceContainers) {
            // Avoid recursing into the same <a> node or already-visited nodes
            if (priceContainer === root || visited.has(priceContainer)) continue;
            // eslint-disable-next-line no-console
            console.log('[PriceDetection][Entry] Fallback checking price container:', priceContainer.outerHTML);
            const prices = extractAllPricesFromSubtree(priceContainer, visited);
            if (prices.length > 0) {
              // eslint-disable-next-line no-console
              console.log('[PriceDetection][Entry] Fallback returning price:', prices[0].priceStr);
              return prices;
            }
          }
        }
      }
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] Fallback for <a> element found no prices, returning []');
      return [];
    } else {
      bestPrice = findBestPriceWithConfidence(root, visited);
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] After confidence-based search (non-<a>), bestPrice:', bestPrice);
      if (bestPrice) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Entry] Returning from confidence-based search (non-<a>)');
        return [bestPrice];
      }
    }
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Entry] End of data-clicked block, returning undefined');
  }

  // Special handling for Walmart price containers
  if (
    typeof (root as any).tagName === 'string' &&
    ((root as Element).getAttribute('data-automation-id') === 'product-price' ||
      ((root as Element).closest('li') && (root as Element).closest('[data-automation-id="product-price"]')))
  ) {
    const priceContainer = (root as Element).getAttribute('data-automation-id') === 'product-price'
      ? root
      : (root as Element).closest('[data-automation-id="product-price"]');
    if (!priceContainer) return [];
    const mainPriceEl = (priceContainer as Element).querySelector('.mr1.mr2-xl.b.black.lh-copy.f5.f4-l');
    if (mainPriceEl && mainPriceEl.textContent) {
      const priceStr = mainPriceEl.textContent.trim();
      if (isLikelyPrice(priceStr)) {
        console.log('[PriceDetection][Candidate] Found price in Walmart main price element:', priceStr);
        return [{ priceStr, nodes: [mainPriceEl], container: priceContainer as Element }];
      }
    }
    const screenReaderPriceEl = (priceContainer as Element).querySelector('.w_iUH7');
    if (screenReaderPriceEl && screenReaderPriceEl.textContent) {
      const priceStr = screenReaderPriceEl.textContent.trim();
      if (isLikelyPrice(priceStr)) {
        console.log('[PriceDetection][Candidate] Found price in Walmart screen reader element:', priceStr);
        return [{ priceStr, nodes: [screenReaderPriceEl], container: priceContainer as Element }];
      }
    }
    const textNodes: Node[] = [];
    function collectTextNodes(n: Node) {
      if (n.nodeType === Node.TEXT_NODE) {
        textNodes.push(n);
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        if (isHidden(el)) return;
        n.childNodes.forEach(collectTextNodes);
      }
    }
    collectTextNodes(priceContainer);
    for (const node of textNodes) {
      const { priceStr, nodes } = getCombinedPriceString(node);
      if (isLikelyPrice(priceStr)) {
        if (!priceStr.includes('/')) {
          console.log('[PriceDetection][Candidate] Found price in Walmart text node:', priceStr);
          return [{ priceStr, nodes, container: priceContainer as Element }];
        }
      }
    }
    return [];
  }

  // NEW: If root is inside a <li> but not a price container, ascend to <li> and search for price container
  if (
    typeof (root as any).tagName === 'string' &&
    (root as Element).closest('li') &&
    !(root as Element).closest('[data-automation-id="product-price"]')
  ) {
    const li = (root as Element).closest('li');
    if (li) {
      const priceContainer = li.querySelector('[data-automation-id="product-price"]');
      if (priceContainer) {
        return extractAllPricesFromSubtree(priceContainer, visited);
      }
    }
  }

  // Special handling for Amazon price containers
  if (
    typeof (root as any).tagName === 'string' &&
    ((root as Element).classList.contains('a-price') || (root as Element).classList.contains('a-price-text-price'))
  ) {
    // Only consider visible text nodes
    function collectAmazonVisibleTextNodes(n: Node): Node[] {
      const out: Node[] = [];
      function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
          out.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.classList.contains('a-offscreen') || window.getComputedStyle(el).display === 'none') return;
          node.childNodes.forEach(walk);
        }
      }
      walk(n);
      return out;
    }
    const visibleNodes = collectAmazonVisibleTextNodes(root);
    const combinedText = visibleNodes.map(n => n.textContent || '').join('').replace(/\s+/g, '').trim();
    if (isLikelyPrice(combinedText)) {
      console.log('[PriceDetection][Candidate] Found price in Amazon price container:', combinedText);
      return [{ priceStr: combinedText, nodes: visibleNodes, container: root as Element }];
    }
    // If no price found, return []
    return [];
  }

  // If the root node is an <a> or <button>, immediately trigger the fallback
  if (typeof (root as any).tagName === 'string' && ((root as Element).tagName.toLowerCase() === 'a' || (root as Element).tagName.toLowerCase() === 'button')) {
    const parent = (root as Element).parentElement;
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Entry] Immediate fallback for <a>/<button> element:', (root as Element).outerHTML);
    if (parent) {
      const priceContainers = parent.querySelectorAll('[data-automation-id="product-price"]');
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] Fallback found', priceContainers.length, 'price containers');
      if (priceContainers.length > 0) {
        for (const priceContainer of priceContainers) {
          // eslint-disable-next-line no-console
          console.log('[PriceDetection][Entry] Fallback checking price container:', priceContainer.outerHTML);
          const prices = extractAllPricesFromSubtree(priceContainer, visited);
          if (prices.length > 0) {
            // eslint-disable-next-line no-console
            console.log('[PriceDetection][Entry] Fallback returning price:', prices[0].priceStr);
            return prices;
          }
        }
      }
    }
    // As a last resort, check the link/button itself for a price
    const priceStr = root.textContent?.trim() || '';
    if (isLikelyPrice(priceStr)) {
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Entry] Last resort: found price in <a>/<button> itself:', priceStr);
      return [{ priceStr, nodes: [root], container: null }];
    }
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Entry] Fallback for <a>/<button> found no prices, returning []');
    return [];
  }

  // First try: Look for price in the current element
  function tryFindPriceInElement(element: Node): { priceStr: string, nodes: Node[], container: Element | null }[] {
    const textNodes: Node[] = [];
    function collectTextNodes(n: Node) {
      if (n.nodeType === Node.TEXT_NODE) {
        textNodes.push(n);
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        if (isHidden(el)) return;
        n.childNodes.forEach(collectTextNodes);
      }
    }
    collectTextNodes(element);
    // Try to find a price or price range in the collected text nodes
    for (let i = 0; i < textNodes.length; i++) {
      const { priceStr, nodes } = getCombinedPriceString(textNodes[i]);
      if (isLikelyPriceRange(priceStr)) {
        // If it's a price range, split and return both
        const prices = extractPricesFromRange(priceStr);
        if (prices.length === 2) {
          console.log('[PriceDetection][Candidate] Found price range in element:', prices);
          return [
            { priceStr: prices[0], nodes, container: element instanceof Element ? element : null },
            { priceStr: prices[1], nodes, container: element instanceof Element ? element : null }
          ];
        }
      }
      if (isLikelyPrice(priceStr)) {
        console.log('[PriceDetection][Candidate] Found price in element:', priceStr);
        return [{ priceStr, nodes, container: element instanceof Element ? element : null }];
      }
    }
    return [];
  }

  // If root is an element, try to find price in it first
  if (typeof (root as any).tagName === 'string') {
    const prices = tryFindPriceInElement(root);
    if (prices.length > 0) {
      return prices;
    }
  }

  // If no price found in current element, try its children
  if (typeof (root as any).tagName === 'string') {
    for (const child of Array.from((root as Element).children)) {
      const prices = tryFindPriceInElement(child);
      if (prices.length > 0) {
        return prices;
      }
    }
  }

  // If still no price found, try siblings (but only if root is an element)
  if (typeof (root as any).tagName === 'string') {
    // Try next sibling
    let next = (root as Element).nextElementSibling;
    while (next) {
      const prices = tryFindPriceInElement(next);
      if (prices.length > 0) {
        return prices;
      }
      next = next.nextElementSibling;
    }

    // Try previous sibling
    let prev = (root as Element).previousElementSibling;
    while (prev) {
      const prices = tryFindPriceInElement(prev);
      if (prices.length > 0) {
        return prices;
      }
      prev = prev.previousElementSibling;
    }
  }

  // NEW: Fallback to search the entire subtree for any price-like strings
  // eslint-disable-next-line no-console
  console.log('[PriceDetection][Fallback] No price found in immediate context, searching entire subtree...');
  const allPrices: { priceStr: string, nodes: Node[], container: Element | null }[] = [];
  function searchSubtree(node: Node) {
    if (visited.has(node)) return;
    visited.add(node);
    const { priceStr, nodes } = getCombinedPriceString(node);
    if (isLikelyPrice(priceStr)) {
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Fallback] Found price in subtree:', priceStr, 'Node:', node);
      allPrices.push({ priceStr, nodes, container: null });
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from((node as Element).children)) {
        searchSubtree(child);
      }
    }
  }
  searchSubtree(root);
  if (allPrices.length > 0) {
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Fallback] Returning all prices found in subtree:', allPrices);
    return allPrices;
  }

  // If we get here, no price was found
  return [];
}

/**
 * Fetches the latest BTC/USD rate from CoinGecko.
 * Returns the rate as a number, or null if the fetch fails.
 */
async function fetchBtcUsdRate(): Promise<number | null> {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.bitcoin && typeof data.bitcoin.usd === 'number') {
      return data.bitcoin.usd;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Converts a USD value to BTC and formats it according to display rules:
 * - If BTC >= 0.01: show as '0.0123 BTC' (up to 6 decimals, strip trailing zeros)
 * - If 0.01 > BTC >= 0.00001: show as '123k sats' or '22.5k sats' (1 decimal for thousands)
 * - If BTC < 0.00001: show as whole-number 'sats'
 */
function usdToBtcAndSats(usd: number, btcUsdRate: number): string {
  if (!btcUsdRate || btcUsdRate <= 0) return 'BTC price unavailable';
  const btc = usd / btcUsdRate;
  const sats = btc * 100_000_000;
  if (btc >= 0.01) {
    // Show as BTC, up to 4 decimals, strip trailing zeros
    let btcStr = btc.toFixed(4).replace(/\.?(0+)$/, '');
    return `${btcStr} BTC`;
  } else if (sats >= 10000) {
    // Show as k sats, 1 decimal for thousands, no decimal if integer
    const kSats = sats / 1000;
    let kStr = Number.isInteger(kSats) ? kSats.toFixed(0) : kSats.toFixed(1).replace(/\.0$/, '');
    return `${kStr}k sats`;
  } else {
    // Show as whole sats, comma-separated
    return `${Math.round(sats).toLocaleString()} sats`;
  }
}

export { 
  isLikelyPrice, 
  isLikelyPriceRange, 
  parsePrice, 
  getCombinedPriceString, 
  findPriceNodes, 
  extractAllPricesFromSubtree, 
  fetchBtcUsdRate, 
  usdToBtcAndSats,
  calculatePriceConfidence
}; 