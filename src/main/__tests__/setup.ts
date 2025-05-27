// Mock Electron's app module since it's not available in test environment
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockImplementation((name: string) => {
      if (name === 'userData') {
        return '/tmp/test-app-data';
      }
      return name;
    }),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn()
  },
  ipcMain: {
    handle: jest.fn()
  }
}));

// Mock fs.promises
jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn(),
  exists: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  rmdir: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  basename: (path: string, ext?: string) => {
    if (ext) {
      return path.split('/').pop()?.replace(ext, '') || '';
    }
    return path.split('/').pop() || '';
  }
}));

// Mock calculateSHA256
jest.mock('../utils', () => ({
  calculateSHA256: jest.fn()
}));
