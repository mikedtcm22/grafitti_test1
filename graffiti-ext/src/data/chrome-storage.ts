import { DataAccessLayer, Profile, Style, Tag } from './types';

export class ChromeStorageDAL implements DataAccessLayer {
    private readonly STORAGE_KEYS = {
        PROFILES: 'profiles',
        TAGS: 'tags',
        STYLES: 'styles',
        PROFILE_STYLES: 'profile_styles'
    };

    async createProfile(displayName: string, passcodeHash: string): Promise<Profile> {
        const profile: Profile = {
            id: crypto.randomUUID(),
            display_name: displayName,
            passcode_hash: passcodeHash,
            created_at: new Date().toISOString()
        };

        const { profiles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.PROFILES);
        profiles.push(profile);
        await chrome.storage.local.set({ [this.STORAGE_KEYS.PROFILES]: profiles });

        return profile;
    }

    async getProfile(id: string): Promise<Profile | null> {
        const { profiles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.PROFILES);
        return profiles.find((p: Profile) => p.id === id) || null;
    }

    async saveTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag> {
        const newTag: Tag = {
            ...tag,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { tags = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.TAGS);
        tags.push(newTag);
        await chrome.storage.local.set({ [this.STORAGE_KEYS.TAGS]: tags });

        return newTag;
    }

    async getTagsForUrl(url: string): Promise<Tag[]> {
        const { tags = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.TAGS);
        return tags.filter((tag: Tag) => tag.url === url && tag.active);
    }

    async deleteTag(id: string): Promise<void> {
        const { tags = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.TAGS);
        const updatedTags = tags.filter((tag: Tag) => tag.id !== id);
        await chrome.storage.local.set({ [this.STORAGE_KEYS.TAGS]: updatedTags });
    }

    async getStyles(): Promise<Style[]> {
        const { styles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.STYLES);
        return styles;
    }

    async getOwnedStyles(profileId: string): Promise<Style[]> {
        const { profile_styles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.PROFILE_STYLES);
        const { styles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.STYLES);
        
        const ownedStyleIds = profile_styles
            .filter((ps: { profile_id: string; style_id: string; owned: boolean }) => 
                ps.profile_id === profileId && ps.owned)
            .map((ps: { style_id: string }) => ps.style_id);

        return styles.filter((style: Style) => ownedStyleIds.includes(style.id));
    }

    async createStyle(style: Omit<Style, 'id' | 'created_at'>): Promise<Style> {
        const styles = await this.getStyles();
        const newStyle: Style = {
            ...style,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
        };
        
        await chrome.storage.local.set({ styles: [...styles, newStyle] });
        return newStyle;
    }

    async getProfiles(): Promise<Profile[]> {
        const { profiles = [] } = await chrome.storage.local.get('profiles');
        return profiles;
    }

    async getAllTags(): Promise<Tag[]> {
        const { tags = [] } = await chrome.storage.local.get('tags');
        return tags;
    }

    // ---------- Style selection helpers ----------
    async setActiveStyle(profileId: string, styleId: string): Promise<void> {
        const { profiles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.PROFILES);
        const updatedProfiles = profiles.map((p: Profile) =>
            p.id === profileId ? { ...p, selected_style_id: styleId } : p
        );
        await chrome.storage.local.set({ [this.STORAGE_KEYS.PROFILES]: updatedProfiles });
    }

    async getActiveStyle(profileId: string): Promise<string | null> {
        const { profiles = [] } = await chrome.storage.local.get(this.STORAGE_KEYS.PROFILES);
        const profile = profiles.find((p: Profile) => p.id === profileId);
        return profile?.selected_style_id ?? null;
    }
} 