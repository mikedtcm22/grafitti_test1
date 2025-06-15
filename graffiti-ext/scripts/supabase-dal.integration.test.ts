import { SupabaseDAL } from '../src/data/index';
import { Profile, Style, Tag } from '../src/data/types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const dal = new SupabaseDAL(supabaseUrl, supabaseAnonKey);

async function runIntegrationTests() {
  let createdProfile: Profile | undefined;
  let createdStyle: Style | undefined;
  let createdTag: Tag | undefined;

  try {
    // Test createProfile
    createdProfile = await dal.createProfile('integration_test_user', 'test_hash');
    console.log('Created profile:', createdProfile);

    // Test createStyle
    createdStyle = await dal.createStyle({
      name: 'IntegrationTestStyle',
      font_url: 'https://example.com/font',
      svg_url: 'https://example.com/svg',
      premium: false
    });
    console.log('Created style:', createdStyle);

    // Test saveTag
    createdTag = await dal.saveTag({
      profile_id: createdProfile.id,
      url: 'https://integration.test',
      selector_hash: 'integration123',
      style_id: createdStyle.id,
      active: true
    });
    console.log('Created tag:', createdTag);

    // Cleanup
    await dal.deleteTag(createdTag.id);
    console.log('Deleted tag:', createdTag.id);
    // Optionally, implement deleteStyle and deleteProfile for full cleanup
    console.log('Integration tests completed successfully.');
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
}

runIntegrationTests(); 