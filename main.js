const {app, BrowserWindow, ipcMain, webContents, dialog, autoUpdater } = require('electron');
const {updateElectronApp, UpdateSourceType} = require('update-electron-app');


const path = require('path');
const https = require('https');
const axios = require('axios');

const nativeimage = require('electron').nativeImage;
const iconf = nativeimage.createFromPath(path.join(__dirname, 'ext/img/guacamole_client_icon_512x512.png'));

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'emin100/guacamole-client'
  },
  updateInterval: '5 minute',
  logger: require('electron-log'),
  notifyUser: true,
  onNotifyUser: function (e) {
    console.log(e);
  }
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    icon: iconf,
    defaultId: 1,
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail:
      'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  });
});

autoUpdater.on('error', (message) => {
  const dialogOpts = {
    type: 'info',
    title: 'Application Update',
    icon: iconf,
    message: 'Please install the new version.',
    defaultId: 2,
    detail:
      'To install a newer version of client, please execute the command in command line. \n\n\n curl -s https://raw.githubusercontent.com/emin100/guacamole-client/refs/heads/main/tools/install.sh | sudo bash'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) console.log("Download window closed")
  });
})

app.dock.setIcon(iconf);

let webviews = [];

// app.enableRemoteModule = true;

const agent = new https.Agent({rejectUnauthorized: false});

(async () => {
  const {default: Store} = await import('electron-store');
  store = new Store();
})();


let mainWindow;
let tray;


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
    }
  });

  mainWindow.loadFile('index.html');

}


app.whenReady().then(() => {

  app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: app.getVersion(),
    copyright: "© 2025 MEK",
    credits: "Developed by Mehmet Emin Karakaş",
    iconPath: 'ext/img/guacamole_client_icon_512x512.png'
  });




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
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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
        headers: {'Guacamole-Token': tokens.token},
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
