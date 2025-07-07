import { Style } from './data/types';
import { createDAL } from './data/index';

export class StyleLoader {
  private static instance: StyleLoader;
  private currentStyle: Style | null = null;
  private dal = createDAL();

  private constructor() {}

  public static getInstance(): StyleLoader {
    if (!StyleLoader.instance) {
      StyleLoader.instance = new StyleLoader();
    }
    return StyleLoader.instance;
  }

  /**
   * Reset the singleton instance for testing purposes
   * This method is only available in test environment
   */
  public static resetForTests(): void {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      StyleLoader.instance = undefined as any;
    }
  }

  /**
   * Load the active style for the current profile
   * Tries chrome.storage.local first, then falls back to Supabase
   */
  public async loadActiveStyle(profileId?: string): Promise<Style | null> {
    try {
      // Try to get profile ID from chrome storage if not provided
      if (!profileId) {
        const profile = await this.getCurrentProfile();
        if (!profile) {
          console.log('[StyleLoader] No profile found, using default style');
          return null;
        }
        profileId = profile.id;
      }

      // Try chrome storage first (offline fallback)
      const activeStyleId = await this.getActiveStyleFromStorage(profileId);
      if (activeStyleId) {
        const style = await this.getStyleById(activeStyleId);
        if (style) {
          this.currentStyle = style;
          console.log('[StyleLoader] Loaded style from storage:', style.name);
          return style;
        }
      }

      // Fallback to Supabase
      try {
        const activeStyleId = await this.dal.getActiveStyle(profileId);
        if (activeStyleId) {
          const styles = await this.dal.getStyles();
          const style = styles.find(s => s.id === activeStyleId);
          if (style) {
            this.currentStyle = style;
            // Cache in chrome storage
            await this.cacheStyleInStorage(profileId, style);
            console.log('[StyleLoader] Loaded style from Supabase:', style.name);
            return style;
          }
        }
      } catch (error) {
        console.warn('[StyleLoader] Failed to load from Supabase:', error);
      }

      // Default to spray-paint if no style is set
      const styles = await this.dal.getStyles();
      const defaultStyle = styles.find(s => s.name === 'spray-paint');
      if (defaultStyle) {
        this.currentStyle = defaultStyle;
        await this.cacheStyleInStorage(profileId, defaultStyle);
        console.log('[StyleLoader] Using default spray-paint style');
        return defaultStyle;
      }

    } catch (error) {
      console.error('[StyleLoader] Error loading active style:', error);
    }

    return null;
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
      return await this.dal.getStyles();
    } catch (error) {
      console.error('[StyleLoader] Error getting styles:', error);
      return [];
    }
  }

  /**
   * Set the active style for a profile
   */
  public async setActiveStyle(profileId: string, styleId: string): Promise<void> {
    try {
      await this.dal.setActiveStyle(profileId, styleId);
      
      // Update local cache
      const styles = await this.dal.getStyles();
      const style = styles.find(s => s.id === styleId);
      if (style) {
        this.currentStyle = style;
        await this.cacheStyleInStorage(profileId, style);
        console.log('[StyleLoader] Set active style:', style.name);
      }
    } catch (error) {
      console.error('[StyleLoader] Error setting active style:', error);
      throw error;
    }
  }

  private async getCurrentProfile(): Promise<{ id: string; display_name: string } | null> {
    try {
      const result = await chrome.storage.local.get('profile');
      return result.profile || null;
    } catch (error) {
      console.warn('[StyleLoader] Failed to get profile from storage:', error);
      return null;
    }
  }

  private async getActiveStyleFromStorage(profileId: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get('profiles');
      const profiles = result.profiles || [];
      const profile = profiles.find((p: any) => p.id === profileId);
      return profile?.selected_style_id || null;
    } catch (error) {
      console.warn('[StyleLoader] Failed to get active style from storage:', error);
      return null;
    }
  }

  private async getStyleById(styleId: string): Promise<Style | null> {
    try {
      const result = await chrome.storage.local.get('styles');
      const styles = result.styles || [];
      return styles.find((s: any) => s.id === styleId) || null;
    } catch (error) {
      console.warn('[StyleLoader] Failed to get style from storage:', error);
      return null;
    }
  }

  private async cacheStyleInStorage(profileId: string, style: Style): Promise<void> {
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

      // Always update profiles array, but safely
      const profileResult = await chrome.storage.local.get('profiles');
      let profiles = profileResult.profiles || [];
      
      // Validate profiles data
      if (!Array.isArray(profiles)) {
        console.warn('[StyleLoader] Invalid profiles data, resetting to empty array');
        profiles = [];
      }
      
      const profileIndex = profiles.findIndex((p: any) => p.id === profileId);

      if (profileIndex >= 0) {
        // Profile exists: update selected_style_id
        profiles[profileIndex].selected_style_id = style.id;
      } else {
        // Profile doesn't exist: create minimal profile object
        // This ensures user's style choice is never lost
        const newProfile = {
          id: profileId,
          selected_style_id: style.id,
          display_name: `User ${profileId}`, // Fallback name
          created_at: new Date().toISOString()
        };
        profiles.push(newProfile);
      }

      // Always write back the updated profiles array
      await chrome.storage.local.set({ profiles });
    } catch (error) {
      console.warn('[StyleLoader] Failed to cache style in storage:', error);
    }
  }
} 