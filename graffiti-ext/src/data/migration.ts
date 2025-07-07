import { ChromeStorageDAL } from './chrome-storage';
import { SupabaseDAL } from './index';

interface MigrationStats {
    profiles: { total: number; migrated: number; errors: number };
    styles: { total: number; migrated: number; errors: number };
    tags: { total: number; migrated: number; errors: number };
}

export class DataMigration {
    private chromeDAL: ChromeStorageDAL;
    private supabaseDAL: SupabaseDAL;
    private stats: MigrationStats = {
        profiles: { total: 0, migrated: 0, errors: 0 },
        styles: { total: 0, migrated: 0, errors: 0 },
        tags: { total: 0, migrated: 0, errors: 0 }
    };

    constructor(chromeDAL: ChromeStorageDAL, supabaseDAL: SupabaseDAL) {
        this.chromeDAL = chromeDAL;
        this.supabaseDAL = supabaseDAL;
    }

    async migrate(): Promise<void> {
        console.log('Starting data migration from Chrome Storage to Supabase...');
        
        try {
            await this.migrateProfiles();
            await this.migrateStyles();
            await this.migrateTags();
            
            this.printStats();
            console.log('Migration completed successfully!');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    public async migrateProfiles(): Promise<void> {
        console.log('Migrating profiles...');
        const profiles = await this.chromeDAL.getProfiles();
        this.stats.profiles.total = profiles.length;

        for (const profile of profiles) {
            try {
                await this.supabaseDAL.createProfile(profile.display_name, profile.passcode_hash);
                this.stats.profiles.migrated++;
            } catch (error) {
                console.error(`Failed to migrate profile ${profile.id}:`, error);
                this.stats.profiles.errors++;
            }
        }
    }

    public async migrateStyles(): Promise<void> {
        console.log('Migrating styles...');
        const styles = await this.chromeDAL.getStyles();
        this.stats.styles.total = styles.length;

        for (const style of styles) {
            try {
                const { id, created_at, ...styleData } = style;
                await this.supabaseDAL.createStyle(styleData);
                this.stats.styles.migrated++;
            } catch (error) {
                console.error(`Failed to migrate style ${style.id}:`, error);
                this.stats.styles.errors++;
            }
        }
    }

    public async migrateTags(): Promise<void> {
        console.log('Migrating tags...');
        const tags = await this.chromeDAL.getAllTags();
        this.stats.tags.total = tags.length;

        for (const tag of tags) {
            try {
                const { id, created_at, updated_at, ...tagData } = tag;
                await this.supabaseDAL.saveTag(tagData);
                this.stats.tags.migrated++;
            } catch (error) {
                console.error(`Failed to migrate tag ${tag.id}:`, error);
                this.stats.tags.errors++;
            }
        }
    }

    public printStats(): void {
        console.log('\nMigration Statistics:');
        console.log('Profiles:', this.stats.profiles);
        console.log('Styles:', this.stats.styles);
        console.log('Tags:', this.stats.tags);
    }
}

// Usage example:
/*
const migration = new DataMigration(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

migration.migrate()
    .then(stats => console.log('Migration complete:', stats))
    .catch(error => console.error('Migration failed:', error));
*/ 