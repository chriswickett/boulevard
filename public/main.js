const {app, BrowserWindow, Menu, dialog, ipcMain} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const windowManager = require('electron-window-manager');
const slateToFountain = require('../src/slateToFountain');

windowManager.customFunctions = {
  updateMeta(filePath, target) {
    target = (target) ? target.object : windowManager.getCurrent().object;
    let title = filePath.split("/").pop();
    target.documentStore = {
      title: title,
      path: filePath,
      saved: true
    };
    target.setTitle(title);
  },
  openFile() {
    dialog.showOpenDialog((filePaths) => {
      if(filePaths === undefined) return console.log("No file selected");
      let filePath = filePaths[0];
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return alert("An error ocurred reading the file :" + err.message);
        const url = (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
        var win = windowManager.open(false, false, url, 'standard');
        win.onReady(true, (window) => {
          window.focus();
          window.object.documentStore = {};
          windowManager.customFunctions.updateMeta(filePath, window);
          window.object.webContents.send('fileOpened', data);
        });
      });
    });
  },
  saveFile(filePath, onComplete) {
    ipcMain.once('saveFileContents', (event, data) => {
      if (filePath === undefined) return;
      fs.writeFile(filePath, data, (err) => {
        if (err) alert("An error ocurred creating the file " + err.message);
      });
      windowManager.customFunctions.updateMeta(filePath);
      if (onComplete) onComplete();
    })
    windowManager.getCurrent().object.send('contentsPlease');
  },
  saveFileAs(onComplete) {
    ipcMain.once('saveFileContents', (event, data) => {
      dialog.showSaveDialog(filePath => {
        if (filePath === undefined) return;
        fs.writeFile(filePath, data, (err) => {
          if (err) alert("An error ocurred creating the file " + err.message);
        });
        windowManager.customFunctions.updateMeta(filePath);
        if (onComplete) onComplete();
      });
    })
    windowManager.getCurrent().object.send('contentsPlease');
  },
  exportFileAs() {
    ipcMain.once('saveFileContents', (event, data) => {
      dialog.showSaveDialog(filePath => {
        if (filePath === undefined) return;
        const txt = slateToFountain(JSON.parse(data));
        fs.writeFile(filePath, txt, (err) => {
          if (err) alert("An error ocurred creating the file " + err.message);
        });
      });
    })
    windowManager.getCurrent().object.send('contentsPlease');
  },
  saveIf(onComplete) {
    let docStore = windowManager.getCurrent().object.documentStore;
    if (docStore.path) {
      windowManager.customFunctions.saveFile(docStore.path, onComplete);
    } else {
      windowManager.customFunctions.saveFileAs(onComplete);
    }
  },
  newFile() {
    let title = 'Untitled script';
    let win = windowManager.getCurrent().object;
    win.documentStore = { title, saved: true };
    win.setTitle(title);
    win.send('fileOpened')
  },
  handleUnsavedChanges(onComplete) {
    let win = windowManager.getCurrent().object;
    if (win.documentStore.documentStore.saved) {
      onComplete();
    } else {
      windowManager.customFunctions.continueIf(onComplete);
    }
  },

  continueIf(onComplete) {
    const docStore = windowManager.getCurrent().object.documentStore;
    const options = {
      type: "warning",
      message: "You have unsaved changes. Save changes first?",
      cancelId: 0,
      buttons: [
        "Cancel",
        (docStore.path) ? "Save" : "Save As...",
        "Discard and continue"
      ]
    }
    dialog.showMessageBox(windowManager.getCurrent().object, options, btnIdx => {
      if (btnIdx === 0) return false;
      if (btnIdx === 1) windowManager.customFunctions.saveIf(onComplete);
      if (btnIdx === 2) onComplete();
    });
  },
  newWindow() {
    const url = (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
    var win = windowManager.open(false, false, url, 'standard');
    win.onReady(true, (window) => {
      window.focus();
      window.object.documentStore = {};
      windowManager.customFunctions.newFile();
    });
  }
}

windowManager.templates.set('standard', {
  'width': 900,
  'height': 680,
  'resizable': true,
  'onLoadFailure': function() {},
});

const menu = Menu.buildFromTemplate([
  {
    label: 'Boulevard',
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click() { windowManager.customFunctions.newWindow(); },
      },
      {
        label: 'Open...',
        accelerator: 'CmdOrCtrl+O',
        click() { windowManager.customFunctions.openFile(); },
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click() { windowManager.customFunctions.saveIf(); }
      },
      {
        label: 'Save As...',
        click() { windowManager.customFunctions.saveFileAs(); }
      },
      {
        label: 'Export to Fountain...',
        click() { windowManager.customFunctions.exportFileAs(); }
      },
      {
        type: 'separator'
      },
      {
        label: 'Show dev tools',
        click() { windowManager.getCurrent().object.openDevTools(); }
      },
      {
        label: 'Hide dev tools',
        click() { windowManager.getCurrent().object.closeDevTools(); }
      },
      {
        label: 'Reload',
        click() { windowManager.getCurrent().object.reload() }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
          windowManager.customFunctions.handleUnsavedChanges(app.quit);
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
]);

Menu.setApplicationMenu(menu)

ipcMain.on('contentChanged', () => {
  let docStore = windowManager.getCurrent().object.documentStore;
  if (docStore.saved) {
    windowManager.getCurrent().object.documentStore.saved = false;
    windowManager.getCurrent().object.setTitle(docStore.title + " (Unsaved)");
  }
});

app.on('ready', windowManager.customFunctions.newWindow);

app.on('window-all-closed', () => {
  app.quit();
  // if (process.platform !== 'darwin') app.quit(); }
});

app.on('activate', () => {
    app.setAboutPanelOptions({
      applicationName: "Boulevard",
      applicationVersion: "0.0.1",
    })
});