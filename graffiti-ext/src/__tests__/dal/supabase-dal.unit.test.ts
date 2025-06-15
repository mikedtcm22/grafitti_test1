jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
    eq: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  })
}));

import { SupabaseDAL } from '../../data/index';
import { Profile, Tag } from '../../data/types';

// Chainable mock builder for Supabase queries
function createChainableMock(finalPromise: any): any {
  const chain: any = {};
  const methods = ['from', 'insert', 'select', 'eq', 'delete'];
  methods.forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => finalPromise);
  chain.then = jest.fn((callback) => finalPromise.then(callback));
  chain.catch = jest.fn((callback) => finalPromise.catch(callback));
  return chain;
}

describe('SupabaseDAL (unit, mock)', () => {
  let dal: SupabaseDAL;

  beforeEach(() => {
    dal = new SupabaseDAL('mock-url', 'mock-key');
  });

  describe('Profile Operations', () => {
    it('createProfile returns profile on success', async () => {
      const profile: Profile = {
        id: 'uuid',
        display_name: 'Test',
        passcode_hash: 'hash',
        created_at: 'now',
      };
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: profile, error: null }));
      const result = await dal.createProfile('Test', 'hash');
      expect(result).toEqual(profile);
    });

    it('createProfile throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.createProfile('Test', 'hash')).rejects.toEqual({ message: 'fail' });
    });

    it('getProfile returns profile on success', async () => {
      const profile: Profile = {
        id: 'uuid',
        display_name: 'Test',
        passcode_hash: 'hash',
        created_at: 'now',
      };
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: profile, error: null }));
      const result = await dal.getProfile('uuid');
      expect(result).toEqual(profile);
    });

    it('getProfile throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.getProfile('uuid')).rejects.toEqual({ message: 'fail' });
    });

    it('getProfiles returns array on success', async () => {
      const profiles: Profile[] = [
        { id: 'uuid', display_name: 'Test', passcode_hash: 'hash', created_at: 'now' }
      ];
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: profiles, error: null }));
      const result = await dal.getProfiles();
      expect(result).toEqual(profiles);
    });

    it('getProfiles throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.getProfiles()).rejects.toEqual({ message: 'fail' });
    });
  });

  describe('Tag Operations', () => {
    it('saveTag returns tag on success', async () => {
      const tag: Tag = {
        id: 'uuid',
        profile_id: 'profile',
        url: 'url',
        selector_hash: 'sel',
        style_id: 'style',
        created_at: 'now',
        updated_at: 'now',
        active: true,
      };
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: tag, error: null }));
      const result = await dal.saveTag({
        profile_id: 'profile',
        url: 'url',
        selector_hash: 'sel',
        style_id: 'style',
        active: true,
      });
      expect(result).toEqual(tag);
    });

    it('saveTag throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(
        dal.saveTag({
          profile_id: 'profile',
          url: 'url',
          selector_hash: 'sel',
          style_id: 'style',
          active: true,
        })
      ).rejects.toEqual({ message: 'fail' });
    });

    it('getTagsForUrl returns tags on success', async () => {
      const tags: Tag[] = [
        { id: 'uuid', profile_id: 'profile', url: 'url', selector_hash: 'sel', style_id: 'style', created_at: 'now', updated_at: 'now', active: true }
      ];
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: tags, error: null }));
      const result = await dal.getTagsForUrl('url');
      expect(result).toEqual(tags);
    });

    it('getTagsForUrl throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.getTagsForUrl('url')).rejects.toEqual({ message: 'fail' });
    });

    it('getAllTags returns tags on success', async () => {
      const tags: Tag[] = [
        { id: 'uuid', profile_id: 'profile', url: 'url', selector_hash: 'sel', style_id: 'style', created_at: 'now', updated_at: 'now', active: true }
      ];
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: tags, error: null }));
      const result = await dal.getAllTags();
      expect(result).toEqual(tags);
    });

    it('getAllTags throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.getAllTags()).rejects.toEqual({ message: 'fail' });
    });

    it('deleteTag resolves on success', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ error: null }));
      await expect(dal.deleteTag('uuid')).resolves.toBeUndefined();
    });

    it('deleteTag throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ error: { message: 'fail' } }));
      await expect(dal.deleteTag('uuid')).rejects.toEqual({ message: 'fail' });
    });
  });

  describe('Style Operations', () => {
    it('createStyle returns style on success', async () => {
      const style = { id: 'uuid', name: 'Style', font_url: 'font', svg_url: 'svg', premium: false, created_at: 'now' };
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: style, error: null }));
      const result = await dal.createStyle({ name: 'Style', font_url: 'font', svg_url: 'svg', premium: false });
      expect(result).toEqual(style);
    });

    it('createStyle throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.createStyle({ name: 'Style', font_url: 'font', svg_url: 'svg', premium: false })).rejects.toEqual({ message: 'fail' });
    });

    it('getStyles returns styles on success', async () => {
      const styles = [
        { id: 'uuid', name: 'Style', font_url: 'font', svg_url: 'svg', premium: false, created_at: 'now' }
      ];
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: styles, error: null }));
      const result = await dal.getStyles();
      expect(result).toEqual(styles);
    });

    it('getStyles throws on error', async () => {
      // @ts-ignore
      (dal as any).client = createChainableMock(Promise.resolve({ data: null, error: { message: 'fail' } }));
      await expect(dal.getStyles()).rejects.toEqual({ message: 'fail' });
    });

    it('getOwnedStyles returns empty array', async () => {
      const result = await dal.getOwnedStyles('profile-id');
      expect(result).toEqual([]);
    });
  });
}); 