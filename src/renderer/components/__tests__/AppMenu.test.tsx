import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppMenu } from '../AppMenu';

describe('AppMenu', () => {
  it('renders the menu button', () => {
    const onImportLibrary = jest.fn();
    render(<AppMenu onImportLibrary={onImportLibrary} />);
    
    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
  });

  it('shows menu items when clicked', () => {
    const onImportLibrary = jest.fn();
    render(<AppMenu onImportLibrary={onImportLibrary} />);
    
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);
    
    const importLibraryButton = screen.getByText('Import Library');
    expect(importLibraryButton).toBeInTheDocument();
  });

  it('calls onImportLibrary when Import Library is clicked', () => {
    const onImportLibrary = jest.fn();
    render(<AppMenu onImportLibrary={onImportLibrary} />);
    
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);
    
    const importLibraryButton = screen.getByText('Import Library');
    fireEvent.click(importLibraryButton);
    
    expect(onImportLibrary).toHaveBeenCalled();
  });
}); 