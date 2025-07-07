import { readFileSync } from 'fs';
import { join } from 'path';

describe('Style Switching Migration', () => {
  const migrationPath = join(__dirname, '../../../../supabase/migrations/20250617_style_switching.sql');
  
  it('should have the correct migration file', () => {
    expect(() => {
      const migrationContent = readFileSync(migrationPath, 'utf8');
      expect(migrationContent).toBeDefined();
      expect(migrationContent.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  it('should contain required schema changes', () => {
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    // Check for profiles table changes
    expect(migrationContent).toContain('ALTER TABLE profiles');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS selected_style_id');
    
    // Check for styles table changes
    expect(migrationContent).toContain('ALTER TABLE styles');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS font_family');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS font_fallback_url');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS font_cdn_url');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS cross_out_svg_url');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS meta');
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS owner_profile_id');
  });

  it('should contain RLS policy updates', () => {
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    expect(migrationContent).toContain('DROP POLICY IF EXISTS "Allow all for anon" ON styles');
    expect(migrationContent).toContain('CREATE POLICY "styles_read"');
    expect(migrationContent).toContain('CREATE POLICY "styles_insert_own"');
    expect(migrationContent).toContain('CREATE POLICY "styles_update_own"');
    expect(migrationContent).toContain('CREATE POLICY "styles_delete_own"');
  });

  it('should contain seed data for built-in styles', () => {
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    expect(migrationContent).toContain('INSERT INTO styles');
    expect(migrationContent).toContain('spray-paint');
    expect(migrationContent).toContain('marker');
    expect(migrationContent).toContain('Chalkboard');
    expect(migrationContent).toContain('CurrentDefault');
    expect(migrationContent).toContain('ON CONFLICT (name) DO NOTHING');
  });

  it('should contain default style assignment logic', () => {
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    expect(migrationContent).toContain('DO $$');
    expect(migrationContent).toContain('UPDATE profiles SET selected_style_id');
    expect(migrationContent).toContain('WHERE selected_style_id IS NULL');
  });

  it('should be idempotent', () => {
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    // All ALTER TABLE statements should use IF NOT EXISTS
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS');
    
    // INSERT should use ON CONFLICT DO NOTHING
    expect(migrationContent).toContain('ON CONFLICT (name) DO NOTHING');
    
    // DROP POLICY should use IF EXISTS
    expect(migrationContent).toContain('DROP POLICY IF EXISTS');
  });
}); 