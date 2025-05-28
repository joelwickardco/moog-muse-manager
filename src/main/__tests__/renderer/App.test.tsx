import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../renderer/App';
import { Library } from '../../../main/database/types';

describe('App', () => {
  const mockPatches = [
    {
      path: '/test/path/patch1.mmp',
      name: 'Test Patch 1',
      loved: true,
      tags: ['test', 'bass'],
      bank: 'userbank1',
      library: 'testlib1',
      checksum: 'testchecksum123',
      custom: true
    },
    {
      path: '/test/path/patch2.mmp',
      name: 'Test Patch 2',
      loved: false,
      category: 'Lead',
      tags: ['test', 'lead'],
      bank: 'factorybank1',
      library: 'testlib2',
      checksum: 'testchecksum456',
      custom: false
    }
  ];

  const mockLibraries: Library[] = [
    { id: 1, name: 'Library 1', fingerprint: 'fingerprint1' },
    { id: 2, name: 'Library 2', fingerprint: 'fingerprint2' }
  ];

  beforeEach(() => {
    window.electronAPI = {
      ...window.electronAPI,
      loadPatches: jest.fn().mockResolvedValue([
        {
          path: '/test/path/patch1.mmp',
          name: 'Patch 1',
          loved: true,
          tags: ['test', 'bass'],
          bank: 'userbank1',
          library: 'testlib1',
          checksum: 'testchecksum123',
          custom: true
        },
        {
          path: '/test/path/patch2.mmp',
          name: 'Patch 2',
          loved: false,
          category: 'Lead',
          tags: ['test', 'lead'],
          bank: 'factorybank1',
          library: 'testlib2',
          checksum: 'testchecksum456',
          custom: false
        }
      ]),
      loadLibraries: jest.fn().mockResolvedValue(mockLibraries),
      importPatches: jest.fn(),
      exportPatches: jest.fn(),
      updatePatch: jest.fn(),
      loadBanksByLibrary: jest.fn(),
    };
  });

  it('should load and display patches after import', async () => {
    await act(async () => {
      render(<App />);
    });

    // Patches should not be present initially
    expect(screen.queryByText('Patch 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Patch 2')).not.toBeInTheDocument();

    // Open the menu
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    // Click the import button
    const importButton = screen.getByText('Import Library');
    fireEvent.click(importButton);

    // Wait for patches to load
    const patch1 = await screen.findByText('Patch 1');
    const patch2 = await screen.findByText('Patch 2');

    expect(patch1).toBeInTheDocument();
    expect(patch2).toBeInTheDocument();
  });

  it('should open the menu when the menu button is clicked', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    
    expect(screen.getByText('Import Library')).toBeInTheDocument();
  });

  it('should close the menu when clicking outside', async () => {
    await act(async () => {
      render(<App />);
    });

    // Open the menu
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('Import Library')).toBeInTheDocument();

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    // The menu should close
    expect(screen.queryByText('Import Library')).not.toBeInTheDocument();
  });

  it('should display library names in the select dropdown', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check if library names are displayed in the select
    expect(screen.getByText('Library 1')).toBeInTheDocument();
    expect(screen.getByText('Library 2')).toBeInTheDocument();
  });
}); 