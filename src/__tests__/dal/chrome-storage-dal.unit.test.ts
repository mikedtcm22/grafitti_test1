import { ChromeStorageDAL } from '../../data/chrome-storage';
import { Profile, Style, Tag } from '../../data/types';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-123';

describe('ChromeStorageDAL', () => {
  let dal: ChromeStorageDAL;
  let mockData: {
    profiles: Profile[];
    styles: Style[];
    tags: Tag[];
    profile_styles: Array<{ profile_id: string; style_id: string; owned: boolean }>;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock data
    mockData = {
      profiles: [],
      styles: [],
      tags: [],
      profile_styles: []
    };

    // Setup chrome.storage.local mock
    mockStorage.get.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockData[keys as keyof typeof mockData] || [] });
      }
      const result: Record<string, any> = {};
      keys.forEach((key: string) => {
        result[key] = mockData[key as keyof typeof mockData] || [];
      });
      return Promise.resolve(result);
    });

    mockStorage.set.mockImplementation((items) => {
      Object.entries(items).forEach(([key, value]) => {
        mockData[key as keyof typeof mockData] = value;
      });
      return Promise.resolve();
    });

    // Setup global mocks
    global.chrome = {
      storage: {
        local: mockStorage
      }
    } as any;

    global.crypto = {
      randomUUID: () => mockUUID
    } as any;

    // Create DAL instance
    dal = new ChromeStorageDAL();
  });

  describe('Profile Operations', () => {
    it('should create a profile', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      
      expect(profile).toEqual({
        id: mockUUID,
        display_name: 'Test User',
        passcode_hash: 'hash123',
        created_at: expect.any(String)
      });

      expect(mockStorage.get).toHaveBeenCalledWith('profiles');
      expect(mockStorage.set).toHaveBeenCalledWith({
        profiles: [profile]
      });
    });

    it('should get a profile by id', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const found = await dal.getProfile(profile.id);
      
      expect(found).toEqual(profile);
    });

    it('should return null for non-existent profile', async () => {
      const found = await dal.getProfile('non-existent');
      expect(found).toBeNull();
    });

    it('should get all profiles', async () => {
      const profile1 = await dal.createProfile('User 1', 'hash1');
      const profile2 = await dal.createProfile('User 2', 'hash2');
      
      const profiles = await dal.getProfiles();
      expect(profiles).toEqual([profile1, profile2]);
    });
  });

  describe('Style Operations', () => {
    it('should create a style', async () => {
      const style = await dal.createStyle({
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false
      });

      expect(style).toEqual({
        id: mockUUID,
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false,
        created_at: expect.any(String)
      });

      expect(mockStorage.get).toHaveBeenCalledWith('styles');
      expect(mockStorage.set).toHaveBeenCalledWith({
        styles: [style]
      });
    });

    it('should get all styles', async () => {
      const style1 = await dal.createStyle({
        name: 'Style 1',
        font_url: 'https://example.com/font1',
        svg_url: 'https://example.com/svg1',
        premium: false
      });
      const style2 = await dal.createStyle({
        name: 'Style 2',
        font_url: 'https://example.com/font2',
        svg_url: 'https://example.com/svg2',
        premium: true
      });

      const styles = await dal.getStyles();
      expect(styles).toEqual([style1, style2]);
    });

    it('should get owned styles for a profile', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const style1 = await dal.createStyle({
        name: 'Style 1',
        font_url: 'https://example.com/font1',
        svg_url: 'https://example.com/svg1',
        premium: false
      });
      const style2 = await dal.createStyle({
        name: 'Style 2',
        font_url: 'https://example.com/font2',
        svg_url: 'https://example.com/svg2',
        premium: true
      });

      // Add profile_styles relationship
      mockData.profile_styles = [
        { profile_id: profile.id, style_id: style1.id, owned: true },
        { profile_id: profile.id, style_id: style2.id, owned: false }
      ];

      const ownedStyles = await dal.getOwnedStyles(profile.id);
      expect(ownedStyles).toEqual([style1]);
    });
  });

  describe('Tag Operations', () => {
    it('should save a tag', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const style = await dal.createStyle({
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false
      });

      const tag = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com',
        selector_hash: 'abc123',
        style_id: style.id,
        active: true
      });

      expect(tag).toEqual({
        id: mockUUID,
        profile_id: profile.id,
        url: 'https://example.com',
        selector_hash: 'abc123',
        style_id: style.id,
        active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      expect(mockStorage.get).toHaveBeenCalledWith('tags');
      expect(mockStorage.set).toHaveBeenCalledWith({
        tags: [tag]
      });
    });

    it('should get tags for a URL', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const style = await dal.createStyle({
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false
      });

      const tag1 = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com',
        selector_hash: 'abc123',
        style_id: style.id,
        active: true
      });

      const tag2 = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com',
        selector_hash: 'def456',
        style_id: style.id,
        active: false
      });

      const tags = await dal.getTagsForUrl('https://example.com');
      expect(tags).toEqual([tag1]);
    });

    it('should get all tags', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const style = await dal.createStyle({
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false
      });

      const tag1 = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com/1',
        selector_hash: 'abc123',
        style_id: style.id,
        active: true
      });

      const tag2 = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com/2',
        selector_hash: 'def456',
        style_id: style.id,
        active: true
      });

      const tags = await dal.getAllTags();
      expect(tags).toEqual([tag1, tag2]);
    });

    it('should delete a tag', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      const style = await dal.createStyle({
        name: 'Test Style',
        font_url: 'https://example.com/font',
        svg_url: 'https://example.com/svg',
        premium: false
      });

      const tag = await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com',
        selector_hash: 'abc123',
        style_id: style.id,
        active: true
      });

      await dal.deleteTag(tag.id);

      const tags = await dal.getAllTags();
      expect(tags).toEqual([]);
    });
  });
}); 