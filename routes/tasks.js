const express = require('express');
const router = express.Router();
const { loadDB, saveDB } = require('../utils/db');

// Получить все задачи
router.get('/', (req, res) => {
    try {
        const db = loadDB();
        const teamId = req.query.teamId;

        let tasks = db.tasks || [];

        if (teamId) {
            const team = db.teams.find(t => t.id == teamId);
            if (team) {
                tasks = tasks.map(task => ({
                    ...task,
                    isSolved: team.solvedTasks.includes(task.id)
                }));
            }
        }

        res.json(tasks);
    } catch (err) {
        console.error('❌ Ошибка загрузки задач:', err);
        res.status(500).json({ error: 'Ошибка загрузки задач' });
    }
});

// Получить задачу по ID
router.get('/:taskId', (req, res) => {
    try {
        const db = loadDB();
        const task = db.tasks.find(t => t.id == req.params.taskId);

        if (!task) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        res.json(task);
    } catch (err) {
        console.error('❌ Ошибка загрузки задачи:', err);
        res.status(500).json({ error: 'Ошибка загрузки задачи' });
    }
});

// ============================================================
// ОТПРАВКА РЕШЕНИЯ - ПРОВЕРКА ЕСТЬ, НО УЧАСТНИК НЕ ВИДИТ
// ============================================================
router.post('/submit', (req, res) => {
    try {
        const { teamId, taskId, answer } = req.body;

        if (!teamId || !taskId) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указаны teamId или taskId'
            });
        }

        const db = loadDB();

        const team = db.teams.find(t => t.id == teamId);
        if (!team) {
            return res.status(404).json({
                status: 'error',
                message: 'Команда не найдена'
            });
        }

        const task = db.tasks.find(t => t.id == taskId);
        if (!task) {
            return res.status(404).json({
                status: 'error',
                message: 'Задача не найдена'
            });
        }

        // Проверяем, не решена ли уже
        if (team.solvedTasks.includes(task.id)) {
            return res.json({
                status: 'already_solved',
                message: 'Задание уже выполнено ✅'
            });
        }

        // ============================================================
        // ПРОВЕРКА ОТВЕТА (ЕСТЬ, НО УЧАСТНИК НЕ ВИДИТ РЕЗУЛЬТАТ)
        // ============================================================
        let isCorrect = false;

        if (task.correctAnswer && task.correctAnswer.trim() !== '') {
            const userAnswer = answer.trim().toLowerCase();
            const correctAnswer = task.correctAnswer.trim().toLowerCase();
            isCorrect = userAnswer === correctAnswer;
        } else {
            // Если правильного ответа нет - ОТВЕТ НЕ ЗАСЧИТЫВАЕТСЯ
            isCorrect = false;
        }

        console.log(`🔍 Проверка: "${answer.trim()}" vs "${task.correctAnswer}" = ${isCorrect}`);

        // Сохраняем попытку в историю
        db.submissions.push({
            id: Date.now(),
            teamId: team.id,
            taskId: task.id,
            answer: answer,
            isCorrect: isCorrect,
            timestamp: new Date().toISOString()
        });

        // ✅ БАЛЛЫ НАЧИСЛЯЕМ ТОЛЬКО ЕСЛИ ПРАВИЛЬНО
        if (isCorrect) {
            team.points += task.points || 10;
            team.solvedTasks.push(task.id);
            saveDB(db);

            console.log(`✅ Команда ${team.teamName} получила ${task.points} баллов за задачу ${task.id}`);
        } else {
            // ❌ НЕПРАВИЛЬНО - БАЛЛЫ НЕ НАЧИСЛЯЕМ
            // НО ЗАДАЧА НЕ ПОМЕЧАЕТСЯ КАК РЕШЕННАЯ!
            // (участник может попробовать снова)
            saveDB(db);

            console.log(`❌ Команда ${team.teamName} дала НЕПРАВИЛЬНЫЙ ответ на задачу ${task.id}`);
        }

        // ============================================================
        // УЧАСТНИК ВСЕГДА ВИДИТ ОДНО И ТО ЖЕ СООБЩЕНИЕ
        // ============================================================
        res.json({
            status: 'success',
            isCorrect: isCorrect,        // ← фронтенд может использовать, но мы скрываем
            pointsEarned: isCorrect ? (task.points || 10) : 0,
            totalPoints: team.points,
            message: '✅ Задание выполнено!',
            // НЕ ПИШЕМ "правильно" или "неправильно"!
        });

    } catch (err) {
        console.error('❌ Ошибка отправки решения:', err);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка сервера: ' + err.message
        });
    }
});

module.exports = router;