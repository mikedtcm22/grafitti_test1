const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
import { SupabaseDAL } from '../src/data/index';
import type { Request, Response } from 'express';

function createApp(dalInstance?: any) {
  const app = express();
  app.use(bodyParser.json());

  let dal = dalInstance;
  if (!dal) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment');
    }
    dal = new SupabaseDAL(supabaseUrl, supabaseAnonKey);
  }

  app.post('/api/profile', async (req: Request, res: Response) => {
    const { display_name, passcode } = req.body;
    if (!display_name || typeof display_name !== 'string' || display_name.length < 2) {
      return res.status(400).json({ error: 'Invalid display_name' });
    }
    if (!passcode || typeof passcode !== 'string' || passcode.length < 4) {
      return res.status(400).json({ error: 'Invalid passcode' });
    }
    try {
      const passcode_hash = await bcrypt.hash(passcode, 10);
      const profile = await dal.createProfile(display_name, passcode_hash);
      res.status(201).json({ id: profile.id, display_name: profile.display_name, created_at: profile.created_at });
    } catch (err: any) {
      if (err.message?.includes('duplicate key value') || err.message?.includes('unique constraint')) {
        return res.status(409).json({ error: 'Display name already taken' });
      }
      res.status(500).json({ error: err.message || 'Failed to create profile' });
    }
  });

  app.post('/api/login', async (req: Request, res: Response) => {
    const { display_name, passcode } = req.body;
    if (!display_name || typeof display_name !== 'string' || display_name.length < 2) {
      return res.status(400).json({ error: 'Invalid display_name' });
    }
    if (!passcode || typeof passcode !== 'string' || passcode.length < 4) {
      return res.status(400).json({ error: 'Invalid passcode' });
    }
    try {
      const profile = await dal.getProfiles().then((profiles: any[]) => profiles.find((p: any) => p.display_name === display_name));
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      const match = await bcrypt.compare(passcode, profile.passcode_hash);
      if (!match) return res.status(401).json({ error: 'Incorrect passcode' });
      res.status(200).json({ id: profile.id, display_name: profile.display_name, created_at: profile.created_at });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to login' });
    }
  });

  // Style management endpoints
  app.get('/api/styles', async (_req: Request, res: Response) => {
    try {
      const styles = await dal.getStyles();
      res.status(200).json(styles);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get styles' });
    }
  });

  app.get('/api/profiles/:id/active-style', async (req: Request, res: Response) => {
    try {
      const profileId = req.params.id;
      const profile = await dal.getProfiles().then((profiles: any[]) => profiles.find((p: any) => p.id === profileId));
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.status(200).json({ style_id: profile.selected_style_id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get active style' });
    }
  });

  app.put('/api/profiles/:id/active-style', async (req: Request, res: Response) => {
    try {
      const profileId = req.params.id;
      const { style_id } = req.body;
      if (!style_id) return res.status(400).json({ error: 'style_id is required' });
      
      // Verify the style exists
      const styles = await dal.getStyles();
      const styleExists = styles.some((s: any) => s.id === style_id);
      if (!styleExists) return res.status(404).json({ error: 'Style not found' });
      
      // Update the profile's selected style
      await dal.setActiveStyle(profileId, style_id);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update active style' });
    }
  });

  return app;
}

const port = process.env.PORT || 4000;
const app = createApp();

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

export { app, createApp }; 