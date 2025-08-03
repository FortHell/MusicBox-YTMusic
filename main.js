const { app, BrowserWindow } = require('electron');

// Discord RPC setup stuff
const RPC = require('discord-rpc');

const clientId = '1369442515849183302';
RPC.register(clientId);
const rpc = new RPC.Client({ transport: 'ipc' });

//end of that

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1650,
    height: 900,
    frame: true,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      sandbox: false,
    },
    icon: 'icon.ico'
  });

  win.loadURL('https://music.youtube.com');
  win.setMenu(null);
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  app.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  createWindow();

  // Discord RPC yet again

  rpc.login({ clientId }).catch(console.error);

  rpc.on('ready', () => {
    console.log("Discord RPC connected!");

    setInterval(async () => {
      if (!win) return;

      try {
        const result = await win.webContents.executeJavaScript(`
          (() => {
            const titleEl = document.querySelector('.title.style-scope.ytmusic-player-bar');
            const bylineEl = document.querySelector('.byline.style-scope.ytmusic-player-bar');
            const artistEl = bylineEl?.querySelector('.style-scope.yt-formatted-string');
            const imageEl = document.querySelector('.image.style-scope.yt-img-shadow');
            const timeInfo = document.querySelector('.time-info.style-scope.ytmusic-player-bar')?.textContent.trim();

            // Find the play/pause button by class and aria-label
            const buttons = [...document.querySelectorAll('button.style-scope.yt-icon-button')];
            const playPauseBtn = buttons.find(btn => {
              const label = btn.getAttribute('aria-label');
              return label === 'Play' || label === 'Pause';
            });
            const playState = playPauseBtn ? playPauseBtn.getAttribute('aria-label') : null;

            let secondsElapsed = 0;

            if (timeInfo && timeInfo.includes('/')) {
              const current = timeInfo.split('/')[0].trim(); // "0:19"
              const parts = current.split(':').map(Number);
              if (parts.length === 2) {
                secondsElapsed = parts[0] * 60 + parts[1];
              } else if (parts.length === 3) {
                secondsElapsed = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }
            }

            return {
              title: titleEl?.textContent?.trim() || null,
              artist: artistEl?.textContent?.trim() || null,
              imageUrl: imageEl?.src || null,
              elapsed: secondsElapsed,
              playState: playState // "Play" or "Pause" or null
            };
          })();
        `);

        if (result?.title && result?.artist) {
          // If playing, set presence; if paused, clear or adjust accordingly
          if (result.playState === 'Pause') {
            rpc.setActivity({
              details: result.title,
              state: result.artist,
              startTimestamp: new Date(Date.now() - result.elapsed * 1000),
              largeImageKey: 'ytmusic',
              largeImageText: result.title,
              instance: false
            });
          } else {
            rpc.clearActivity();
            rpc.setActivity({
              details: result.title + ' (Paused)',
              state: result.artist,
              largeImageKey: 'ytmusic',
              largeImageText: result.title + ' (Paused)',
              instance: false
            });
          }
        } else {
          rpc.clearActivity();
        }

      } catch (err) {
        console.error("Failed to get song info:", err);
      }


    }, 1 * 1000);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
