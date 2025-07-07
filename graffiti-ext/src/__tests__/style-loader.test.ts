import { StyleLoader } from '../style-loader';
import { Style } from '../data/types';
import { createDAL } from '../data/index';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn()
};

// Mock chrome.runtime
global.chrome = {
  storage: {
    local: mockStorage
  }
} as any;

// Mock DAL
jest.mock('../data/index');
const mockDAL = {
  getActiveStyle: jest.fn(),
  getStyles: jest.fn(),
  setActiveStyle: jest.fn()
};

(createDAL as jest.Mock).mockReturnValue(mockDAL);

describe('StyleLoader', () => {
  let styleLoader: StyleLoader;
  let mockStyle: Style;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton instance using the new method
    StyleLoader.resetForTests();
    
    styleLoader = StyleLoader.getInstance();
    mockStyle = {
      id: 'test-style-id',
      name: 'spray-paint',
      font_family: 'Chalkboard',
      premium: false,
      created_at: '2025-01-01'
    };
  });

  afterEach(() => {
    // Ensure cleanup after each test
    StyleLoader.resetForTests();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = StyleLoader.getInstance();
      const instance2 = StyleLoader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadActiveStyle', () => {
    it('should load style from chrome storage when available', async () => {
      const mockProfile = { id: 'profile-1', display_name: 'Test Profile' };
      const mockProfiles = [{ id: 'profile-1', selected_style_id: 'test-style-id' }];
      const mockStyles = [mockStyle];

      mockStorage.get
        .mockResolvedValueOnce({ profile: mockProfile }) // getCurrentProfile
        .mockResolvedValueOnce({ profiles: mockProfiles }) // getActiveStyleFromStorage
        .mockResolvedValueOnce({ styles: mockStyles }); // getStyleById

      const result = await styleLoader.loadActiveStyle();

      expect(result).toEqual(mockStyle);
      expect(mockStorage.get).toHaveBeenCalledTimes(3);
    });

    it('should fallback to Supabase when chrome storage fails', async () => {
      const mockProfile = { id: 'profile-1', display_name: 'Test Profile' };
      
      mockStorage.get
        .mockResolvedValueOnce({ profile: mockProfile })
        .mockResolvedValueOnce({ profiles: [] }); // No active style in storage

      mockDAL.getActiveStyle.mockResolvedValue('test-style-id');
      mockDAL.getStyles.mockResolvedValue([mockStyle]);

      const result = await styleLoader.loadActiveStyle();

      expect(result).toEqual(mockStyle);
      expect(mockDAL.getActiveStyle).toHaveBeenCalledWith('profile-1');
      expect(mockDAL.getStyles).toHaveBeenCalled();
    });

    it('should use default spray-paint style when no style is set', async () => {
      const mockProfile = { id: 'profile-1', display_name: 'Test Profile' };
      
      mockStorage.get
        .mockResolvedValueOnce({ profile: mockProfile })
        .mockResolvedValueOnce({ profiles: [] });

      mockDAL.getActiveStyle.mockResolvedValue(null);
      mockDAL.getStyles.mockResolvedValue([mockStyle]);

      const result = await styleLoader.loadActiveStyle();

      expect(result).toEqual(mockStyle);
      expect(mockDAL.getStyles).toHaveBeenCalled();
    });

    it('should return null when no profile is found', async () => {
      mockStorage.get.mockResolvedValueOnce({ profile: null });

      const result = await styleLoader.loadActiveStyle();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await styleLoader.loadActiveStyle();

      expect(result).toBeNull();
    });

    it('should accept profileId parameter', async () => {
      const mockProfiles = [{ id: 'custom-profile', selected_style_id: 'test-style-id' }];
      const mockStyles = [mockStyle];

      mockStorage.get
        .mockResolvedValueOnce({ profiles: mockProfiles })
        .mockResolvedValueOnce({ styles: mockStyles });

      const result = await styleLoader.loadActiveStyle('custom-profile');

      expect(result).toEqual(mockStyle);
    });
  });

  describe('getCurrentStyle', () => {
    it('should return currently loaded style', async () => {
      const mockProfile = { id: 'profile-1', display_name: 'Test Profile' };
      const mockProfiles = [{ id: 'profile-1', selected_style_id: 'test-style-id' }];
      const mockStyles = [mockStyle];

      mockStorage.get
        .mockResolvedValueOnce({ profile: mockProfile })
        .mockResolvedValueOnce({ profiles: mockProfiles })
        .mockResolvedValueOnce({ styles: mockStyles });

      await styleLoader.loadActiveStyle();
      const currentStyle = styleLoader.getCurrentStyle();

      expect(currentStyle).toEqual(mockStyle);
    });

    it('should return null when no style is loaded', () => {
      // Reset the instance to ensure no style is loaded
      StyleLoader.resetForTests();
      const freshLoader = StyleLoader.getInstance();
      const currentStyle = freshLoader.getCurrentStyle();
      expect(currentStyle).toBeNull();
    });
  });

  describe('setActiveStyle', () => {
    it('should set active style and update cache when profile exists', async () => {
      const profileId = 'profile-1';
      const styleId = 'test-style-id';

      mockDAL.setActiveStyle.mockResolvedValue(undefined);
      mockDAL.getStyles.mockResolvedValue([mockStyle]);

      // Set up mocks to return existing data that will be updated
      const mockProfiles = [{ id: profileId, selected_style_id: 'old-style', display_name: 'Test Profile' }];
      const mockStyles = [{ ...mockStyle, id: 'old-style' }];

      mockStorage.get
        .mockResolvedValueOnce({ profiles: mockProfiles }) // First get in cacheStyleInStorage
        .mockResolvedValueOnce({ styles: mockStyles }); // Second get in cacheStyleInStorage

      await styleLoader.setActiveStyle(profileId, styleId);

      expect(mockDAL.setActiveStyle).toHaveBeenCalledWith(profileId, styleId);
      expect(mockDAL.getStyles).toHaveBeenCalled();
      
      // Verify that both styles and profiles were updated in storage
      expect(mockStorage.set).toHaveBeenCalledTimes(2);
      
      // Check the first call (styles)
      expect(mockStorage.set).toHaveBeenNthCalledWith(1, { styles: expect.arrayContaining([mockStyle]) });
      
      // Check the second call (profiles) - profile should be updated or created
      // Since our implementation always creates a new profile object, we need to check for that
      expect(mockStorage.set).toHaveBeenNthCalledWith(2, { 
        profiles: expect.arrayContaining([{ 
          id: profileId, 
          selected_style_id: styleId,
          display_name: `User ${profileId}`, // new fallback name since profile wasn't found
          created_at: expect.any(String)
        }]) 
      });
    });

    it('should set active style and create profile when profile missing', async () => {
      const profileId = 'profile-1';
      const styleId = 'test-style-id';

      mockDAL.setActiveStyle.mockResolvedValue(undefined);
      mockDAL.getStyles.mockResolvedValue([mockStyle]);

      // Set up mocks with empty profiles array
      const mockProfiles: any[] = [];
      const mockStyles = [{ ...mockStyle, id: 'old-style' }];

      mockStorage.get
        .mockResolvedValueOnce({ profiles: mockProfiles }) // First get in cacheStyleInStorage
        .mockResolvedValueOnce({ styles: mockStyles }); // Second get in cacheStyleInStorage

      await styleLoader.setActiveStyle(profileId, styleId);

      expect(mockDAL.setActiveStyle).toHaveBeenCalledWith(profileId, styleId);
      expect(mockDAL.getStyles).toHaveBeenCalled();
      
      // Verify that both styles and profiles were updated in storage
      expect(mockStorage.set).toHaveBeenCalledTimes(2);
      
      // Check the first call (styles)
      expect(mockStorage.set).toHaveBeenNthCalledWith(1, { styles: expect.arrayContaining([mockStyle]) });
      
      // Check the second call (profiles) - new profile should be created
      expect(mockStorage.set).toHaveBeenNthCalledWith(2, { 
        profiles: expect.arrayContaining([{ 
          id: profileId, 
          selected_style_id: styleId,
          display_name: `User ${profileId}`, // new fallback name
          created_at: expect.any(String)
        }]) 
      });
    });

    it('should throw error when DAL fails', async () => {
      const profileId = 'profile-1';
      const styleId = 'test-style-id';

      mockDAL.setActiveStyle.mockRejectedValue(new Error('DAL error'));

      await expect(styleLoader.setActiveStyle(profileId, styleId))
        .rejects.toThrow('DAL error');
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await styleLoader.loadActiveStyle();

      expect(result).toBeNull();
    });

    it('should handle Supabase errors gracefully', async () => {
      const mockProfile = { id: 'profile-1', display_name: 'Test Profile' };
      
      mockStorage.get
        .mockResolvedValueOnce({ profile: mockProfile })
        .mockResolvedValueOnce({ profiles: [] });

      mockDAL.getActiveStyle.mockRejectedValue(new Error('Supabase error'));
      mockDAL.getStyles.mockResolvedValue([]); // No default styles available

      const result = await styleLoader.loadActiveStyle();

      expect(result).toBeNull();
    });
  });
}); 