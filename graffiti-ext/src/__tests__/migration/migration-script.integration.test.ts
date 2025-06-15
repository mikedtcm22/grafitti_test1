// @ts-ignore
import 'dotenv/config'; // Jest may auto-load .env, but explicit for clarity
import { SupabaseDAL } from '../../data/index';
import { DataMigration } from '../../data/migration';
import { Profile, Style, Tag } from '../../data/types';

describe('Migration Script Integration (Supabase)', () => {
  if (process.env.RUN_INTEGRATION_TESTS !== '1') {
    it('skips integration test unless RUN_INTEGRATION_TESTS=1', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_TEST_URL;
  const supabaseAnonKey = process.env.SUPABASE_TEST_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY must be set in env.test');
  }

  // Minimal mock ChromeStorageDAL
  class MockChromeStorageDAL {
    private data: { profiles: Profile[]; styles: Style[]; tags: Tag[] };
    constructor(data: { profiles: Profile[]; styles: Style[]; tags: Tag[] }) {
      this.data = data;
    }
    async getProfiles() { return this.data.profiles; }
    async getStyles() { return this.data.styles; }
    async getAllTags() { return this.data.tags; }
  }

  it('migrates profiles, styles, and tags from ChromeStorageDAL to SupabaseDAL', async () => {
    // Unique test prefix for cleanup
    const testPrefix = `test_${Date.now()}_`;
    // Sample data
    const profile: Profile = {
      id: '',
      display_name: testPrefix + 'user',
      passcode_hash: 'hash',
      created_at: new Date().toISOString(),
    };
    const style: Style = {
      id: '',
      name: testPrefix + 'style',
      font_url: 'https://example.com/font',
      svg_url: 'https://example.com/svg',
      premium: false,
      created_at: new Date().toISOString(),
    };
    const tag: Tag = {
      id: '',
      profile_id: '', // will be set by migration
      url: 'https://example.com',
      selector_hash: testPrefix + 'abc123',
      style_id: '', // will be set by migration
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
    };
    // ChromeStorageDAL mock with sample data
    const chromeDAL = new MockChromeStorageDAL({ profiles: [profile], styles: [style], tags: [tag] });
    const supabaseDAL = new SupabaseDAL(supabaseUrl, supabaseAnonKey);
    const migration = new DataMigration(chromeDAL as any, supabaseDAL);
    let createdProfile, createdStyle, createdTag;
    try {
      // Run migration
      await migration.migrate();
      // Fetch migrated data
      const profiles = await supabaseDAL.getProfiles();
      createdProfile = profiles.find((p: Profile) => p.display_name === profile.display_name);
      expect(createdProfile).toBeTruthy();
      const styles = await supabaseDAL.getStyles();
      createdStyle = styles.find((s: Style) => s.name === style.name);
      expect(createdStyle).toBeTruthy();
      const tags = await supabaseDAL.getTagsForUrl(tag.url);
      createdTag = tags.find((t: Tag) => t.selector_hash === tag.selector_hash);
      expect(createdTag).toBeTruthy();
    } finally {
      // Cleanup: delete tag, style, profile
      if (createdTag) await supabaseDAL.deleteTag(createdTag.id).catch(() => {});
      if (createdStyle) console.log('Cleanup: style id', createdStyle.id);
      if (createdProfile) console.log('Cleanup: profile id', createdProfile.id);
    }
  });
}); 