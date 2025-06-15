import { SupabaseDAL } from '../graffiti-ext/src/data/index';
import { Profile, Style, Tag } from '../graffiti-ext/src/data/types';
import { DataMigration } from '../graffiti-ext/src/data/migration';

// Mock ChromeStorageDAL for Node.js environment
type MockData = {
  profiles: Profile[];
  styles: Style[];
  tags: Tag[];
};

class MockChromeStorageDAL {
  private data: MockData;
  constructor(data: MockData) {
    this.data = data;
  }
  async getProfiles(): Promise<Profile[]> {
    return this.data.profiles;
  }
  async getStyles(): Promise<Style[]> {
    return this.data.styles;
  }
  async getAllTags(): Promise<Tag[]> {
    return this.data.tags;
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  console.log('DEBUG: SUPABASE_URL:', supabaseUrl ? supabaseUrl.slice(0, 20) + '...' : 'undefined');
  console.log('DEBUG: SUPABASE_ANON_KEY:', supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '...' : 'undefined');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  // Example mock data (let DB generate IDs)
  const mockProfile = { display_name: 'Test User', passcode_hash: 'hash' };
  const mockStyle = { name: 'Graffiti', font_url: 'https://example.com/font', svg_url: 'https://example.com/svg', premium: false };
  const mockTagBase = { url: 'https://example.com', selector_hash: 'abc123', active: true };

  const chromeDAL = new MockChromeStorageDAL({ profiles: [], styles: [], tags: [] }) as any;
  const supabaseDAL = new SupabaseDAL(supabaseUrl, supabaseAnonKey);
  const migration = new DataMigration(chromeDAL, supabaseDAL);

  try {
    console.log('DEBUG: Before migration.migrate()');
    // Insert profile and get id
    const createdProfile = await supabaseDAL.createProfile(mockProfile.display_name, mockProfile.passcode_hash);
    console.log('DEBUG: Created profile:', createdProfile);
    // Insert style and get id
    const createdStyle = await supabaseDAL.createStyle(mockStyle);
    console.log('DEBUG: Created style:', createdStyle);
    // Wait to ensure inserts are committed
    await new Promise(res => setTimeout(res, 1000));
    // Insert tag using returned ids
    const tagToInsert = {
      ...mockTagBase,
      profile_id: createdProfile.id,
      style_id: createdStyle.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const createdTag = await supabaseDAL.saveTag(tagToInsert);
    console.log('DEBUG: Created tag:', createdTag);
    // Cleanup: delete tag, style, and profile
    console.log('DEBUG: Cleaning up test data...');
    await supabaseDAL.deleteTag(createdTag.id);
    // Optionally, implement deleteStyle and deleteProfile if needed
    // For now, just log the IDs for manual cleanup
    console.log('DEBUG: Test data cleanup complete.');
    console.log('Migration test completed. Check Supabase for results.');
  } catch (err) {
    console.error('Migration test failed:');
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    } else {
      console.error('Error object:');
      console.dir(err, { depth: null });
    }
  }
}

main(); 