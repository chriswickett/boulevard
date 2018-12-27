const {app, BrowserWindow, Menu, dialog, ipcMain} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const windowManager = require('electron-window-manager');
// const slateToFountain = require('../src/slateToFountain');

const saveDialogOptions = { filters: [{ name: 'Boulevard file', extensions: ['blvd'] }] };
const openDialogOptions = { filters: [{ name: 'Boulevard file', extensions: ['blvd'] }] };
const exportDialogOptions = { filters: [{ name: 'Plain text file', extensions: ['txt'] }] };

const removeKey = (obj, key) => {
  for(prop in obj) {
    if (prop === key)
      delete obj[prop];
    else if (typeof obj[prop] === 'object')
      removeKey(obj[prop], key);
  }
}

const markWrapper = {
  bold(text)      { return `**${text}**` },
  italic(text)    { return `*${text}*`},
  underline(text) { return `_${text}_`}
}

const buildObject = (obj) => {

  removeKey(obj, "data");
  removeKey(obj, "object");

  let _obj = [];
  obj.document.nodes.forEach(node => {
    let leaves = node.nodes[0].leaves;
    leaves = leaves.map(leaf => {
      let markTypes = leaf.marks.map(mark => mark.type);
      if (markTypes.length > 0) {
        return markTypes.reduce((text, markType) => {
          if (leaf.text.length === 0) return "";
          return markWrapper[markType](text);
        }, leaf.text);
      } else {
        return leaf.text;
      }
    });

    let _node = {
      type: node.type,
      text: leaves.join('')
    };

    _obj.push(_node);
  });
  return _obj;
}

const buildFountain = obj => {
  let txt = "";
  obj.forEach(element => {
    switch (element.type) {
      case "sceneHeader":
        return txt += `${element.text.toUpperCase()}\n`;
      case "action":
        return txt += `${element.text}\n`;
      case "dialogue":
        return txt += `${element.text}\n`;
      case "character":
        return txt += `${element.text.toUpperCase()}\n`;
      case "parenthetical":
        return txt += `${element.text}\n`;
      case "transition":
        return txt += `${element.text.toUpperCase()}\n`;
      default: return true;
    }
  });
  return txt;
};

const slateToFountain = input => {
  return buildFountain(buildObject(input));
}


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
    dialog.showOpenDialog(openDialogOptions, filePaths => {
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
      dialog.showSaveDialog(saveDialogOptions, filePath => {
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
      dialog.showSaveDialog(exportDialogOptions, filePath => {
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
  handleUnsavedChanges(onComplete) {
    let win = windowManager.getCurrent().object;
    if (win && !win.documentStore.saved) {
      windowManager.customFunctions.continueIf(onComplete);
    } else {
      onComplete();
    }
  },

  continueIf(onComplete) {
    const docStore = windowManager.getCurrent().object.documentStore;
    const options = {
      type: "warning",
      message: "You have unsaved changes. Save changes first?",
      cancelId: 2,
      buttons: [
        "Discard and continue"
        (docStore.path) ? "Save" : "Save As...",
        "Cancel",
      ]
    }
    dialog.showMessageBox(windowManager.getCurrent().object, options, btnIdx => {
      if (btnIdx === 0) onComplete();
      if (btnIdx === 1) windowManager.customFunctions.saveIf(onComplete);
      if (btnIdx === 2) return false;
    });
  },
  newWindow() {
    const url = (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
    var win = windowManager.open(false, false, url, 'standard');
    win.onReady(true, (window) => {
      window.focus();
      window.object.documentStore = {};
      let title = 'Untitled script';
      window.object.documentStore = { title, saved: true };
      window.object.setTitle(title);
      window.object.send('fileOpened');
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
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        click() {
          windowManager.customFunctions.handleUnsavedChanges(() => {
            windowManager.closeCurrent();
          })
        }
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
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    app.setAboutPanelOptions({
      applicationName: "Boulevard",
      applicationVersion: "0.0.1",
    })
});