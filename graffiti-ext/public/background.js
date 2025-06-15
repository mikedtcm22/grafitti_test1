// Placeholder background script for Graffiti Extension

chrome.runtime.onInstalled.addListener(() => {
  // Remove any old context menus first
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "convertToBTC",
      title: "Convert to BTC",
      contexts: ["all"]
    }, () => {
      console.log('[Graffiti Extension] Context menu created');
    });
  });
});

// Only handle the 'convertToBTC' menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "convertToBTC") {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "convertToBTC",
        text: info.selectionText
      });
    }
  }
});