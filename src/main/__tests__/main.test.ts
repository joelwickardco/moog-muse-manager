jest.mock('fs');
jest.mock('path');

jest.mock("typeorm", () => ({ Repository: class {} }));
const handleMock = jest.fn();
const showOpenDialogMock = jest.fn();
const showSaveDialogMock = jest.fn();
const showMessageBoxMock = jest.fn();
const onMock = jest.fn();
const buildFromTemplateMock = jest.fn().mockReturnValue({});
const setApplicationMenuMock = jest.fn();
const BrowserWindowMock = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  webContents: { openDevTools: jest.fn(), send: jest.fn() }
}));

jest.mock('electron', () => ({
  BrowserWindow: BrowserWindowMock,
  Menu: { buildFromTemplate: buildFromTemplateMock, setApplicationMenu: setApplicationMenuMock },
  dialog: { showOpenDialog: showOpenDialogMock, showSaveDialog: showSaveDialogMock, showMessageBox: showMessageBoxMock },
  ipcMain: { handle: handleMock },
  app: { on: onMock, quit: jest.fn(), getPath: jest.fn() }
}));

jest.mock('../services/exportLibrary', () => ({
  exportLibrary: jest.fn()
}));

jest.mock('../services/importLibrary', () => ({
  importLibrary: jest.fn()
}));

import { ipcMain, dialog } from 'electron';
import { exportLibrary } from '../services/exportLibrary';
import { importLibrary } from '../services/importLibrary';

describe('Main Process', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('registers IPC handlers on import', async () => {
    await import('../main');
    const events = (ipcMain.handle as jest.Mock).mock.calls.map(call => call[0]);
    expect(events).toEqual(expect.arrayContaining([
      'export-library',
      'import-library',
      'update-patch',
      'load-libraries',
      'load-banks-by-library',
      'get-patches-for-bank',
      'delete-library'
    ]));
  });

  it('export-library handler uses selected directory', async () => {
    await import('../main');
    const handler = (ipcMain.handle as jest.Mock).mock.calls
      .find(call => call[0] === 'export-library')[1];
    (dialog.showOpenDialog as jest.Mock).mockResolvedValue({ filePaths: ['/tmp/exp'] });
    await handler({}, 5);
    expect(dialog.showOpenDialog).toHaveBeenCalled();
    const { AppDataSource } = await import('../data-source');
    expect(exportLibrary).toHaveBeenCalledWith(5, '/tmp/exp', AppDataSource);
  });

  it('export-library handler aborts when no directory selected', async () => {
    await import('../main');
    const handler = (ipcMain.handle as jest.Mock).mock.calls
      .find(call => call[0] === 'export-library')[1];
    (dialog.showOpenDialog as jest.Mock).mockResolvedValue({ filePaths: [] });
    await handler({}, 5);
    expect(exportLibrary).not.toHaveBeenCalled();
  });

  it('import-library handler uses selected directory', async () => {
    await import('../main');
    const handler = (ipcMain.handle as jest.Mock).mock.calls
      .find(call => call[0] === 'import-library')[1];
    (dialog.showOpenDialog as jest.Mock).mockResolvedValue({ filePaths: ['/tmp/lib'] });
    await handler();
    expect(dialog.showOpenDialog).toHaveBeenCalled();
    const { AppDataSource } = await import('../data-source');
    expect(importLibrary).toHaveBeenCalledWith('/tmp/lib', AppDataSource);
  });
});
