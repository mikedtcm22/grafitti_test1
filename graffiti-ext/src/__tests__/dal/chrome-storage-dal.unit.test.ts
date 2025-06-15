import { ChromeStorageDAL } from '../../data/chrome-storage';
import { Profile, Style, Tag } from '../../data/types';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

type StorageData = {
  profiles: Profile[];
  styles: Style[];
  tags: Tag[];
  profile_styles: Array<{ profile_id: string; style_id: string; owned: boolean }>;
};

type StorageKey = keyof StorageData;

describe('ChromeStorageDAL', () => {
  let dal: ChromeStorageDAL;
  let mockData: StorageData;
  let randomUUIDSpy: jest.SpyInstance;
  let uuidCounter: number;

  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    mockData = {
      profiles: [],
      styles: [],
      tags: [],
      profile_styles: []
    };
    mockStorage.get.mockImplementation((keys: string | string[]) => {
      if (typeof keys === 'string') {
        const key = keys as StorageKey;
        // @ts-ignore TECH-DEBT-#12
        const value = mockData[key];
        return Promise.resolve({ [keys]: value });
      }
      const result: Partial<StorageData> = {};
      keys.forEach((key: string) => {
        const typedKey = key as StorageKey;
        if (typedKey in mockData) {
          // @ts-ignore TECH-DEBT-#12
          result[typedKey] = mockData[typedKey];
        }
      });
      return Promise.resolve(result);
    });
    mockStorage.set.mockImplementation((items: Partial<StorageData>) => {
      Object.entries(items).forEach(([key, value]) => {
        const typedKey = key as StorageKey;
        if (typedKey in mockData) {
          // @ts-ignore TECH-DEBT-#12
          mockData[typedKey] = value as StorageData[StorageKey];
        }
      });
      return Promise.resolve();
    });
    global.chrome = {
      storage: {
        local: mockStorage
      }
    } as any;
    // Patch randomUUID to return a unique value on each call
    randomUUIDSpy = jest.spyOn(global.crypto, 'randomUUID').mockImplementation(() => {
      uuidCounter++;
      return `123e4567-e89b-12d3-a456-4266141740${String(uuidCounter).padStart(2, '0')}`;
    });
    dal = new ChromeStorageDAL();
  });

  afterEach(() => {
    randomUUIDSpy.mockRestore();
  });

  describe('Profile Operations', () => {
    it('should create a profile', async () => {
      const profile = await dal.createProfile('Test User', 'hash123');
      
      expect(profile).toEqual({
        id: expect.any(String),
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
        id: expect.any(String),
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
        id: expect.any(String),
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

      await dal.saveTag({
        profile_id: profile.id,
        url: 'https://example.com/2',
        selector_hash: 'def456',
        style_id: style.id,
        active: true
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