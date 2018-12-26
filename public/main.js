const {app, BrowserWindow, Menu, dialog, ipcMain} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const appStore = new Store();

const slateToFountain = require('../src/slateToFountain');

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({width: 900, height: 680, show: false});

  mainWindow.once('ready-to-show', () => {
    mainWindow.newFile();
    mainWindow.show();
  })

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);

  app.setAboutPanelOptions({
    applicationName: "Script",
    applicationVersion: "0.0.1",
  })

  ipcMain.on('contentChanged', () => {
    let current = appStore.get('currentDocument');
    if (current.saved) {
      appStore.set('currentDocument.saved', false);
      mainWindow.setTitle(current.title + " (Unsaved)");
    }
  });

  const updateMeta = (filePath) => {
    let title = filePath.split("/").pop();
    appStore.set('currentDocument', { title: title, path: filePath, saved: true } );
    mainWindow.setTitle(title);
  }

  mainWindow.on('closed', () => mainWindow = null);

  mainWindow.openFile = () => {
    dialog.showOpenDialog((filePaths) => {
      if(filePaths === undefined) return console.log("No file selected");
      let filePath = filePaths[0];
      fs.readFile(filePath, 'utf-8', (err, data) => {
          if (err) return alert("An error ocurred reading the file :" + err.message);
          updateMeta(filePath);
          mainWindow.webContents.send('fileOpened', data);
      });
    });
  }

  mainWindow.saveFile = (filePath, onComplete) => {
    ipcMain.once('saveFileContents', (event, data) => {
      if (filePath === undefined) return;
      fs.writeFile(filePath, data, (err) => {
        if (err) alert("An error ocurred creating the file " + err.message);
      });
      updateMeta(filePath);
      if (onComplete) onComplete();
    })
    mainWindow.webContents.send('contentsPlease');
  }

  mainWindow.saveFileAs = onComplete => {
    ipcMain.once('saveFileContents', (event, data) => {
      dialog.showSaveDialog(filePath => {
        if (filePath === undefined) return;
        fs.writeFile(filePath, data, (err) => {
          if (err) alert("An error ocurred creating the file " + err.message);
        });
        updateMeta(filePath);
        if (onComplete) onComplete();
      });
    })
    mainWindow.webContents.send('contentsPlease');
  }

  mainWindow.exportFileAs = () => {
    ipcMain.once('saveFileContents', (event, data) => {
      dialog.showSaveDialog(filePath => {
        if (filePath === undefined) return;
        const txt = slateToFountain(JSON.parse(data));
        fs.writeFile(filePath, txt, (err) => {
          if (err) alert("An error ocurred creating the file " + err.message);
        });
      });
    })
    mainWindow.webContents.send('contentsPlease');
  }

  mainWindow.saveIf = onComplete => {
    let docState = appStore.get("currentDocument");
    if (docState.path) {
      mainWindow.saveFile(docState.path, onComplete);
    } else {
      mainWindow.saveFileAs(onComplete);
    }
  }

  mainWindow.newFile = () => {
    let title = 'Untitled script';
    appStore.set('currentDocument', { title, saved: true });
    mainWindow.setTitle(title);
    mainWindow.webContents.send('fileOpened')
  }

  mainWindow.handleUnsavedChanges = onComplete => {
    if (appStore.get('currentDocument').saved) {
      onComplete();
    } else {
      mainWindow.continueIf(onComplete);
    }
  }

  mainWindow.continueIf = onComplete => {
    const docState = appStore.get('currentDocument');
    const options = {
      type: "warning",
      message: "You have unsaved changes. Save changes first?",
      cancelId: 0,
      buttons: [
        "Cancel",
        (docState.path) ? "Save" : "Save As...",
        "Discard and continue"
      ]
    }
    dialog.showMessageBox(mainWindow, options, btnIdx => {
      if (btnIdx === 0) return false;
      if (btnIdx === 1) mainWindow.saveIf(onComplete);
      if (btnIdx === 2) onComplete();
    });
  }

  var menu = Menu.buildFromTemplate([
    {
      label: 'Boulevard',
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click() { mainWindow.handleUnsavedChanges(mainWindow.newFile); },
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click() { mainWindow.handleUnsavedChanges(mainWindow.openFile); },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click() { mainWindow.saveIf(); }
        },
        {
          label: 'Save As...',
          click() { mainWindow.saveFileAs(); }
        },
        {
          label: 'Export to Fountain...',
          click() { mainWindow.exportFileAs(); }
        },
        {
          type: 'separator'
        },
        {
          label: 'Show dev tools',
          click() { mainWindow.webContents.openDevTools(); }
        },
        {
          label: 'Hide dev tools',
          click() { mainWindow.webContents.closeDevTools(); }
        },
        {
          label: 'Reload',
          click() { mainWindow.reload() }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click() {
            mainWindow.handleUnsavedChanges(app.quit);
          }
        }
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]
    }
  ])

  Menu.setApplicationMenu(menu);

}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
    mainWindow.newFile();
  }
});