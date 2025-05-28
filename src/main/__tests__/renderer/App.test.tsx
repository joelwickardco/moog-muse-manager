import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../renderer/App';

// Mock the electron API
const mockElectronAPI = {
  importPatches: jest.fn(),
  exportPatches: jest.fn(),
  loadPatches: jest.fn(),
  updatePatch: jest.fn(),
  loadLibraries: jest.fn(),
  loadBanksByLibrary: jest.fn(),
  getPatchesByLibrary: jest.fn(),
};

// Mock the window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('App', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock the initial data
    mockElectronAPI.loadLibraries.mockResolvedValue([
      { id: 1, name: 'Library 1' },
      { id: 2, name: 'Library 2' },
    ]);

    mockElectronAPI.loadPatches.mockResolvedValue([
      {
        id: 1,
        name: 'Patch 1',
        bank: 'Bank 1',
        path: '/path/to/patch1',
        favorited: false,
        tags: ['tag1', 'tag2'],
        library_id: 1,
      },
      {
        id: 2,
        name: 'Patch 2',
        bank: 'Bank 2',
        path: '/path/to/patch2',
        favorited: true,
        tags: ['tag3'],
        library_id: 1,
      },
    ]);

    mockElectronAPI.getPatchesByLibrary.mockResolvedValue([
      {
        id: 1,
        name: 'Patch 1',
        bank: 'Bank 1',
        path: '/path/to/patch1',
        favorited: false,
        tags: ['tag1', 'tag2'],
        library_id: 1,
      },
      {
        id: 2,
        name: 'Patch 2',
        bank: 'Bank 2',
        path: '/path/to/patch2',
        favorited: true,
        tags: ['tag3'],
        library_id: 1,
      },
    ]);
  });

  it('should load and display libraries', async () => {
    render(<App />);

    // Wait for libraries to load
    await waitFor(() => {
      expect(screen.getByText('Library 1')).toBeInTheDocument();
      expect(screen.getByText('Library 2')).toBeInTheDocument();
    });
  });

  it('should load and display patches when a library is selected', async () => {
    render(<App />);

    // Wait for libraries to load
    await waitFor(() => {
      expect(screen.getByText('Library 1')).toBeInTheDocument();
    });

    // Select a library
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });

    // Wait for patches to load
    await waitFor(() => {
      expect(screen.getByText('Patch 1')).toBeInTheDocument();
      expect(screen.getByText('Patch 2')).toBeInTheDocument();
    });
  });

  it('should toggle patch favorite status', async () => {
    mockElectronAPI.updatePatch.mockResolvedValue(true);
    render(<App />);

    // Wait for libraries to load
    await waitFor(() => {
      expect(screen.getByText('Library 1')).toBeInTheDocument();
    });

    // Select a library
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });

    // Wait for patches to load
    await waitFor(() => {
      expect(screen.getByText('Patch 1')).toBeInTheDocument();
    });

    // Toggle favorite status
    const favoriteCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(favoriteCheckbox);

    // Verify the update was called
    expect(mockElectronAPI.updatePatch).toHaveBeenCalledWith('1', {
      favorited: true,
    });
  });

  it('should display patches grouped by bank when a library is selected', async () => {
    render(<App />);

    // Wait for libraries to load
    await waitFor(() => {
      expect(screen.getByText('Library 1')).toBeInTheDocument();
    });

    // Select a library
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });

    // Wait for bank groups to appear
    await waitFor(() => {
      expect(screen.getByText('Bank 1 (1 patches)')).toBeInTheDocument();
      expect(screen.getByText('Bank 2 (1 patches)')).toBeInTheDocument();
    });
  });
}); 