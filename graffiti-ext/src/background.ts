// Background script for Graffiti Extension
// Handles Supabase operations and communicates with content scripts

import { createDAL } from './data/index';
import { Style } from './data/types';

console.log('[Graffiti Background] Background script initialized - CS-5 Debug Mode');
console.log('[Graffiti Background] Service worker is active at:', new Date().toISOString());

// Initialize DAL for background script (can use Supabase here)
const dal = createDAL();
console.log('[Graffiti Background] DAL initialized:', typeof dal);

// ===== Context Menu Registration (E19) =====
function registerContextMenus() {
  console.log('[Graffiti Background] Registering context menus');
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'CONVERT_TO_BTC',
      title: 'Convert to BTC',
      contexts: ['all']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Graffiti Background] contextMenus.create error:', chrome.runtime.lastError.message);
      } else {
        console.log('[Graffiti Background] Context menu "Convert to BTC" created');
      }
    });
  });
}

registerContextMenus();
// Test DAL initialization still valid above; duplicate removed

// Service worker installation and activation logging
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Graffiti Background] Extension installed/updated:', details.reason);
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Graffiti Background] Extension started up');
  registerContextMenus();
});

// Message handler for content script requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Graffiti Background] ===== MESSAGE RECEIVED =====');
  console.log('[Graffiti Background] Request:', request);
  console.log('[Graffiti Background] Sender tab ID:', sender?.tab?.id);
  console.log('[Graffiti Background] Sender URL:', sender?.tab?.url);
  console.log('[Graffiti Background] Request type:', request?.type);

  // CS-7.0: Health check ping/pong for diagnostic purposes
  if (request.type === 'PING') {
    console.log('[Graffiti Background] Handling PING request - Service Worker is alive');
    sendResponse({ 
      status: 'alive', 
      timestamp: Date.now(),
      serviceWorkerActive: true,
      message: 'Background script is responding normally'
    });
    return false; // Synchronous response
  }

  // Handle async operations properly
  if (request.type === 'GET_USER_STYLE') {
    console.log('[Graffiti Background] Handling GET_USER_STYLE request');
    handleGetUserStyle(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.type === 'GET_ALL_STYLES') {
    console.log('[Graffiti Background] Handling GET_ALL_STYLES request');
    handleGetAllStyles(sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.type === 'SET_ACTIVE_STYLE') {
    console.log('[Graffiti Background] Handling SET_ACTIVE_STYLE request');
    handleSetActiveStyle(request, sendResponse);
    return true; // Will respond asynchronously
  }

  console.log('[Graffiti Background] Unknown message type:', request?.type);
  return false; // Synchronous response or no response
});

// ===== Context Menu Click Handling (E20) =====
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'CONVERT_TO_BTC' && tab?.id) {
    console.log('[Graffiti Background] Context menu clicked – sending convertToBTC message');
    chrome.tabs.sendMessage(tab.id, {
      action: 'convertToBTC',
      selectionText: info.selectionText || ''
    });
  }
});

async function handleGetUserStyle(request: { userId?: string }, sendResponse: (response: any) => void) {
  console.log('[Graffiti Background] [getUserStyle] Starting...');
  try {
    console.log('[Graffiti Background] Getting user style for:', request.userId);

    // Try to get profile ID from chrome storage if not provided
    let profileId = request.userId;
    if (!profileId) {
      console.log('[Graffiti Background] No userId provided, checking chrome storage...');
      const result = await chrome.storage.local.get('profile');
      profileId = result.profile?.id;
      console.log('[Graffiti Background] Profile from storage:', result.profile);
    }

    if (!profileId) {
      console.log('[Graffiti Background] No profile found, returning null');
      sendResponse({ success: true, style: null });
      return;
    }

    // Try chrome storage first (offline fallback)
    let style = await getStyleFromStorage(profileId);
    if (style) {
      console.log('[Graffiti Background] Found style in storage:', style.name);
      sendResponse({ success: true, style, source: 'storage' });
      return;
    }

    // Fallback to Supabase
    try {
      console.log('[Graffiti Background] Trying Supabase fallback...');
      const activeStyleId = await dal.getActiveStyle(profileId);
      console.log('[Graffiti Background] Active style ID from DAL:', activeStyleId);
      
      if (activeStyleId) {
        const styles = await dal.getStyles();
        console.log('[Graffiti Background] Retrieved styles count:', styles.length);
        style = styles.find(s => s.id === activeStyleId) || null;
        
        if (style) {
          // Cache in chrome storage
          await cacheStyleInStorage(profileId, style);
          console.log('[Graffiti Background] Found style in Supabase:', style.name);
          sendResponse({ success: true, style, source: 'supabase' });
          return;
        }
      }

      // Default to spray-paint if no style is set
      console.log('[Graffiti Background] No active style, using default...');
      const styles = await dal.getStyles();
      const defaultStyle = styles.find(s => s.name === 'spray-paint');
      if (defaultStyle) {
        await cacheStyleInStorage(profileId, defaultStyle);
        console.log('[Graffiti Background] Using default spray-paint style');
        sendResponse({ success: true, style: defaultStyle, source: 'default' });
        return;
      }

    } catch (error) {
      console.warn('[Graffiti Background] Failed to load from Supabase:', error);
    }

    console.log('[Graffiti Background] No style found anywhere, returning null');
    sendResponse({ success: true, style: null });

  } catch (error) {
    console.error('[Graffiti Background] Error getting user style:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function handleGetAllStyles(sendResponse: (response: any) => void) {
  try {
    console.log('[Graffiti Background] Getting all styles');
    
    const styles = await dal.getStyles();
    console.log('[Graffiti Background] Found styles:', styles.length);
    
    sendResponse({ success: true, styles });
  } catch (error) {
    console.error('[Graffiti Background] Error getting styles:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function handleSetActiveStyle(request: { profileId: string, styleId: string }, sendResponse: (response: any) => void) {
  try {
    console.log('[Graffiti Background] Setting active style:', request.styleId, 'for profile:', request.profileId);
    
    await dal.setActiveStyle(request.profileId, request.styleId);
    
    // Update local cache
    const styles = await dal.getStyles();
    const style = styles.find(s => s.id === request.styleId);
    if (style) {
      await cacheStyleInStorage(request.profileId, style);
      console.log('[Graffiti Background] Set active style:', style.name);
    }
    
    // CS-5.4: Broadcast style change to all content scripts
    try {
      console.log('[Graffiti Background] Broadcasting style change to all tabs...');
      const tabs = await chrome.tabs.query({});
      let broadcastCount = 0;
      
      for (const tab of tabs) {
        if (tab.id && tab.url && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('edge://') &&
            !tab.url.startsWith('moz-extension://')) {
          
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'STYLE_CHANGED',
              styleId: request.styleId,
              profileId: request.profileId,
              source: 'background_broadcast'
            });
            broadcastCount++;
            console.log(`[Graffiti Background] Style change broadcast to tab ${tab.id}: ${tab.url}`);
          } catch (error) {
            // Expected for tabs without content scripts
            console.log(`[Graffiti Background] Tab ${tab.id} has no content script (expected)`);
          }
        }
      }
      
      console.log(`[Graffiti Background] Style change broadcast completed: ${broadcastCount} tabs notified`);
    } catch (broadcastError) {
      console.warn('[Graffiti Background] Failed to broadcast style change:', broadcastError);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Graffiti Background] Error setting active style:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Helper functions for chrome storage operations
async function getStyleFromStorage(profileId: string): Promise<Style | null> {
  try {
    const result = await chrome.storage.local.get('profiles');
    const profiles = result.profiles || [];
    const profile = profiles.find((p: any) => p.id === profileId);
    const styleId = profile?.selected_style_id;
    
    if (!styleId) return null;

    const styleResult = await chrome.storage.local.get('styles');
    const styles = styleResult.styles || [];
    return styles.find((s: any) => s.id === styleId) || null;
  } catch (error) {
    console.warn('[Graffiti Background] Failed to get style from storage:', error);
    return null;
  }
}

async function cacheStyleInStorage(profileId: string, style: Style): Promise<void> {
  try {
    // Cache the style
    const result = await chrome.storage.local.get('styles');
    const styles = result.styles || [];
    const existingIndex = styles.findIndex((s: any) => s.id === style.id);
    if (existingIndex >= 0) {
      styles[existingIndex] = style;
    } else {
      styles.push(style);
    }
    await chrome.storage.local.set({ styles });

    // Update profiles array
    const profileResult = await chrome.storage.local.get('profiles');
    let profiles = profileResult.profiles || [];
    
    if (!Array.isArray(profiles)) {
      console.warn('[Graffiti Background] Invalid profiles data, resetting to empty array');
      profiles = [];
    }
    
    const profileIndex = profiles.findIndex((p: any) => p.id === profileId);

    if (profileIndex >= 0) {
      profiles[profileIndex].selected_style_id = style.id;
    } else {
      const newProfile = {
        id: profileId,
        selected_style_id: style.id,
        display_name: `User ${profileId}`,
        created_at: new Date().toISOString()
      };
      profiles.push(newProfile);
    }

    await chrome.storage.local.set({ profiles });
    
  } catch (error) {
    console.warn('[Graffiti Background] Failed to cache style in storage:', error);
  }
} 