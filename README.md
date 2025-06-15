[![CI](https://github.com/mikedtcm22/grafitti_test1/actions/workflows/ci.yml/badge.svg)](https://github.com/mikedtcm22/grafitti_test1/actions/workflows/ci.yml)

# Graffiti Extension

## Development

### Running Tests

#### Migration Test
To run the migration test script:

1. Set up environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Run the test:
   ```bash
   npm run test:migration
   ```

   Or directly with tsx:
   ```bash
   npx tsx scripts/test-migration.ts
   ```

The script will:
- Create a test profile, style, and tag in Supabase
- Verify the data was created correctly
- Clean up the test data
- Print detailed logs of the process

Note: Make sure you have the correct Supabase credentials and permissions before running the test.
