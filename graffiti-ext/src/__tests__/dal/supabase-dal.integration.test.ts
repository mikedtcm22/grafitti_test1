import { SupabaseDAL } from '../../data/index';
import { Profile, Style, Tag } from '../../data/types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

(supabaseUrl && supabaseAnonKey ? describe : describe.skip)('SupabaseDAL (integration)', () => {
  const dal = new SupabaseDAL(supabaseUrl!, supabaseAnonKey!);
  let createdProfile: Profile | undefined;
  let createdStyle: Style | undefined;
  let createdTag: Tag | undefined;

  afterEach(async () => {
    if (createdTag) await dal.deleteTag(createdTag.id).catch(() => {});
    // Optionally, implement deleteStyle and deleteProfile for full cleanup
    createdTag = undefined;
    createdStyle = undefined;
    createdProfile = undefined;
  });

  it('should create a profile', async () => {
    createdProfile = await dal.createProfile('integration_test_user', 'test_hash');
    expect(createdProfile).toHaveProperty('id');
    expect(createdProfile.display_name).toBe('integration_test_user');
  });

  it('should create a style', async () => {
    createdStyle = await dal.createStyle({
      name: 'IntegrationTestStyle',
      font_url: 'https://example.com/font',
      svg_url: 'https://example.com/svg',
      premium: false
    });
    expect(createdStyle).toHaveProperty('id');
    expect(createdStyle.name).toBe('IntegrationTestStyle');
  });

  it('should create a tag linked to the profile and style', async () => {
    createdProfile = await dal.createProfile('integration_test_user2', 'test_hash');
    createdStyle = await dal.createStyle({
      name: 'IntegrationTestStyle2',
      font_url: 'https://example.com/font2',
      svg_url: 'https://example.com/svg2',
      premium: false
    });
    const tagToInsert = {
      profile_id: createdProfile.id,
      url: 'https://integration.test',
      selector_hash: 'integration123',
      style_id: createdStyle.id,
      active: true
    };
    createdTag = await dal.saveTag(tagToInsert);
    expect(createdTag).toHaveProperty('id');
    expect(createdTag.profile_id).toBe(createdProfile.id);
    expect(createdTag.style_id).toBe(createdStyle.id);
  });
}); 