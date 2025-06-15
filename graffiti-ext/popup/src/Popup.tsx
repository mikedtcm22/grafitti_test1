import React, { useEffect, useState } from 'react';

function LoginForm({ onLogin, onShowCreate }: { onLogin: (profile: { id: string; display_name: string }) => void, onShowCreate: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, passcode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      await chrome.storage.local.set({ profile: data });
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
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
      <button type="submit">Login</button>
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passcode !== confirm) {
      setError('Passcodes do not match');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, passcode })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = (data.error || '').toLowerCase();
        if ((errMsg.includes('unique') && errMsg.includes('display_name')) || errMsg.includes('duplicate key value')) {
          setError('That username is already taken!');
        } else {
          setError(data.error || 'Profile creation failed');
        }
        return;
      }
      await chrome.storage.local.set({ profile: data });
      onCreated(data);
    } catch (err: any) {
      setError(err.message);
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
      <button type="submit">Create Profile</button>
      <button type="button" onClick={onBack}>Back to Login</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}

function ProfileView({ profile, onLogout }: { profile: { id: string; display_name: string }, onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>Logged in as <b>{profile.display_name}</b></div>
      <div>Current Style Combo: <i>(placeholder)</i></div>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}

export default function Popup() {
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null);
  const [screen, setScreen] = useState<'login' | 'create'>('login');
  useEffect(() => {
    chrome.storage.local.get('profile', (result) => {
      if (result.profile) setProfile(result.profile);
    });
  }, []);
  const handleLogin = (profile: { id: string; display_name: string }) => setProfile(profile);
  const handleLogout = () => {
    chrome.storage.local.remove('profile', () => setProfile(null));
    setScreen('login');
  };
  const handleShowCreate = () => setScreen('create');
  const handleBackToLogin = () => setScreen('login');
  const handleCreated = (profile: { id: string; display_name: string }) => {
    setProfile(profile);
    setScreen('login');
  };
  return (
    <div style={{ minWidth: 250, minHeight: 220, padding: 16, background: '#181818', color: '#fff', borderRadius: 8 }}>
      {profile ? (
        <ProfileView profile={profile} onLogout={handleLogout} />
      ) : screen === 'login' ? (
        <LoginForm onLogin={handleLogin} onShowCreate={handleShowCreate} />
      ) : (
        <CreateProfileForm onCreated={handleCreated} onBack={handleBackToLogin} />
      )}
    </div>
  );
} 