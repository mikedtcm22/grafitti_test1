import React, { useEffect, useState } from 'react';
import { StyleSelector } from './StyleSelector';
import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';
import type { Style } from '../../src/data/types';

function LoginForm({ onLogin, onShowCreate }: { onLogin: (profile: { id: string; display_name: string }) => void, onShowCreate: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('display_name', displayName);

      if (fetchError) throw fetchError;
      
      const profile = profiles?.[0];

      if (!profile) {
        setError("Couldn't find that username/password combination");
        setLoading(false);
        return;
      }
      
      const match = await bcrypt.compare(passcode, profile.passcode_hash);
      
      if (!match) {
        setError("Couldn't find that username/password combination");
        setLoading(false);
        return;
      }
      
      const loggedInProfile = { id: profile.id, display_name: profile.display_name };
      await chrome.storage.local.set({ profile: loggedInProfile });
      onLogin(loggedInProfile);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="text"
        placeholder="Display Name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Passcode"
        value={passcode}
        onChange={e => setPasscode(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      <button type="button" onClick={onShowCreate}>Create New</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}

function CreateProfileForm({ onCreated, onBack }: { onCreated: (profile: { id: string; display_name: string }) => void, onBack: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passcode !== confirm) {
      setError('Passcodes do not match');
      return;
    }
    setLoading(true);
    try {
      const passcode_hash = await bcrypt.hash(passcode, 10);
      
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({ display_name: displayName, passcode_hash: passcode_hash })
        .select()
        .single();

      if (insertError) {
        const errMsg = insertError.message.toLowerCase();
        if ((errMsg.includes('unique') && errMsg.includes('display_name')) || errMsg.includes('duplicate key value')) {
          setError('That username is already taken!');
        } else {
          setError(insertError.message || 'Profile creation failed');
        }
        return;
      }

      const newProfile = { id: data.id, display_name: data.display_name };
      await chrome.storage.local.set({ profile: newProfile });
      
      // Assign a default style to the new profile
      try {
        const { data: styles, error: stylesError } = await supabase
          .from('styles')
          .select('id')
          .limit(1);

        if (stylesError) throw stylesError;

        if (styles && styles.length > 0) {
          const defaultStyleId = styles[0].id;
          await supabase
            .from('profiles')
            .update({ selected_style_id: defaultStyleId })
            .eq('id', newProfile.id);
        }
      } catch (styleError) {
        // Log the error but don't block the user creation process
        console.error('Failed to assign default style:', styleError);
      }

      onCreated(newProfile);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="text"
        placeholder="Display Name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Passcode"
        value={passcode}
        onChange={e => setPasscode(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Confirm Passcode"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Profile'}</button>
      <button type="button" onClick={onBack}>Back to Login</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}

function ProfileView({ profile, activeStyleName, onLogout, onStyleChange }: { profile: { id: string; display_name: string }, activeStyleName: string | null, onLogout: () => void, onStyleChange: (styleId: string) => void }) {
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Logged in as <b>{profile.display_name}</b></div>
        <button 
          onClick={() => setShowStyleSelector(!showStyleSelector)}
          style={{
            padding: '4px 8px',
            backgroundColor: showStyleSelector ? '#FF6B00' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {showStyleSelector ? 'Hide Styles' : 'Styles'}
        </button>
      </div>
      
      {activeStyleName && !showStyleSelector && (
        <div style={{ fontSize: '12px', color: '#999', paddingTop: '4px' }}>
          Current Style: <b>{activeStyleName}</b>
        </div>
      )}

      {showStyleSelector && (
        <StyleSelector 
          profileId={profile.id} 
          onStyleChange={onStyleChange}
        />
      )}
      
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}

export default function Popup({ initialProfile }: { initialProfile?: { id: string; display_name: string } }) {
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(initialProfile || null);
  const [screen, setScreen] = useState<'login' | 'create'>('login');
  const [activeStyleName, setActiveStyleName] = useState<string | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [backgroundHealthy, setBackgroundHealthy] = useState<boolean | null>(null);
  
  // CS-7.0: Background Script Health Check
  const testBackgroundHealth = async () => {
    console.log('[Popup] CS-7.0: Testing background script health...');
    try {
      const startTime = Date.now();
      
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'PING'}, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      const responseTime = Date.now() - startTime;
      console.log('[Popup] CS-7.0: ✅ Background script is HEALTHY');
      console.log('[Popup] CS-7.0: Response:', response);
      console.log('[Popup] CS-7.0: Response time:', responseTime + 'ms');
      setBackgroundHealthy(true);
      
    } catch (error) {
      console.error('[Popup] CS-7.0: ❌ Background script is NOT RESPONDING');
      console.error('[Popup] CS-7.0: Error:', error);
      setBackgroundHealthy(false);
    }
  };

  // Test background health immediately when popup loads
  useEffect(() => {
    testBackgroundHealth();
  }, []);

  const fetchProfileData = async (profileId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('selected_style_id')
        .eq('id', profileId)
        .single();

      if (profileError) throw new Error(`Failed to fetch profile: ${profileError.message}`);

      const { data: allStyles, error: stylesError } = await supabase
        .from('styles')
        .select('*');
      
      if (stylesError) throw new Error(`Failed to fetch styles: ${stylesError.message}`);
      
      setStyles(allStyles || []);
      
      if (profileData?.selected_style_id) {
        const styleName = allStyles?.find(s => s.id === profileData.selected_style_id)?.name;
        setActiveStyleName(styleName || 'Unknown');
      } else {
        setActiveStyleName(allStyles?.[0]?.name || 'Default');
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      setActiveStyleName('Error');
    }
  };

  useEffect(() => {
    if (initialProfile) return;
    chrome.storage.local.get('profile', (result) => {
      if (result.profile) {
        setProfile(result.profile);
        fetchProfileData(result.profile.id);
      }
    });
  }, [initialProfile]);
  
  const handleLogin = (profile: { id: string; display_name: string }) => {
    setProfile(profile);
    fetchProfileData(profile.id);
  };

  const handleLogout = () => {
    chrome.storage.local.remove('profile', () => {
      setProfile(null);
      setActiveStyleName(null);
    });
    setScreen('login');
  };
  const handleShowCreate = () => setScreen('create');
  const handleBackToLogin = () => setScreen('login');

  const handleCreated = (profile: { id: string; display_name: string }) => {
    setProfile(profile);
    fetchProfileData(profile.id);
    setScreen('login');
  };

  const handleStyleChanged = (styleId: string) => {
    const styleName = styles.find(s => s.id === styleId)?.name;
    setActiveStyleName(styleName || null);
  };
  
  return (
    <div style={{ minWidth: 250, minHeight: 220, padding: 16, background: '#181818', color: '#fff', borderRadius: 8 }}>
      {/* CS-7.0: Background Script Health Indicator */}
      <div style={{ 
        marginBottom: 12, 
        padding: 8, 
        borderRadius: 4, 
        fontSize: '11px',
        backgroundColor: backgroundHealthy === null ? '#333' : backgroundHealthy ? '#1a5d1a' : '#5d1a1a',
        border: `1px solid ${backgroundHealthy === null ? '#555' : backgroundHealthy ? '#2d8f2d' : '#8f2d2d'}`
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Background Script Status:</div>
        <div>
          {backgroundHealthy === null ? '🔄 Testing...' : 
           backgroundHealthy ? '✅ Healthy (Responding)' : 
           '❌ Not Responding (Check Console)'}
        </div>
        {!backgroundHealthy && backgroundHealthy !== null && (
          <div style={{ marginTop: 4, fontSize: '10px', color: '#ff9999' }}>
            Check chrome://extensions → Inspect views → service worker
          </div>
        )}
      </div>

      {profile ? (
        <ProfileView profile={profile} activeStyleName={activeStyleName} onLogout={handleLogout} onStyleChange={handleStyleChanged} />
      ) : screen === 'login' ? (
        <LoginForm onLogin={handleLogin} onShowCreate={handleShowCreate} />
      ) : (
        <CreateProfileForm onCreated={handleCreated} onBack={handleBackToLogin} />
      )}
    </div>
  );
} 