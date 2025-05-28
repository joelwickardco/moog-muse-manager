import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../renderer/App';

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

  beforeEach(() => {
    window.electronAPI.loadPatches.mockResolvedValue(mockPatches);
  });

  it('should load and display patches on mount', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    const patch1 = await screen.findByText('Test Patch 1');
    const patch2 = await screen.findByText('Test Patch 2');
    
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
}); 