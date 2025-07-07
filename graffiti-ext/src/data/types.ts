// Shared types and interfaces for DAL

export interface Profile {
    id: string;
    display_name: string;
    passcode_hash: string;
    created_at: string;
    selected_style_id?: string | null;
}

export interface Style {
    id: string;
    name: string;
    font_family?: string; // optional for legacy rows
    font_url?: string;    // legacy field (will be replaced by font_fallback_url)
    svg_url?: string;     // legacy field (will be replaced by cross_out_svg_url)
    font_fallback_url?: string | null;
    font_cdn_url?: string | null;
    cross_out_svg_url?: string | null;
    meta?: any; // JSON blob with additional settings (stroke widths, colours, etc.)
    premium: boolean;
    created_at: string;
    owner_profile_id?: string | null;
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

    // Style selection helpers
    setActiveStyle(profileId: string, styleId: string): Promise<void>;
    getActiveStyle(profileId: string): Promise<string | null>; // returns styleId
} 