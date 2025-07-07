import React, { useEffect, useState } from 'react';
import type { Style } from '../../src/data/types';
import { supabase } from './supabaseClient';

interface StyleSelectorProps {
  profileId: string;
  onStyleChange?: (styleId: string) => void;
}

interface StylePreviewProps {
  style: Style;
  isActive: boolean;
  onClick: () => void;
}

const StylePreview: React.FC<StylePreviewProps> = ({ style, isActive, onClick }) => {
  return (
    <div
      className={`style-preview ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        border: isActive ? '2px solid #FF6B00' : '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        margin: '8px 0',
        cursor: 'pointer',
        backgroundColor: isActive ? '#2a2a2a' : '#1a1a1a',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>{style.name}</h4>
          <div style={{ 
            fontFamily: style.font_family || "'Permanent Marker', cursive",
            fontSize: '14px',
            color: '#FF6B00',
            marginBottom: '8px'
          }}>
            Sample Text
          </div>
        </div>
        <div style={{ 
          width: '40px', 
          height: '20px', 
          border: '1px solid #666',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {style.name === 'spray-paint' && (
            <svg width="40" height="20" viewBox="0 0 40 20">
              <line x1="5" y1="5" x2="35" y2="15" stroke="#000000" strokeWidth="1" opacity="1.0" />
              <line x1="35" y1="5" x2="5" y2="15" stroke="#000000" strokeWidth="1" opacity="1.0" />
              <line x1="5" y1="5" x2="35" y2="15" stroke="#ff7f00" strokeWidth="1.5" opacity="0.8" />
              <line x1="35" y1="5" x2="5" y2="15" stroke="#ff7f00" strokeWidth="1.5" opacity="0.8" />
            </svg>
          )}
          {style.name === 'marker' && (
            <svg width="40" height="20" viewBox="0 0 40 20">
              <path d="M 4 8 Q 20 2 36 12" stroke="#ff0000" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
      {style.premium && (
        <div style={{ 
          fontSize: '10px', 
          color: '#FFB800', 
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          Premium
        </div>
      )}
    </div>
  );
};

export const StyleSelector: React.FC<StyleSelectorProps> = ({ profileId, onStyleChange }) => {
  const [styles, setStyles] = useState<Style[]>([]);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStyles();
  }, [profileId]);

  const loadStyles = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all available styles from Supabase
      const { data: availableStyles, error: stylesError } = await supabase
        .from('styles')
        .select('*');

      if (stylesError) throw stylesError;
      if (!availableStyles || availableStyles.length === 0) {
        setStyles([]);
        setLoading(false);
        return;
      }
      
      setStyles(availableStyles);
      await chrome.storage.local.set({ styles: availableStyles }); // Cache styles

      // 2. Fetch the current user's profile to find their active style
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('selected_style_id')
        .eq('id', profileId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found)
        throw profileError;
      }

      // 3. Set the active style
      const activeId = profile?.selected_style_id || availableStyles[0]?.id || null;
      setActiveStyleId(activeId);

    } catch (err: any) {
      console.error('Error loading styles:', err);
      // Fallback to cached styles if Supabase fails
      const storageResult = await chrome.storage.local.get('styles');
      if (storageResult.styles && storageResult.styles.length > 0) {
        setStyles(storageResult.styles);
        setActiveStyleId(storageResult.styles[0]?.id || null);
        console.warn('Using cached styles due to backend error.');
      } else {
        setError('Failed to load styles.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStyleSelect = async (styleId: string) => {
    try {
      // Optimistically update the UI
      setActiveStyleId(styleId);

      // Update the user's profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ selected_style_id: styleId })
        .eq('id', profileId);

      if (error) {
        // If the update fails, maybe revert the UI and show an error
        console.error('Failed to update style:', error);
        setError('Failed to save style selection.');
        // Optionally, you could refetch the original style to revert the UI
        return;
      }
      
      // CS-5.4: Send SET_ACTIVE_STYLE to background script for proper broadcasting
      try {
        console.log('[Graffiti Popup] Sending SET_ACTIVE_STYLE to background script...');
        const response = await chrome.runtime.sendMessage({
          type: 'SET_ACTIVE_STYLE',
          profileId: profileId,
          styleId: styleId
        });
        
        if (response && response.success) {
          console.log('[Graffiti Popup] Background script confirmed style change');
        } else {
          console.warn('[Graffiti Popup] Background script failed to process style change:', response?.error);
        }
      } catch (messageError: any) {
        console.error('[Graffiti Popup] Failed to notify background script:', messageError);
        // Don't fail the whole operation if background communication fails
      }

      // Call callback if provided
      if (onStyleChange) {
        onStyleChange(styleId);
      }
    } catch (err: any) {
      console.error('Error selecting style:', err);
      setError('Failed to update style');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#666' }}>Loading styles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#ff4444' }}>{error}</div>
        <button 
          onClick={loadStyles}
          style={{ 
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#FF6B00',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#666' }}>No styles available</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Select Style</h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {styles.map((style) => (
          <StylePreview
            key={style.id}
            style={style}
            isActive={activeStyleId === style.id}
            onClick={() => handleStyleSelect(style.id)}
          />
        ))}
      </div>
    </div>
  );
}; 