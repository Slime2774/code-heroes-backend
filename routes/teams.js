const express = require('express');
const router = express.Router();
const { loadDB, saveDB, getNextId } = require('../utils/db');

// Регистрация команды
router.post('/register', (req, res) => {
    const { teamName, school, class: className, captainName, members } = req.body;
    
    if (!teamName || !teamName.trim()) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Название команды обязательно!' 
        });
    }

    const db = loadDB();
    
    const existingTeam = db.teams.find(t => t.teamName.toLowerCase() === teamName.toLowerCase());
    if (existingTeam) {
        return res.json({
            status: 'success',
            isExisting: true,
            teamId: existingTeam.id,
            teamName: existingTeam.teamName
        });
    }

    const newTeam = {
        id: getNextId(db.teams),
        teamName: teamName.trim(),
        school: school || '',
        class: className || '',
        captainName: captainName || '',
        members: members || [],
        points: 0,
        solvedTasks: [],
        registeredAt: new Date().toISOString()
    };

    db.teams.push(newTeam);
    saveDB(db);

    res.json({
        status: 'success',
        isExisting: false,
        teamId: newTeam.id,
        teamName: newTeam.teamName
    });
});

// Получить команду по ID
router.get('/:teamId', (req, res) => {
    const db = loadDB();
    const team = db.teams.find(t => t.id == req.params.teamId);
    
    if (!team) {
        return res.status(404).json({ error: 'Команда не найдена' });
    }
    
    res.json(team);
});

module.exports = router;