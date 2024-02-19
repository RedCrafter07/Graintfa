// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer, contextBridge } = require('electron');

const api = {
  getTheme() {
    return ipcRenderer.invoke('getTheme');
  },
  defaultSettings() {
    return ipcRenderer.invoke('defaultSettings');
  },
  setSettings(settings) {
    return ipcRenderer.invoke('setSettings', settings);
  },
  getSettings() {
    return ipcRenderer.invoke('getSettings');
  },
  clearRecent() {
    return ipcRenderer.invoke('clearRecent');
  },
  getRecent() {
    return ipcRenderer.invoke('getRecent');
  },
  setEditorRpc() {
    return ipcRenderer.invoke('setEditorRpc');
  },
  getImage(path) {
    return ipcRenderer.invoke('getImage', path);
  },
  openItemTexture() {
    return ipcRenderer.invoke('openItemTexture');
  },
  open(file) {
    return ipcRenderer.invoke('open', file);
  },
  save(f) {
    return ipcRenderer.invoke('save', f);
  },
  minmize() {
    return ipcRenderer.invoke('minimize');
  },
  maximize() {
    return ipcRenderer.invoke('maximize');
  },
  close() {
    return ipcRenderer.invoke('close');
  },
  getResourcePath() {
    return ipcRenderer.invoke('getResourcePath');
  },
};

contextBridge.exposeInMainWorld('__api', api);
