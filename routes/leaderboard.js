const express = require('express');
const router = express.Router();
const { loadDB } = require('../utils/db');

router.get('/', (req, res) => {
    const db = loadDB();
    
    const sorted = [...db.teams]
        .sort((a, b) => b.points - a.points)
        .map((team, index) => ({
            place: index + 1,
            id: team.id,
            teamName: team.teamName,
            school: team.school,
            points: team.points,
            solvedTasks: team.solvedTasks.length
        }));
    
    res.json(sorted);
});

module.exports = router;