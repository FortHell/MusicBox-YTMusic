const { app, BrowserWindow } = require('electron')

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1650,
    height: 900,
    frame: true, // No window frame
    fullscreen: false, // Fullscreen mode
    webPreferences: {
      nodeIntegration: false,
      sandbox: false
    },
    icon: 'icon.ico'
  })

  win.loadURL('https://music.youtube.com')
  win.setMenu(null) // Disable menus
}

app.disableHardwareAcceleration()

app.whenReady().then(createWindow)

app.on('ready', () => {
    app.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  })  

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
