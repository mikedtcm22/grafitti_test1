import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChromeStorageDAL } from './chrome-storage';
import { DataAccessLayer, Profile, Style, Tag } from './types';

// Supabase implementation of DAL
export class SupabaseDAL implements DataAccessLayer {
    private client: SupabaseClient;

    constructor(url: string, anonKey: string) {
        this.client = createClient(url, anonKey);
    }

    async createProfile(displayName: string, passcodeHash: string): Promise<Profile> {
        const { data, error } = await this.client
            .from('profiles')
            .insert([{ display_name: displayName, passcode_hash: passcodeHash }])
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    }

    async getProfile(id: string): Promise<Profile | null> {
        const { data, error } = await this.client
            .from('profiles')
            .select()
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Profile | null;
    }

    async saveTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag> {
        const { data, error } = await this.client
            .from('tags')
            .insert([tag])
            .select()
            .single();

        if (error) throw error;
        return data as Tag;
    }

    async getTagsForUrl(url: string): Promise<Tag[]> {
        const { data, error } = await this.client
            .from('tags')
            .select()
            .eq('url', url)
            .eq('active', true);

        if (error) throw error;
        return (data || []) as Tag[];
    }

    async deleteTag(id: string): Promise<void> {
        const { error } = await this.client
            .from('tags')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async createStyle(style: Omit<Style, 'id' | 'created_at'>): Promise<Style> {
        const { data, error } = await this.client
            .from('styles')
            .insert([style])
            .select()
            .single();

        if (error) throw error;
        return data as Style;
    }

    async getStyles(): Promise<Style[]> {
        const { data, error } = await this.client
            .from('styles')
            .select();

        if (error) throw error;
        return (data || []) as Style[];
    }

    async getOwnedStyles(_profileId: string): Promise<Style[]> {
        return [];
    }

    async getProfiles(): Promise<Profile[]> {
        const { data, error } = await this.client
            .from('profiles')
            .select('*');

        if (error) throw error;
        return data as Profile[];
    }

    async getAllTags(): Promise<Tag[]> {
        const { data, error } = await this.client
            .from('tags')
            .select('*');

        if (error) throw error;
        return data as Tag[];
    }
}

// Factory function to create the appropriate DAL implementation
export function createDAL(): DataAccessLayer {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
        return new SupabaseDAL(supabaseUrl, supabaseAnonKey);
    }

    // Fallback to Chrome Storage if Supabase credentials are not available
    return new ChromeStorageDAL();
} 