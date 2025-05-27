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
      category: 'Bass',
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

  it('should filter patches by loved status', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Toggle loved filter
    await act(async () => {
      const lovedCheckbox = screen.getByLabelText('Loved');
      fireEvent.click(lovedCheckbox);
    });
    
    // Only loved patches should be visible
    expect(screen.getByText('Test Patch 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Patch 2')).not.toBeInTheDocument();
  });

  it('should filter patches by bank', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Select userbank1
    await act(async () => {
      const bankSelect = screen.getByLabelText('Bank');
      fireEvent.change(bankSelect, { target: { value: 'userbank1' } });
    });
    
    // Only patches from userbank1 should be visible
    expect(screen.getByText('Test Patch 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Patch 2')).not.toBeInTheDocument();
  });

  it('should filter patches by library', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Select testlib1
    await act(async () => {
      const librarySelect = screen.getByLabelText('Library');
      fireEvent.change(librarySelect, { target: { value: 'testlib1' } });
    });
    
    // Only patches from testlib1 should be visible
    expect(screen.getByText('Test Patch 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Patch 2')).not.toBeInTheDocument();
  });

  it('should filter patches by tag', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Enter 'bass' tag
    await act(async () => {
      const tagInput = screen.getByLabelText('Tags');
      fireEvent.change(tagInput, { target: { value: 'bass' } });
    });
    
    // Only patches with 'bass' tag should be visible
    expect(screen.getByText('Test Patch 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Patch 2')).not.toBeInTheDocument();
  });

  it('should filter patches by custom status', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Toggle custom filter
    await act(async () => {
      const customCheckbox = screen.getByLabelText('Custom');
      fireEvent.click(customCheckbox);
    });
    
    // Only custom patches should be visible
    expect(screen.getByText('Test Patch 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Patch 2')).not.toBeInTheDocument();
  });

  it('should reload patches when all filters are cleared', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Wait for patches to load
    await screen.findByText('Test Patch 1');
    
    // Set a filter
    await act(async () => {
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.change(categorySelect, { target: { value: 'Bass' } });
    });
    
    // Clear the filter
    await act(async () => {
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.change(categorySelect, { target: { value: '' } });
    });
    
    // Should have called loadPatches again
    expect(window.electronAPI.loadPatches).toHaveBeenCalledTimes(2);
  });
}); 