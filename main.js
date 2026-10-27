const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1280, height: 850, title: "РЕМАСТЕР — Улучшение музыки",
        backgroundColor: '#141110',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    win.setMenu(null);
    win.maximize();
    win.loadFile('index.html');

    // Проверка обновлений
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
            dialog.showErrorBox('Ошибка проверки', err.message);
        });
    }, 3000);
}

// ЛОГИКА ОБНОВЛЕНИЙ
autoUpdater.on('update-available', () => {
    dialog.showMessageBox({ type: 'info', title: 'Обновление', message: 'Найдена новая версия! Скачиваю в фоне...' });
});

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        type: 'question',
        buttons: ['Перезапустить сейчас', 'Позже'],
        title: 'Обновление готово',
        message: 'Новая версия загружена. Перезапустить?'
    }).then(result => {
        if (result.response === 0) autoUpdater.quitAndInstall();
    });
});

// ВЫВОД ОШИБОК НА ЭКРАН
autoUpdater.on('error', (err) => {
    dialog.showErrorBox('Ошибка автообновления', err == null ? "Неизвестная ошибка" : (err.stack || err).toString());
});

app.whenReady().then(() => {
    createWindow();

    ipcMain.on('get-version', (e) => { e.returnValue = app.getVersion(); });

    // ОБНОВЛЕННЫЙ ДИАЛОГ ОТКРЫТИЯ ФАЙЛОВ (ТЕПЕРЬ С ВИДЕО)
    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Медиа (Аудио и Видео)', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'mp4', 'webm', 'mkv'] },
                { name: 'Аудио', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] },
                { name: 'Видео', extensions: ['mp4', 'webm', 'mkv'] },
                { name: 'Все файлы', extensions: ['*'] }
            ]
        });
        if (canceled) return null;
        return filePaths;
    });

    // ОБНОВЛЕННЫЙ ДИАЛОГ СОХРАНЕНИЯ (АВТООПРЕДЕЛЕНИЕ MP3 ИЛИ WAV)
    ipcMain.handle('dialog:saveFile', async (event, { buffer, defaultName }) => {
        // Определяем расширение из имени файла, которое передал HTML (mp3 или wav)
        const ext = defaultName.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3';

        const { canceled, filePath } = await dialog.showSaveDialog({
            defaultPath: defaultName,
            filters: [{ name: ext.toUpperCase() + ' Audio', extensions: [ext] }]
        });

        if (!canceled && filePath) {
            try {
                fs.writeFileSync(filePath, Buffer.from(buffer));
                return true;
            } catch (err) {
                console.error("Ошибка сохранения:", err);
                return false;
            }
        }
        return false;
    });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });