const {app, BrowserWindow, Menu, dialog, ipcMain} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

// const { dialog } = require('electron').remote;

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({width: 900, height: 680});

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);

  app.setAboutPanelOptions({
    applicationName: "Script",
    applicationVersion: "0.0.1",
  })

  mainWindow.on('closed', () => mainWindow = null);

  var menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New' },
        {
          label: 'Open...',
          click() {
            dialog.showOpenDialog((fileNames) => {
              // fileNames is an array that contains all the selected
              if(fileNames === undefined){
                console.log("No file selected");
                return;
              }

              fs.readFile(fileNames[0], 'utf-8', (err, data) => {
                  if(err){
                    alert("An error ocurred reading the file :" + err.message);
                    return;
                  }
                  mainWindow.webContents.send('fileOpened', data);
              });
            });
          }
        },
        {
          label: 'Save...',
          click() {

            ipcMain.once('saveFileContents', (event, data) => {
              dialog.showSaveDialog((fileName) => {
                if (fileName === undefined) return;
                fs.writeFile(fileName, data, (err) => {
                  if (err) alert("An error ocurred creating the file " + err.message);
                });
              });
            })
            mainWindow.webContents.send('contentsPlease');
          }
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
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu); 

}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});