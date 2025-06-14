// Mock the electronAPI
const mockElectronAPI = {
  importPatches: jest.fn(),
  exportPatches: jest.fn(),
  loadPatches: jest.fn(),
  updatePatch: jest.fn(),
  loadLibraries: jest.fn(),
  loadBanksByLibrary: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('App', () => {
  const mockPatches = [
    {
      id: 1,
      bank_id: 1,
      name: 'Patch 1',
      fingerprint: 'fp1',
      content: 'content1',
      favorited: 0,
      tags: ['tag1', 'tag2'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      library: 'Library 1',
      path: '/path/to/patch1'
    },
    {
      id: 2,
      bank_id: 2,
      name: 'Patch 2',
      fingerprint: 'fp2',
      content: 'content2',
      favorited: 0,
      tags: ['tag3', 'tag4'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      library: 'Library 2',
      path: '/path/to/patch2'
    },
  ];

  const mockLibraries = ['Library 1', 'Library 2'];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockElectronAPI.loadLibraries.mockResolvedValue(mockLibraries);
    mockElectronAPI.importPatches.mockResolvedValue(mockPatches);
  });

  it('should render the library filter select box', async () => {
    render(<App />);
    
    // Wait for libraries to load
    const filterLabel = await screen.findByText('Filter by Library');
    expect(filterLabel).toBeInTheDocument();
    
    const selectBox = screen.getByLabelText('Filter by Library');
    expect(selectBox).toBeInTheDocument();
  });

  it('should show no patches initially', () => {
    render(<App />);
    
    // Check that no patches are rendered
    const patch1 = screen.queryByText('Patch 1');
    const patch2 = screen.queryByText('Patch 2');
    
    expect(patch1).not.toBeInTheDocument();
    expect(patch2).not.toBeInTheDocument();
  });

  it('should load and display patches after import', async () => {
    render(<App />);
    
    // Click the import button
    const importButton = screen.getByText('Import Library');
    fireEvent.click(importButton);
    
    // Wait for patches to load
    const patch1 = await screen.findByText('Patch 1');
    const patch2 = await screen.findByText('Patch 2');
    
    expect(patch1).toBeInTheDocument();
    expect(patch2).toBeInTheDocument();
  });

  it('should filter patches when a specific library is selected', async () => {
    render(<App />);
    
    // Import patches first
    const importButton = screen.getByText('Import Library');
    fireEvent.click(importButton);
    
    // Wait for the select box to be available
    const selectBox = await screen.findByLabelText('Filter by Library');
    
    // Select Library 1
    fireEvent.change(selectBox, { target: { value: 'Library 1' } });
    
    // Check that only Patch 1 is visible
    const patch1 = screen.getByText('Patch 1');
    expect(patch1).toBeInTheDocument();
    
    // Check that Patch 2 is not visible
    const patch2 = screen.queryByText('Patch 2');
    expect(patch2).not.toBeInTheDocument();
  });

  it('should load libraries on mount', async () => {
    render(<App />);
    
    expect(mockElectronAPI.loadLibraries).toHaveBeenCalled();
    
    // Wait for libraries to load and check they're in the select box
    const library1 = await screen.findByText('Library 1');
    const library2 = await screen.findByText('Library 2');
    
    expect(library1).toBeInTheDocument();
    expect(library2).toBeInTheDocument();
  });
}); 