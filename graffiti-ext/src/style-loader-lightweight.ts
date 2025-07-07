// Lightweight Style Loader for Content Script
// Uses message passing to background script instead of direct Supabase access

import { Style } from './data/types';

export class LightweightStyleLoader {
  private static instance: LightweightStyleLoader;
  private currentStyle: Style | null = null;

  private constructor() {}

  public static getInstance(): LightweightStyleLoader {
    if (!LightweightStyleLoader.instance) {
      LightweightStyleLoader.instance = new LightweightStyleLoader();
    }
    return LightweightStyleLoader.instance;
  }

  /**
   * Reset the singleton instance for testing purposes
   */
  public static resetForTests(): void {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      LightweightStyleLoader.instance = undefined as any;
    }
  }

  /**
   * Load the active style for the current profile
   * Communicates with background script instead of using Supabase directly
   */
  public async loadActiveStyle(profileId?: string): Promise<Style | null> {
    try {
      console.log('[LightweightStyleLoader] Loading active style via background script');
      
      const response = await this.sendMessageToBackground({
        type: 'GET_USER_STYLE',
        userId: profileId
      });

      if (response.success && response.style) {
        this.currentStyle = response.style;
        console.log('[LightweightStyleLoader] Loaded style:', response.style.name, 'from', response.source);
        return response.style;
      }

      console.log('[LightweightStyleLoader] No style found');
      return null;

    } catch (error) {
      console.error('[LightweightStyleLoader] Error loading active style:', error);
      return null;
    }
  }

  /**
   * Get the currently loaded style
   */
  public getCurrentStyle(): Style | null {
    return this.currentStyle;
  }

  /**
   * Get all available styles
   */
  public async getStyles(): Promise<Style[]> {
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_ALL_STYLES'
      });

      if (response.success && response.styles) {
        return response.styles;
      }

      return [];
    } catch (error) {
      console.error('[LightweightStyleLoader] Error getting styles:', error);
      return [];
    }
  }

  /**
   * Set the active style for a profile
   */
  public async setActiveStyle(profileId: string, styleId: string): Promise<void> {
    try {
      const response = await this.sendMessageToBackground({
        type: 'SET_ACTIVE_STYLE',
        profileId,
        styleId
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to set active style');
      }

      // Update local cache by reloading the style
      await this.loadActiveStyle(profileId);

    } catch (error) {
      console.error('[LightweightStyleLoader] Error setting active style:', error);
      throw error;
    }
  }

  /**
   * Send message to background script and handle response
   * Implements CS-5.3: Service Worker Lifecycle Management
   */
  private async sendMessageToBackground(message: any): Promise<any> {
    console.log('[LightweightStyleLoader] ===== SENDING MESSAGE =====');
    console.log('[LightweightStyleLoader] Message:', message);
    console.log('[LightweightStyleLoader] Timestamp:', new Date().toISOString());
    
    // CS-5.3: Implement retry logic with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[LightweightStyleLoader] Attempt ${attempt}/${maxRetries}`);
        
        // CS-5.3: Health check - try to wake up service worker
        await this.pingBackgroundScript();
        
        const response = await this.sendSingleMessage(message);
        console.log('[LightweightStyleLoader] Message successful on attempt', attempt);
        return response;
        
      } catch (error: any) {
        console.warn(`[LightweightStyleLoader] Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.error('[LightweightStyleLoader] All retry attempts failed, using fallback');
          // CS-5.3: Final fallback to cached data
          return this.getFallbackResponse(message);
        }
        
        // CS-5.3: Exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[LightweightStyleLoader] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * CS-5.3: Health check to ensure background script is responsive
   */
  private async pingBackgroundScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background script health check timeout'));
      }, 5000); // 5 second timeout
      
      try {
        chrome.runtime.sendMessage({ type: 'PING' }, () => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          // Background script is responsive (even if it doesn't handle PING)
          resolve();
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * CS-5.3: Single message attempt without retry logic
   */
  private async sendSingleMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[LightweightStyleLoader] Calling chrome.runtime.sendMessage...');
        
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout - background script may be dormant'));
        }, 10000); // 10 second timeout
        
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          console.log('[LightweightStyleLoader] ===== MESSAGE RESPONSE =====');
          console.log('[LightweightStyleLoader] Response received:', response);
          console.log('[LightweightStyleLoader] chrome.runtime.lastError:', chrome.runtime.lastError);
          
          if (chrome.runtime.lastError) {
            console.error('[LightweightStyleLoader] Runtime error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            console.error('[LightweightStyleLoader] No response from background script');
            reject(new Error('No response from background script'));
            return;
          }

          console.log('[LightweightStyleLoader] Successful response, resolving...');
          resolve(response);
        });
        
        console.log('[LightweightStyleLoader] chrome.runtime.sendMessage call completed (async)');
      } catch (error) {
        console.error('[LightweightStyleLoader] Exception in sendMessage:', error);
        reject(error);
      }
    });
  }

  /**
   * CS-5.3: Fallback response when background script is unavailable
   */
  private async getFallbackResponse(message: any): Promise<any> {
    console.log('[LightweightStyleLoader] Using fallback response for message type:', message.type);
    
    switch (message.type) {
      case 'GET_USER_STYLE':
        // Try to get cached style from chrome storage
        try {
          const result = await chrome.storage.local.get(['styles', 'profile']);
          const profile = result.profile;
          const styles = result.styles || [];
          
          if (profile?.selected_style_id && styles.length > 0) {
            const style = styles.find((s: any) => s.id === profile.selected_style_id);
            if (style) {
              console.log('[LightweightStyleLoader] Fallback: Found cached style:', style.name);
              return { success: true, style, source: 'fallback-cache' };
            }
          }
          
          // Default to first available style
          if (styles.length > 0) {
            console.log('[LightweightStyleLoader] Fallback: Using first available style');
            return { success: true, style: styles[0], source: 'fallback-default' };
          }
          
        } catch (error) {
          console.warn('[LightweightStyleLoader] Fallback cache access failed:', error);
        }
        
        // Ultimate fallback - return marker style
        console.log('[LightweightStyleLoader] Fallback: Using hardcoded marker style');
        return {
          success: true,
          style: { id: 'fallback', name: 'marker', font_family: 'Comic Sans MS' },
          source: 'fallback-hardcoded'
        };
        
      case 'GET_ALL_STYLES':
        try {
          const result = await chrome.storage.local.get('styles');
          const styles = result.styles || [];
          console.log('[LightweightStyleLoader] Fallback: Found cached styles:', styles.length);
          return { success: true, styles };
        } catch (error) {
          console.warn('[LightweightStyleLoader] Fallback: Could not access cached styles');
          return { success: true, styles: [] };
        }
        
      case 'SET_ACTIVE_STYLE':
        // Can't really set style without background, but don't fail
        console.log('[LightweightStyleLoader] Fallback: Cannot set style without background script');
        return { success: false, error: 'Background script unavailable' };
        
      default:
        console.log('[LightweightStyleLoader] Fallback: Unknown message type');
        return { success: false, error: 'Unknown message type' };
    }
  }
} 