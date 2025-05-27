import '@testing-library/jest-dom';

// Mock window.electronAPI
const mockElectronAPI = {
  importPatches: jest.fn(),
  exportPatches: jest.fn(),
  loadPatches: jest.fn(),
  updatePatch: jest.fn()
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 