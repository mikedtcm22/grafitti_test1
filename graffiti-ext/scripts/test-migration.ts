console.log('DEBUG: START OF SCRIPT');
import { SupabaseDAL } from '../src/data/index.ts';
import { Profile, Style, Tag } from '../src/data/types';
// import { SupabaseDAL } from '../src/data/index.ts';
import { DataMigration } from '../src/data/migration.ts';
// import { Profile, Style, Tag } from '../src/data/index.ts';

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

// Add progress logs to DataMigration methods
// (This is a quick patch for debugging)
import { DataMigration as OrigDataMigration } from '../src/data/migration.ts';

OrigDataMigration.prototype.migrateProfiles = async function() {
  console.log('DEBUG: Entering migrateProfiles');
  const profiles = await this.chromeDAL.getProfiles();
  this.stats.profiles.total = profiles.length;
  for (const profile of profiles) {
    try {
      console.log('DEBUG: Migrating profile', profile.id);
      await this.supabaseDAL.createProfile(profile.display_name, profile.passcode_hash);
      this.stats.profiles.migrated++;
    } catch (error) {
      console.error(`Failed to migrate profile ${profile.id}:`, error);
      this.stats.profiles.errors++;
    }
  }
  console.log('DEBUG: Finished migrateProfiles');
};

OrigDataMigration.prototype.migrateStyles = async function() {
  console.log('DEBUG: Entering migrateStyles');
  const styles = await this.chromeDAL.getStyles();
  this.stats.styles.total = styles.length;
  for (const style of styles) {
    try {
      console.log('DEBUG: Migrating style', style.id);
      const { id, created_at, ...styleData } = style;
      await this.supabaseDAL.createStyle(styleData);
      this.stats.styles.migrated++;
    } catch (error) {
      console.error(`Failed to migrate style ${style.id}:`, error);
      this.stats.styles.errors++;
    }
  }
  console.log('DEBUG: Finished migrateStyles');
};

OrigDataMigration.prototype.migrateTags = async function() {
  console.log('DEBUG: Entering migrateTags');
  const tags = await this.chromeDAL.getAllTags();
  this.stats.tags.total = tags.length;
  for (const tag of tags) {
    try {
      console.log('DEBUG: Migrating tag', tag.id);
      const { id, created_at, updated_at, ...tagData } = tag;
      await this.supabaseDAL.saveTag(tagData);
      this.stats.tags.migrated++;
    } catch (error) {
      console.error(`Failed to migrate tag ${tag.id}:`, error);
      this.stats.tags.errors++;
    }
  }
  console.log('DEBUG: Finished migrateTags');
}; 