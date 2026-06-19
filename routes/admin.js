const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadDB, saveDB, getNextId } = require('../utils/db');

// Папка для загрузки видео
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Проверка админа
function checkAdmin(req, res, next) {
    const login = req.headers['x-admin-login'];
    const password = req.headers['x-admin-password'];

    console.log('🔑 Проверка админа:', login);

    if (!login || !password) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const db = loadDB();
    const admins = db.admins || [];

    const admin = admins.find(a => a.login === login && a.password === password);

    if (admin) {
        console.log('✅ Админ авторизован:', login);
        next();
    } else {
        console.log('❌ Неверный логин или пароль');
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
}

// Получить все задачи
router.get('/tasks', checkAdmin, (req, res) => {
    try {
        const db = loadDB();
        console.log('📋 Загружено задач:', db.tasks?.length || 0);
        res.json(db.tasks || []);
    } catch (err) {
        console.error('❌ Ошибка загрузки задач:', err);
        res.status(500).json({ error: 'Ошибка загрузки задач' });
    }
});

// Создать задачу
router.post('/task', checkAdmin, (req, res) => {
    try {
        console.log('📝 Тело запроса:', req.body);

        const { name, story, description, points, tour, correctAnswer } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                status: 'error',
                message: 'Название и описание обязательны!'
            });
        }

        const db = loadDB();

        const task = {
            id: getNextId(db.tasks),
            name: name.trim(),
            story: story || '',
            description: description.trim(),
            points: parseInt(points) || 10,
            tour: parseInt(tour) || 1,
            correctAnswer: correctAnswer || '',
            createdAt: new Date().toISOString()
        };

        db.tasks.push(task);
        saveDB(db);

        res.json({
            status: 'success',
            taskId: task.id,
            message: 'Задача создана!'
        });
    } catch (err) {
        console.error('❌ Ошибка создания:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// Удалить задачу
router.delete('/task/:taskId', checkAdmin, (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const db = loadDB();

        const taskIndex = db.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Задача не найдена'
            });
        }

        db.tasks.splice(taskIndex, 1);
        saveDB(db);

        res.json({
            status: 'success',
            message: 'Задача удалена!'
        });
    } catch (err) {
        console.error('❌ Ошибка удаления:', err);
        res.status(500).json({ error: 'Ошибка удаления задачи' });
    }
});

// ============================================================
// 🆕 НОВЫЙ ЭНДПОЙНТ ДЛЯ ЗАГРУЗКИ ВИДЕО
// ============================================================
router.post('/upload-video', checkAdmin, (req, res) => {
    try {
        const { videoType, videoData } = req.body;

        if (!videoType || !videoData) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан тип видео или данные'
            });
        }

        // Убираем префикс base64
        const base64Data = videoData.replace(/^data:video\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Определяем расширение
        let ext = '.mp4';
        if (videoData.includes('video/webm')) ext = '.webm';
        if (videoData.includes('video/ogg')) ext = '.ogg';

        // Имя файла
        const filename = `${videoType}_${Date.now()}${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Сохраняем файл
        fs.writeFileSync(filepath, buffer);
        console.log('💾 Видео сохранено:', filename);

        // Сохраняем путь в БД
        const db = loadDB();
        const videoUrl = `/uploads/${filename}`;

        if (videoType === 'prologue') {
            db.media.prologueVideo = videoUrl;
        } else if (videoType === 'epilogue') {
            db.media.epilogueVideo = videoUrl;
        }

        saveDB(db);

        res.json({
            status: 'success',
            message: 'Видео сохранено!',
            url: videoUrl
        });

    } catch (err) {
        console.error('❌ Ошибка сохранения видео:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// Обновить медиа (баннеры)
router.post('/media', checkAdmin, (req, res) => {
    try {
        const { mainBanner, squareBanner1, squareBanner2, prologueVideo, epilogueVideo } = req.body;

        const db = loadDB();
        db.media = {
            mainBanner: mainBanner || db.media?.mainBanner || '',
            squareBanner1: squareBanner1 || db.media?.squareBanner1 || '',
            squareBanner2: squareBanner2 || db.media?.squareBanner2 || '',
            prologueVideo: prologueVideo || db.media?.prologueVideo || '',
            epilogueVideo: epilogueVideo || db.media?.epilogueVideo || ''
        };

        saveDB(db);
        res.json({ status: 'success', message: 'Медиа сохранены!' });
    } catch (err) {
        console.error('❌ Ошибка сохранения медиа:', err);
        res.status(500).json({ error: 'Ошибка сохранения медиа' });
    }
});

// Получить медиа
router.get('/media', (req, res) => {
    try {
        const db = loadDB();
        res.json(db.media || {});
    } catch (err) {
        console.error('❌ Ошибка загрузки медиа:', err);
        res.status(500).json({ error: 'Ошибка загрузки медиа' });
    }
});

module.exports = router;