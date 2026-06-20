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
// ОТПРАВКА РЕШЕНИЯ - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
                message: 'Задача уже решена ✅'
            });
        }

        // ============================================================
        // ГЛАВНОЕ: ПРОВЕРКА ОТВЕТА
        // ============================================================
        let isCorrect = false;
        let answerMessage = '';

        // Проверяем, есть ли правильный ответ у задачи
        if (task.correctAnswer && task.correctAnswer.trim() !== '') {
            // Сравниваем ответ (игнорируем регистр и пробелы)
            const userAnswer = answer.trim().toLowerCase();
            const correctAnswer = task.correctAnswer.trim().toLowerCase();
            isCorrect = userAnswer === correctAnswer;

            answerMessage = isCorrect ? '✅ Правильный ответ!' : '❌ Неправильный ответ. Попробуйте еще раз!';
        } else {
            // Если правильного ответа нет - задача считается НЕПРОВЕРЯЕМОЙ
            // ❌ ОТВЕТ НЕ ЗАСЧИТЫВАЕТСЯ!
            isCorrect = false;
            answerMessage = '⚠️ Для этой задачи не задан правильный ответ. Обратитесь к организатору!';
        }

        console.log(`🔍 Проверка ответа: "${answer.trim()}" vs "${task.correctAnswer || 'НЕТ ОТВЕТА'}" = ${isCorrect}`);

        // Сохраняем попытку в историю (всегда, даже если неправильно)
        db.submissions.push({
            id: Date.now(),
            teamId: team.id,
            taskId: task.id,
            answer: answer,
            isCorrect: isCorrect,
            timestamp: new Date().toISOString()
        });

        if (isCorrect) {
            // ✅ ПРАВИЛЬНО - начисляем баллы
            team.points += task.points || 10;
            team.solvedTasks.push(task.id);

            saveDB(db);

            res.json({
                status: 'success',
                isCorrect: true,
                pointsEarned: task.points || 10,
                totalPoints: team.points,
                message: '✅ Задание выполнено!'
            });
        } else {
            // ❌ НЕПРАВИЛЬНО - баллы НЕ начисляем
            saveDB(db);

            res.json({
                status: 'success',
                isCorrect: false,
                message: answerMessage || '❌ Неправильный ответ. Попробуйте еще раз!'
            });
        }
    } catch (err) {
        console.error('❌ Ошибка отправки решения:', err);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка сервера: ' + err.message
        });
    }
});

module.exports = router;



