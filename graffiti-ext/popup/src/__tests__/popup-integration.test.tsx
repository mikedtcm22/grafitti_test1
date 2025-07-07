import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Popup from '../Popup';
import type { Style } from '../../../src/data/types';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

// Mock chrome.tabs
const mockTabs = {
  query: jest.fn(),
  sendMessage: jest.fn()
};

// Mock global chrome object
global.chrome = {
  storage: {
    local: mockStorage
  },
  tabs: mockTabs
} as any;

// Mock fetch
global.fetch = jest.fn();

describe('Popup Integration Tests', () => {
  const mockProfile = { id: 'profile-1', display_name: 'Test User' };
  const mockStyles: Style[] = [
    {
      id: 'style-1',
      name: 'spray-paint',
      font_family: 'Chalkboard',
      premium: false,
      created_at: '2025-01-01'
    },
    {
      id: 'style-2',
      name: 'marker',
      font_family: 'Arial',
      premium: true,
      created_at: '2025-01-01'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockResolvedValue({ profile: mockProfile });
    mockStorage.set.mockResolvedValue(undefined);
    mockStorage.remove.mockResolvedValue(undefined);
    mockTabs.query.mockResolvedValue([{ id: 123 }]);
    mockTabs.sendMessage.mockResolvedValue(undefined);
  });

  // Helper to render Popup with initialProfile
  function renderPopupWithProfile() {
    return render(<Popup initialProfile={mockProfile} />);
  }

  describe('Popup <-> Backend/Storage Integration', () => {
    it('should fetch styles from backend and cache them', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        expect(screen.getByText('Select Style')).toBeInTheDocument();
        expect(mockStorage.set).toHaveBeenCalledWith({ styles: mockStyles });
      });
    });

    it('should set active style and persist to backend and storage', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      await waitFor(() => {
        // Should update backend
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/profiles/profile-1/active-style',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ style_id: 'style-2' })
          })
        );

        // Should update local storage
        expect(mockStorage.set).toHaveBeenCalledWith({
          profiles: [{ id: 'profile-1', display_name: 'Test User', selected_style_id: 'style-2' }]
        });
      });
    });

    it('should handle backend errors gracefully and fallback to local storage', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        // Should still show styles from local storage
        expect(screen.getByText('spray-paint')).toBeInTheDocument();
        expect(screen.getByText('marker')).toBeInTheDocument();
      });
    });

    it('should handle offline mode and sync when back online', async () => {
      // Start offline
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      // Should still update local storage even when offline
      await waitFor(() => {
        expect(mockStorage.set).toHaveBeenCalledWith({
          profiles: [{ id: 'profile-1', display_name: 'Test User', selected_style_id: 'style-2' }]
        });
      });

      // Come back online and try to sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-2' })
      });

      // Trigger a style change to test sync
      const sprayPaintStyle = screen.getByText('spray-paint').closest('.style-preview');
      fireEvent.click(sprayPaintStyle!);

      await waitFor(() => {
        // Should now successfully update backend
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/profiles/profile-1/active-style',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ style_id: 'style-1' })
          })
        );
      });
    });
  });

  describe('Popup <-> Content Script Integration', () => {
    it('should send style change message to content script', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      await waitFor(() => {
        // Should send message to content script
        expect(mockTabs.sendMessage).toHaveBeenCalledWith(123, {
          type: 'STYLE_CHANGED',
          styleId: 'style-2'
        });
      });
    });

    it('should handle content script message errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      // Mock content script message failure
      mockTabs.sendMessage.mockRejectedValue(new Error('Content script not available'));

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      // Should still update backend and storage even if content script fails
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/profiles/profile-1/active-style',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ style_id: 'style-2' })
          })
        );
        expect(mockStorage.set).toHaveBeenCalled();
      });
    });

    it('should handle multiple tabs/windows', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      // Mock multiple tabs
      mockTabs.query.mockResolvedValue([
        { id: 123 },
        { id: 456 }
      ]);

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      // Should send message to the active tab only
      await waitFor(() => {
        expect(mockTabs.sendMessage).toHaveBeenCalledWith(123, {
          type: 'STYLE_CHANGED',
          styleId: 'style-2'
        });
        // Should not send to the second tab
        expect(mockTabs.sendMessage).not.toHaveBeenCalledWith(456, expect.anything());
      });
    });
  });

  describe('Live Preview Integration', () => {
    it('should provide immediate feedback on style selection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      renderPopupWithProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Click styles button to show style selector
      const stylesButton = screen.getByText('Styles');
      fireEvent.click(stylesButton);

      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      // Should immediately update the active style indicator
      await waitFor(() => {
        const markerPreview = screen.getByText('marker').closest('.style-preview');
        expect(markerPreview).toHaveStyle({ border: '2px solid #FF6B00' });
        
        const sprayPaintPreview = screen.getByText('spray-paint').closest('.style-preview');
        expect(sprayPaintPreview).toHaveStyle({ border: '1px solid #333' });
      });
    });
  });
}); 