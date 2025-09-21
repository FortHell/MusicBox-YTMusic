const { app, BrowserWindow } = require('electron');

// Discord RPC setup
const RPC = require('discord-rpc');
const clientId = '1369442515849183302';
RPC.register(clientId);
const rpc = new RPC.Client({ transport: 'ipc' });

//-----------------------

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

  // handle X close: pause music then exit
  win.on('close', (e) => {
    e.preventDefault();
    win.webContents.executeJavaScript(`
      const playBtn = [...document.querySelectorAll('button')].find(b => {
        const label = b.getAttribute('aria-label');
        return label === 'Play' || label === 'Pause';
      });
      if (playBtn && playBtn.getAttribute('aria-label') === 'Pause') {
        playBtn.click();
      }
    `).then(() => {
      setTimeout(() => win.destroy(), 150);
    });
  });

  // keyboard shortcuts: back button + logarithmic volume
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // back button
      if (input.code === 'BrowserBack' || input.code === 'Backspace') {
        win.webContents.executeJavaScript('window.history.back();');
      }
      // optional: add volume slider tweaks in renderer later
    }
  });
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  app.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  createWindow();

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      const slider = document.querySelector('tp-yt-paper-slider#volume-slider');
      const video = document.querySelector('video');
      if (slider && video) {
        // initialize volume to current slider value
        video.volume = Math.pow(slider.value / 100, 2);

        // listen for slider changes
        slider.addEventListener('value-change', (e) => {
          const linear = slider.value; // 0–100
          const gain = Math.pow(linear / 100, 2); // quadratic/logarithmic feel
          video.volume = gain;
        });
      }
    `);
  });

// Discord RPC
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

          // Find the play/pause button
          const buttons = [...document.querySelectorAll('button.style-scope.yt-icon-button')];
          const playPauseBtn = buttons.find(btn => {
            const label = btn.getAttribute('aria-label');
            return label === 'Play' || label === 'Pause';
          });
          const playState = playPauseBtn ? playPauseBtn.getAttribute('aria-label') : null;

          // calculate elapsed time
          let secondsElapsed = 0;
          if (timeInfo && timeInfo.includes('/')) {
            const current = timeInfo.split('/')[0].trim(); // e.g. "0:19"
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
        if (result.playState === 'Pause') {
          // music is playing
          rpc.setActivity({
            details: result.title,
            state: result.artist,
            startTimestamp: new Date(Date.now() - result.elapsed * 1000),
            largeImageKey: 'ytmusic',
            largeImageText: result.title,
            instance: false
          });
        } else {
          // music is paused
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

  }, 1000); // update every second
});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
