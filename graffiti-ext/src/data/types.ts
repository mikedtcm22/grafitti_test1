// Shared types and interfaces for DAL

export interface Profile {
    id: string;
    display_name: string;
    passcode_hash: string;
    created_at: string;
}

export interface Style {
    id: string;
    name: string;
    font_url: string;
    svg_url: string;
    premium: boolean;
    created_at: string;
}

export interface Tag {
    id: string;
    profile_id: string;
    url: string;
    selector_hash: string;
    style_id: string;
    created_at: string;
    updated_at: string;
    active: boolean;
}

export interface DataAccessLayer {
    // Profile operations
    createProfile(displayName: string, passcodeHash: string): Promise<Profile>;
    getProfile(id: string): Promise<Profile | null>;
    getProfiles(): Promise<Profile[]>;
    
    // Tag operations
    saveTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag>;
    getTagsForUrl(url: string): Promise<Tag[]>;
    getAllTags(): Promise<Tag[]>;
    deleteTag(id: string): Promise<void>;
    
    // Style operations
    createStyle(style: Omit<Style, 'id' | 'created_at'>): Promise<Style>;
    getStyles(): Promise<Style[]>;
    getOwnedStyles(profileId: string): Promise<Style[]>;
} 