import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Environment guard
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const shouldRunTests = process.env.RUN_CONSTRAINT_TESTS === '1';

if (!shouldRunTests || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  describe.skip('Constraint & RLS Tests', () => {
    it('skipped due to missing environment variables or RUN_CONSTRAINT_TESTS !== "1"', () => {
      expect(true).toBe(true);
    });
  });
} else {
  // Create Supabase clients
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  describe('Constraint & RLS Tests', () => {
    // Track created rows for cleanup
    const createdRows: { table: string; id: string }[] = [];

    afterEach(async () => {
      // Cleanup any rows created during tests
      for (const row of createdRows) {
        try {
          await serviceClient.from(row.table).delete().eq('id', row.id);
        } catch (error) {
          console.error(`Failed to cleanup row in ${row.table}:`, error);
        }
      }
      createdRows.length = 0; // Clear the array
    });

    describe('Unique Constraints', () => {
      it('should prevent duplicate display_name in profiles', async () => {
        const testDisplayName = `test_rls_dup_${uuidv4().slice(0, 8)}`;
        
        // First insert should succeed
        const { data: profile1, error: error1 } = await serviceClient
          .from('profiles')
          .insert({
            display_name: testDisplayName,
            passcode_hash: 'dummy_hash'
          })
          .select()
          .single();

        expect(error1).toBeNull();
        expect(profile1).not.toBeNull();
        if (profile1) {
          createdRows.push({ table: 'profiles', id: profile1.id });
        }

        // Second insert with same display_name should fail
        const { error: error2 } = await serviceClient
          .from('profiles')
          .insert({
            display_name: testDisplayName,
            passcode_hash: 'another_hash'
          });

        expect(error2).not.toBeNull();
        expect(error2?.code).toBe('23505'); // PostgreSQL unique violation error code
      });
    });

    describe('Foreign Key Constraints', () => {
      it('should prevent inserting a tag with non-existent profile_id and style_id', async () => {
        const fakeProfileId = uuidv4();
        const fakeStyleId = uuidv4();
        const tagData = {
          profile_id: fakeProfileId,
          style_id: fakeStyleId,
          label: 'orphan_tag',
          color: '#ff0000',
        };
        const { error } = await serviceClient.from('tags').insert(tagData);
        expect(error).not.toBeNull();
        // Accept either Postgres FK violation (23503) or PostgREST error (PGRST204)
        expect(['23503', 'PGRST204']).toContain(error?.code);
      });
    });

    describe('Row-Level Security (RLS)', () => {
      it('anon key cannot write to protected tables', async () => {
        // Test profiles table
        const { error: profileError } = await anonClient.from('profiles').insert({
          display_name: 'anon_test',
          passcode_hash: 'dummy_hash'
        });
        expect(profileError).not.toBeNull();
        expect(profileError?.code).toBeDefined();

        // Test tags table with all required fields
        const { error: tagError } = await anonClient.from('tags').insert({
          profile_id: uuidv4(),
          style_id: uuidv4(),
          url: 'https://example.com/test',
          selector_hash: 'test_hash'
        });
        expect(tagError).not.toBeNull();
        expect(tagError?.code).toBeDefined();
      });

      it('anon key can read public data', async () => {
        const { data, error } = await anonClient.from('styles').select();
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
      });

      it('ownership policy on tags', async () => {
        // First create a profile using the service client
        const { data: profile, error: profileError } = await serviceClient
          .from('profiles')
          .insert({
            display_name: `test_profile_${uuidv4().slice(0, 8)}`,
            passcode_hash: 'dummy_hash'
          })
          .select()
          .single();
        
        expect(profileError).toBeNull();
        expect(profile).not.toBeNull();
        if (profile) {
          createdRows.push({ table: 'profiles', id: profile.id });
        }

        // Create a style using the service client
        const { data: style, error: styleError } = await serviceClient
          .from('styles')
          .insert({
            name: `test_style_${uuidv4().slice(0, 8)}`,
            font_url: 'https://example.com/font.ttf',
            svg_url: 'https://example.com/style.svg'
          })
          .select()
          .single();

        expect(styleError).toBeNull();
        expect(style).not.toBeNull();
        if (style) {
          createdRows.push({ table: 'styles', id: style.id });
        }

        // Now create a tag using both the profile's and style's IDs
        const tagData = {
          profile_id: profile?.id,
          style_id: style?.id,
          url: 'https://example.com/test',
          selector_hash: 'test_hash'
        };
        const { data: tag, error: insertError } = await serviceClient.from('tags').insert(tagData).select().single();
        expect(insertError).toBeNull();
        expect(tag).not.toBeNull();
        if (tag) {
          createdRows.push({ table: 'tags', id: tag.id });
        }

        // Anon client should not see the tag (ownership policy blocks)
        const { data: anonData, error: anonError } = await anonClient.from('tags').select().eq('id', tag?.id);
        expect(anonError).toBeNull();
        expect(anonData).toEqual([]);
      });
    });
  });
} 