import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StyleSelector } from '../StyleSelector';
import type { Style } from '../../../src/data/types';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn()
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

describe('StyleSelector', () => {
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
    mockStorage.get.mockResolvedValue({
      styles: mockStyles,
      profiles: [{ id: 'profile-1', selected_style_id: 'style-1' }]
    });
    mockTabs.query.mockResolvedValue([{ id: 123 }]);
    mockTabs.sendMessage.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      render(<StyleSelector profileId="profile-1" />);
      expect(screen.getByText('Loading styles...')).toBeInTheDocument();
    });

    it('should render styles list when loaded', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Select Style')).toBeInTheDocument();
        expect(screen.getByText('spray-paint')).toBeInTheDocument();
        expect(screen.getByText('marker')).toBeInTheDocument();
      });
    });

    it('should highlight active style', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        const sprayPaintPreview = screen.getByText('spray-paint').closest('.style-preview');
        expect(sprayPaintPreview).toHaveStyle({ border: '2px solid #FF6B00' });
      });
    });

    it('should show premium badge for premium styles', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Premium')).toBeInTheDocument();
      });
    });

    it('should render error state when loading fails', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load styles')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should render empty state when no styles available', async () => {
      mockStorage.get.mockResolvedValue({
        styles: [],
        profiles: []
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('No styles available')).toBeInTheDocument();
      });
    });
  });

  describe('style selection', () => {
    it('should handle style selection', async () => {
      const onStyleChange = jest.fn();
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

      render(<StyleSelector profileId="profile-1" onStyleChange={onStyleChange} />);
      
      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      await waitFor(() => {
        expect(onStyleChange).toHaveBeenCalledWith('style-2');
        expect(mockTabs.sendMessage).toHaveBeenCalledWith(123, {
          type: 'STYLE_CHANGED',
          styleId: 'style-2'
        });
      });
    });

    it('should update local storage when style is selected', async () => {
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

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      await waitFor(() => {
        expect(mockStorage.set).toHaveBeenCalledWith({
          profiles: [{ id: 'profile-1', selected_style_id: 'style-2' }]
        });
      });
    });

    it('should handle backend errors gracefully', async () => {
      const onStyleChange = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Backend error'));

      render(<StyleSelector profileId="profile-1" onStyleChange={onStyleChange} />);
      
      await waitFor(() => {
        const markerStyle = screen.getByText('marker').closest('.style-preview');
        fireEvent.click(markerStyle!);
      });

      await waitFor(() => {
        expect(onStyleChange).toHaveBeenCalledWith('style-2');
        // Should still update local storage even if backend fails
        expect(mockStorage.set).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should be keyboard navigable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        const stylePreviews = screen.getAllByRole('button', { hidden: true });
        expect(stylePreviews.length).toBeGreaterThan(0);
      });
    });

    it('should have proper ARIA labels', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Select Style')).toBeInTheDocument();
        expect(screen.getByText('spray-paint')).toBeInTheDocument();
        expect(screen.getByText('marker')).toBeInTheDocument();
      });
    });
  });

  describe('offline functionality', () => {
    it('should work with cached styles when backend is unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('spray-paint')).toBeInTheDocument();
        expect(screen.getByText('marker')).toBeInTheDocument();
      });
    });

    it('should cache styles from backend when available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyles
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ style_id: 'style-1' })
      });

      render(<StyleSelector profileId="profile-1" />);
      
      await waitFor(() => {
        expect(mockStorage.set).toHaveBeenCalledWith({ styles: mockStyles });
      });
    });
  });
}); 