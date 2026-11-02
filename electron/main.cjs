"use strict";

const { app, BrowserWindow, Menu, dialog, protocol, session, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const ROOT = path.join(__dirname, "..", "out");
const SCHEME = "aurum";
const APP_ORIGIN = `${SCHEME}://app`;
const SMOKE = process.env.AURUM_SMOKE === "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

// A privileged custom scheme keeps a stable origin (aurum://app) so the
// localStorage database survives restarts — file:// would also work, but
// next/image and the router expect absolute paths.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function resolveAsset(urlPath) {
  let pathname = decodeURIComponent(urlPath);
  if (!pathname || pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.join(ROOT, pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return null;
  return filePath;
}

async function serveFile(request) {
  const url = new URL(request.url);
  const candidates = [];
  let filePath = resolveAsset(url.pathname);
  if (!filePath) return new Response("Not found", { status: 404 });

  candidates.push(filePath);
  if (!path.extname(filePath)) {
    candidates.push(`${filePath}.html`, path.join(filePath, "index.html"));
  }

  for (const candidate of candidates) {
    try {
      const data = await fs.readFile(candidate);
      const type = MIME[path.extname(candidate).toLowerCase()] || "application/octet-stream";
      return new Response(data, {
        status: 200,
        headers: { "content-type": type, "cache-control": "no-cache" },
      });
    } catch {
      // try the next candidate
    }
  }

  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 400,
    minHeight: 640,
    backgroundColor: "#0A0A0B",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    title: "Aurum",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());

  // Everything stays inside the app; real links open in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`) && url !== APP_ORIGIN) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${APP_ORIGIN}/`);

  if (SMOKE) {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    win.webContents.once("did-finish-load", async () => {
      try {
        const report = await win.webContents.executeJavaScript(`(() => ({
          title: document.title,
          url: location.href,
          text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 120),
          links: document.querySelectorAll('a').length,
          buttons: document.querySelectorAll('button').length,
          storage: (() => { try { localStorage.setItem('aurum-smoke', '1'); const v = localStorage.getItem('aurum-smoke'); localStorage.removeItem('aurum-smoke'); return v === '1' ? 'ok' : 'broken'; } catch (e) { return 'error: ' + e.message; } })(),
        }))()`);
        console.log("SMOKE_MAIN " + JSON.stringify(report));

        await win.loadURL(`${APP_ORIGIN}/settings/`);
        await wait(1200);
        const settings = await win.webContents.executeJavaScript(`(async () => {
          const byText = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
          const exportButton = byText('Скачать') || byText('Поделиться');
          const label = exportButton ? exportButton.textContent.trim() : null;
          if (exportButton) exportButton.click();
          await new Promise((r) => setTimeout(r, 900));
          return {
            url: location.href,
            exportButton: label,
            hasPaste: Boolean(byText('Вставить')),
            hasFilePicker: Boolean(byText('Выбрать файл')),
            toast: document.body.innerText.includes('Резервная копия'),
          };
        })()`);
        console.log("SMOKE_SETTINGS " + JSON.stringify(settings));

        const nav = await win.webContents.executeJavaScript(`(async () => {
          const link = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Журнал');
          if (link) link.click();
          await new Promise((r) => setTimeout(r, 1500));
          return {
            path: location.pathname,
            rendered: document.body.innerText.includes('Журнал'),
            rows: document.querySelectorAll('a[href^="/log/"]').length,
          };
        })()`);
        console.log("SMOKE_NAV " + JSON.stringify(nav));
      } catch (error) {
        console.log("SMOKE_ERROR " + error.message);
      }
      if (process.env.AURUM_SMOKE_KEEP !== "1") app.quit();
    });
  }

  return win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("ru.aurum.tracker");
    Menu.setApplicationMenu(null);

    protocol.handle(SCHEME, serveFile);

    // Native "save as" dialog for the JSON backup button.
    session.defaultSession.on("will-download", (event, item) => {
      if (SMOKE) {
        console.log("SMOKE_DOWNLOAD " + item.getFilename());
        item.cancel();
        return;
      }
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      item.pause();
      dialog
        .showSaveDialog(win, {
          title: "Сохранить резервную копию",
          defaultPath: path.join(app.getPath("documents"), item.getFilename()),
          filters: [{ name: "JSON", extensions: ["json"] }],
        })
        .then(({ canceled, filePath }) => {
          if (canceled || !filePath) {
            item.cancel();
            return;
          }
          item.setSavePath(filePath);
          item.resume();
        })
        .catch(() => item.cancel());
    });

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
