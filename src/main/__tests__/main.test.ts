import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('path');
jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
  },
  app: {
    getPath: jest.fn(),
  },
}));

import * as electron from 'electron';

describe('Main Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass a hello world test', () => {
    const message = 'Hello, World!';
    expect(message).toBe('Hello, World!');
  });

}); 