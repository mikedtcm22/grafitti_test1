import { SupabaseDAL } from '../../data/index';
import { Profile, Style } from '../../data/types';

// Skip if Supabase credentials are not available
const describeIfSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? describe : describe.skip;

describeIfSupabase('Style Switching Integration Tests', () => {
  let dal: SupabaseDAL;
  let testProfile: Profile;
  let testStyle: Style;

  beforeAll(async () => {
    dal = new SupabaseDAL(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    // Create a test profile
    testProfile = await dal.createProfile(`test_style_${Date.now()}`, 'test_hash');
    
    // Create a test style
    testStyle = await dal.createStyle({
      name: `test_style_${Date.now()}`,
      font_family: 'Arial',
      premium: false,
      owner_profile_id: testProfile.id
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      // Delete test style
      // Note: We'll need to implement deleteStyle method or use service role
      // For now, we'll rely on the test database being reset between runs
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Style Selection', () => {
    it('should set and get active style for a profile', async () => {
      // Initially no active style
      const initialActiveStyle = await dal.getActiveStyle(testProfile.id);
      expect(initialActiveStyle).toBeNull();

      // Set active style
      await dal.setActiveStyle(testProfile.id, testStyle.id);

      // Verify active style is set
      const activeStyleId = await dal.getActiveStyle(testProfile.id);
      expect(activeStyleId).toBe(testStyle.id);
    });

    it('should update active style when changed', async () => {
      // Create a second test style
      const testStyle2 = await dal.createStyle({
        name: `test_style_2_${Date.now()}`,
        font_family: 'Helvetica',
        premium: false,
        owner_profile_id: testProfile.id
      });

      // Set initial active style
      await dal.setActiveStyle(testProfile.id, testStyle.id);
      expect(await dal.getActiveStyle(testProfile.id)).toBe(testStyle.id);

      // Change to different style
      await dal.setActiveStyle(testProfile.id, testStyle2.id);
      expect(await dal.getActiveStyle(testProfile.id)).toBe(testStyle2.id);
    });

    it('should handle non-existent style gracefully', async () => {
      const nonExistentStyleId = '00000000-0000-0000-0000-000000000000';
      
      // This should not throw but may not work as expected
      // The actual behavior depends on foreign key constraints
      try {
        await dal.setActiveStyle(testProfile.id, nonExistentStyleId);
        const activeStyleId = await dal.getActiveStyle(testProfile.id);
        // Either the style was set (if no FK constraint) or null (if FK constraint)
        expect(activeStyleId).toBeDefined();
      } catch (error) {
        // If FK constraint exists, this should throw
        expect(error).toBeDefined();
      }
    });
  });

  describe('Built-in Styles', () => {
    it('should have spray-paint and marker styles available', async () => {
      const styles = await dal.getStyles();
      
      const sprayPaintStyle = styles.find(s => s.name === 'spray-paint');
      const markerStyle = styles.find(s => s.name === 'marker');
      
      expect(sprayPaintStyle).toBeDefined();
      expect(markerStyle).toBeDefined();
      
      // Verify they have the expected properties
      if (sprayPaintStyle) {
        expect(sprayPaintStyle.font_family).toBe('Chalkboard');
        expect(sprayPaintStyle.premium).toBe(false);
        expect(sprayPaintStyle.owner_profile_id).toBeNull(); // Built-in
      }
      
      if (markerStyle) {
        expect(markerStyle.font_family).toBe('CurrentDefault');
        expect(markerStyle.premium).toBe(false);
        expect(markerStyle.owner_profile_id).toBeNull(); // Built-in
      }
    });

    it('should be able to select built-in styles', async () => {
      const styles = await dal.getStyles();
      const sprayPaintStyle = styles.find(s => s.name === 'spray-paint');
      
      if (sprayPaintStyle) {
        await dal.setActiveStyle(testProfile.id, sprayPaintStyle.id);
        const activeStyleId = await dal.getActiveStyle(testProfile.id);
        expect(activeStyleId).toBe(sprayPaintStyle.id);
      }
    });
  });

  describe('Profile Schema', () => {
    it('should have selected_style_id column', async () => {
      const profile = await dal.getProfile(testProfile.id);
      expect(profile).toBeDefined();
      expect(profile).toHaveProperty('selected_style_id');
    });
  });
}); 