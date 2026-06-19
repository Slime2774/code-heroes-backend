const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Раздача статических файлов (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Роуты API
const teamsRouter = require('./routes/teams');
const tasksRouter = require('./routes/tasks');
const adminRouter = require('./routes/admin');
const leaderboardRouter = require('./routes/leaderboard');

app.use('/api/teams', teamsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Главная страница - отдаём HTML файл
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Для всех остальных GET запросов - отдаём HTML (для SPA)
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 CODE HEROES Server running on http://localhost:${PORT}`);
    console.log(`🌐 Доступно по сети: http://192.168.0.161:${PORT}`);
    console.log(`📊 API: http://192.168.0.161:${PORT}/api`);
});