import { SupabaseDAL } from '../../data/index';
import { Profile, Style, Tag } from '../../data/types';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

describe('SupabaseDAL Integration Tests', () => {
  let supabaseDAL: SupabaseDAL;
  const uniqueId = uuidv4().slice(0, 8);
  const testProfileName = `test_profile_${uniqueId}`;
  const testStyleName = `test_style_${uniqueId}`;
  let createdProfile: Profile | undefined;
  let createdStyle: Style | undefined;
  let createdTag: Tag | undefined;

  beforeAll(() => {
    supabaseDAL = new SupabaseDAL(supabaseUrl!, supabaseServiceKey!);
  });

  afterEach(async () => {
    if (createdTag) await supabaseDAL.deleteTag(createdTag.id).catch(() => {});
    // Optionally, implement deleteStyle and deleteProfile for full cleanup
    createdTag = undefined;
    createdStyle = undefined;
    createdProfile = undefined;
  });

  it('should create a profile', async () => {
    createdProfile = await supabaseDAL.createProfile(testProfileName, 'test_hash');
    expect(createdProfile).toHaveProperty('id');
    expect(createdProfile.display_name).toBe(testProfileName);
  });

  it('should create a style', async () => {
    createdStyle = await supabaseDAL.createStyle({
      name: testStyleName,
      font_url: 'https://example.com/font',
      svg_url: 'https://example.com/svg',
      premium: false
    });
    expect(createdStyle).toHaveProperty('id');
    expect(createdStyle.name).toBe(testStyleName);
  });

  it('should create a tag linked to the profile and style', async () => {
    const profile = await supabaseDAL.createProfile(`tag_profile_${uniqueId}`, 'test_hash');
    const style = await supabaseDAL.createStyle({ name: testStyleName, font_url: '', svg_url: '', premium: false });
    
    const tagData = {
      profile_id: profile.id,
      url: 'https://integration.test',
      selector_hash: 'integration123',
      style_id: style.id,
      active: true
    };
    createdTag = await supabaseDAL.saveTag(tagData);
    expect(createdTag).toHaveProperty('id');
    expect(createdTag.profile_id).toBe(profile.id);
    expect(createdTag.style_id).toBe(style.id);
  });
}); 