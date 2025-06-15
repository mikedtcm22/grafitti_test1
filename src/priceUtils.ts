function extractAllPricesFromSubtree(root: Node, visited: Set<Node> = new Set<Node>()): { priceStr: string, nodes: Node[] }[] {
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
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Candidate] Found price in Walmart main price element:', priceStr);
        return [{ priceStr, nodes: [mainPriceEl] }];
      }
    }
    const screenReaderPriceEl = (priceContainer as Element).querySelector('.w_iUH7');
    if (screenReaderPriceEl && screenReaderPriceEl.textContent) {
      const priceStr = screenReaderPriceEl.textContent.trim();
      if (isLikelyPrice(priceStr)) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Candidate] Found price in Walmart screen reader element:', priceStr);
        return [{ priceStr, nodes: [screenReaderPriceEl] }];
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
          // eslint-disable-next-line no-console
          console.log('[PriceDetection][Candidate] Found price in Walmart text node:', priceStr);
          return [{ priceStr, nodes }];
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
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Candidate] Found price in Amazon price container:', combinedText);
      return [{ priceStr: combinedText, nodes: visibleNodes }];
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
      return [{ priceStr, nodes: [root] }];
    }
    // eslint-disable-next-line no-console
    console.log('[PriceDetection][Entry] Fallback for <a>/<button> found no prices, returning []');
    return [];
  }

  // First try: Look for price in the current element
  function tryFindPriceInElement(element: Node): { priceStr: string, nodes: Node[] }[] {
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
          // eslint-disable-next-line no-console
          console.log('[PriceDetection][Candidate] Found price range in element:', prices);
          return [
            { priceStr: prices[0], nodes },
            { priceStr: prices[1], nodes }
          ];
        }
      }
      if (isLikelyPrice(priceStr)) {
        // eslint-disable-next-line no-console
        console.log('[PriceDetection][Candidate] Found price in element:', priceStr);
        return [{ priceStr, nodes }];
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
  const allPrices: { priceStr: string, nodes: Node[] }[] = [];
  function searchSubtree(node: Node) {
    if (visited.has(node)) return;
    visited.add(node);
    const { priceStr, nodes } = getCombinedPriceString(node);
    if (isLikelyPrice(priceStr)) {
      // eslint-disable-next-line no-console
      console.log('[PriceDetection][Fallback] Found price in subtree:', priceStr, 'Node:', node);
      allPrices.push({ priceStr, nodes });
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