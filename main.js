const { app, BrowserWindow, ipcMain, webContents, dialog } = require('electron');
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');
updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'emin100/guacamole-client'
  },
  updateInterval: '5 minute',
  logger: require('electron-log')
});
const path = require('path');
const https = require('https');
const axios = require('axios');

let webviews = [];



app.enableRemoteModule = true;

const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  const { default: Store } = await import('electron-store');
  store = new Store();
})();


let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      enableRemoteModule: true
    },
  });

  mainWindow.loadFile('index.html');

}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('guacamole-login', async (_, credentials) => {
  try {
    const response = await axios.post(
      `${credentials.url}/api/tokens`,
      `username=${credentials.username}&password=${credentials.password}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        httpsAgent: agent,
      }
    );
    return response.data.authToken;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Authentication failed');
  }
});

ipcMain.handle('get-connection-groups', async (_, tokens) => {
  try {
    const response = await axios.get(
      `${tokens.url}/api/session/data/${tokens.type}/connectionGroups/ROOT/tree`,
      {
        headers: { 'Guacamole-Token': tokens.token },
        timeout: 10000,
        httpsAgent: agent,
      }
    );
    return Object.values(response.data);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch connections');
  }
});

ipcMain.handle('store-get', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', async (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('popup', async (event, data) => {

  dialog.showMessageBox({
    type: data.type,
    title: data.title,
    message: data.message,
    buttons: ['OK']
  });
});

ipcMain.handle('store-delete', async (event, key) => {
  store.delete(key);
});
ipcMain.handle('key-event', async (event, data) => {
  webContents.getAllWebContents().forEach(wc => {
    if (wc.getType() === 'webview') {
      if (data.metaKey && data.key.toLowerCase() === "v") {
        wc.executeJavaScript(`
          
        `).then((position) => {
          console.log('Webview Position:', position);
        });
        wc.sendInputEvent({
          type: 'mouseDown',
          button: 'left',
          x: 200,
          y: 200
        });
      } else {
        wc.executeJavaScript(`
                    document.dispatchEvent(new KeyboardEvent('${data.type}', {
                        key: '${data.key}',
                        code: '${data.code}',
                        keyCode: ${data.keyCode},
                        which: ${data.which},
                        ctrlKey: ${data.ctrlKey},
                        shiftKey: ${data.shiftKey},
                        altKey: ${data.altKey},
                        metaKey: ${data.metaKey}
                    }));
                `);
      }
    }

  });
});
