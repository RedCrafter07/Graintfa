/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import fs from 'fs';

import { resolveHtmlPath } from './util';
import { setFilePath, setState, setUnknown } from './lib/rpc';
import { Field, File } from '../renderer/api';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const db = new JsonDB(new Config('userData', true, false, '/'));

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('close', () => app.quit());
ipcMain.handle('minimize', () => mainWindow.minimize());
ipcMain.handle('maximize', () =>
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
);
ipcMain.handle('save', async (ev, file: File) => {
  const { fields, fieldIndex: fi, filePath: fn } = file;
  const fieldIndex: number = parseInt(Array.isArray(fi) ? fi[0] : fi);
  let filePath: string = Array.isArray(fn) ? fn[0] : fn;

  if (!filePath || filePath == undefined || filePath == 'undefined') {
    filePath = dialog.showSaveDialogSync(mainWindow, {
      buttonLabel: 'Save',
      title: 'Save GUI',
      filters: [
        {
          extensions: ['rgraintf'],
          name: 'Graintfa file',
        },
      ],
      properties: ['showOverwriteConfirmation'],
    });
  }
  if (!filePath) return;

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      fieldIndex: fieldIndex,
      fields: fields,
    })
  );

  await addRecent(filePath);

  setFilePath(filePath);

  return filePath;
});
ipcMain.handle('open', async (ev, file?: string | string[] | undefined) => {
  let filePath: string[] = Array.isArray(file)
    ? file
    : file === undefined
    ? []
    : [file];
  if (
    !filePath ||
    filePath.includes('undefined') ||
    filePath.includes(undefined) ||
    filePath.length < 1
  )
    filePath = dialog.showOpenDialogSync(mainWindow, {
      buttonLabel: 'Open',
      title: 'Open a GUI',
      filters: [
        {
          extensions: ['rgraintf'],
          name: 'Graintfa file',
        },
      ],
      properties: ['openFile'],
    });

  if (!filePath?.[0]) return;
  const content = fs.readFileSync(filePath[0], { encoding: 'utf8' });

  const parsedContent: {
    fieldIndex: number;
    fields: Field[];
  } = JSON.parse(content);

  await addRecent(filePath[0]);

  setFilePath(filePath[0]);

  return {
    ...parsedContent,
    filePath: filePath[0],
  };
});
ipcMain.handle('openItemTexture', async () => {
  const filePath = await dialog.showOpenDialogSync(mainWindow, {
    buttonLabel: 'Load',
    title: 'Item texture',
    filters: [
      {
        extensions: ['png'],
        name: 'Minecraft texture file',
      },
    ],
    properties: ['openFile'],
  });

  return filePath?.[0];
});
ipcMain.handle('getImage', async (ev, path) => {
  const img = fs.readFileSync(path).toString('base64');
  return img;
});
ipcMain.handle('setEditorRpc', () => setUnknown());
ipcMain.handle('getRecent', async () => {
  let recent: string[] = [];
  try {
    recent = await db.getData('/recent');
  } catch (err) {
    recent = [];
    await db.push('/recent', []);
  }
  setState('In the main menu');
  return recent;
});
ipcMain.handle('clearRecent', () => db.push('/recent', []));
ipcMain.handle('getSettings', async () => {
  defaultSettings.forEach(async (s) => {
    if (!db.exists(s.path)) await db.push(s.path, s.value);
  });
  const d = await db.getData('/settings');

  return d;
});
ipcMain.handle('setSettings', async (ev, settings) =>
  db.push('/settings', settings)
);
ipcMain.handle('defaultSettings', () => db.push('/settings', {}));
ipcMain.handle('getTheme', async () => {
  if (!db.exists('/settings/theme')) await db.push('/settings/theme', 'dark');
  const theme = await db.getData('/settings/theme');

  return theme;
});
ipcMain.handle('getResourcePath', () => RESOURCES_PATH);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon_big.png'),
    frame: false,
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.setIcon(getAssetPath('icon_big.png'));
  mainWindow.setMenu(null);

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.maximize();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

const defaultSettings: { path: string; value: number | string | boolean }[] = [
  {
    path: '/settings/theme',
    value: 'dark',
  },
  {
    path: '/settings/keepNavOpen',
    value: true,
  },
  {
    path: '/settings/centerNav',
    value: false,
  },
];

async function addRecent(filePath: string) {
  let recent: string[] = [];
  try {
    recent = await db.getData('/recent');
  } catch (err) {
    recent = [];
    await db.push('/recent', []);
  }

  if (recent.includes(filePath)) {
    recent.splice(recent.indexOf(filePath[0]), 1);
  }

  recent.push(filePath);

  await db.push('/recent', recent);
}
