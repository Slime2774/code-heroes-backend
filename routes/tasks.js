const express = require('express');
const router = express.Router();
const { loadDB, saveDB } = require('../utils/db');

// Получить все задачи
router.get('/', (req, res) => {
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
});

// Получить задачу по ID
router.get('/:taskId', (req, res) => {
    const db = loadDB();
    const task = db.tasks.find(t => t.id == req.params.taskId);
    
    if (!task) {
        return res.status(404).json({ error: 'Задача не найдена' });
    }
    
    res.json(task);
});

// Отправить решение
router.post('/submit', (req, res) => {
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

    if (team.solvedTasks.includes(task.id)) {
        return res.json({
            status: 'already_solved',
            message: 'Задача уже решена'
        });
    }

    let isCorrect = false;
    if (task.correctAnswer) {
        isCorrect = answer.trim().toLowerCase() === task.correctAnswer.trim().toLowerCase();
    } else {
        isCorrect = true;
    }

    if (isCorrect) {
        team.points += task.points || 10;
        team.solvedTasks.push(task.id);
        
        db.submissions.push({
            id: Date.now(),
            teamId: team.id,
            taskId: task.id,
            answer: answer,
            isCorrect: true,
            timestamp: new Date().toISOString()
        });
        
        saveDB(db);
        
        res.json({
            status: 'success',
            isCorrect: true,
            pointsEarned: task.points || 10,
            totalPoints: team.points,
            message: '✅ Правильный ответ!'
        });
    } else {
        res.json({
            status: 'success',
            isCorrect: false,
            message: '❌ Неправильный ответ. Попробуйте еще раз!'
        });
    }
});

module.exports = router;