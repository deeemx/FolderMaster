const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico'),

    title: 'FolderMap',

    
    frame: true,

    
    backgroundColor: '#1e1e1e',

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },

    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');


  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}



app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder',
          accelerator: 'Ctrl+O',
          click: async () => {
            if (!mainWindow) return;
            mainWindow.webContents.send('menu-open-folder');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About FolderMap',
              message: 'FolderMap',
              detail: 'Version 1.0.0\nA tool to visualize folder structures.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}



ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a folder',
    properties: ['openDirectory']
  });

  if (result.canceled) return null;

  return buildTree(result.filePaths[0]);
});



async function buildTree(dir) {
  const name = path.basename(dir);
  const stats = await fs.stat(dir);

  if (!stats.isDirectory()) {
    return {
      name,
      path: dir,
      isFolder: false,
      size: stats.size
    };
  }

  const children = {};

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      try {
        children[item] = await buildTree(fullPath);
      } catch {
        // to skip disallowed directories
      }
    }
  } catch {
    // to skip unreadable directories
  }

  return {
    name,
    path: dir,
    isFolder: true,
    children
  };
}
