import { SupabaseDAL } from '../../data/index';
import { Profile, Style, Tag } from '../../data/types';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

(supabaseUrl && supabaseAnonKey ? describe : describe.skip)('SupabaseDAL (integration)', () => {
  let dal: SupabaseDAL;
  const uniqueId = uuidv4().slice(0, 8);
  const testProfileName = `test_profile_${uniqueId}`;
  const testStyleName = `test_style_${uniqueId}`;
  let createdProfileId: string;
  let createdProfile: Profile | undefined;
  let createdStyle: Style | undefined;
  let createdTag: Tag | undefined;

  beforeAll(() => {
    dal = new SupabaseDAL(supabaseUrl!, supabaseAnonKey!);
  });

  afterEach(async () => {
    if (createdTag) await dal.deleteTag(createdTag.id).catch(() => {});
    // Optionally, implement deleteStyle and deleteProfile for full cleanup
    createdTag = undefined;
    createdStyle = undefined;
    createdProfile = undefined;
  });

  it('should create a profile', async () => {
    createdProfile = await dal.createProfile(testProfileName, 'test_hash');
    expect(createdProfile).toHaveProperty('id');
    expect(createdProfile.display_name).toBe(testProfileName);
    createdProfileId = createdProfile.id;
  });

  it('should create a style', async () => {
    createdStyle = await dal.createStyle({
      name: testStyleName,
      font_url: 'https://example.com/font',
      svg_url: 'https://example.com/svg',
      premium: false
    });
    expect(createdStyle).toHaveProperty('id');
    expect(createdStyle.name).toBe(testStyleName);
  });

  it('should create a tag linked to the profile and style', async () => {
    const profile = await dal.createProfile(`tag_profile_${uniqueId}`, 'test_hash');
    const style = await dal.createStyle({ name: testStyleName, font_url: '', svg_url: '', premium: false });
    
    const tagData = {
      profile_id: profile.id,
      url: 'https://integration.test',
      selector_hash: 'integration123',
      style_id: style.id,
      active: true
    };
    createdTag = await dal.saveTag(tagData);
    expect(createdTag).toHaveProperty('id');
    expect(createdTag.profile_id).toBe(profile.id);
    expect(createdTag.style_id).toBe(style.id);
  });
}); 