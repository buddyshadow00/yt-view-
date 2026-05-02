const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Application State
let botTask = {
    active: false,
    url: '',
    videoId: '',
    iterations: 0,
    interval: null,
    status: 'Stopped'
};

app.use(express.urlencoded({ extended: true }));

// Helper: Extract YouTube ID
const getYoutubeID = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Background Loop: Simulates 50 embed hits
const runBotCycle = async () => {
    if (!botTask.active) return;
    
    botTask.iterations++;
    const embedUrl = `https://www.youtube.com/embed/${botTask.videoId}`;
    
    // Fire 50 requests simultaneously
    const requests = Array.from({ length: 50 }, () => 
        axios.get(embedUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ViewBot/1.0' } 
        }).catch(() => {}) // Ignore errors
    );

    await Promise.allSettled(requests);
    console.log(`[${new Date().toLocaleTimeString()}] Completed cycle ${botTask.iterations} for ${botTask.videoId}`);
};

// HTML Template (All-in-one UI)
const renderHTML = () => `
<!DOCTYPE html>
<html>
<head>
    <title>Nebryx YT Bot</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>Nebryx YT Background Controller</h1>
    <div style="background: #222; padding: 15px; border-radius: 10px; border: 1px solid ${botTask.active ? '#00ff00' : '#555'}">
        <h3>Status: <span style="color: ${botTask.active ? '#00ff00' : '#ff4444'}">${botTask.status}</span></h3>
        <p><strong>URL:</strong> ${botTask.url || 'None'}</p>
        <p><strong>Cycles Completed:</strong> ${botTask.iterations}</p>
        <p><strong>Total Requests Sent:</strong> ${botTask.iterations * 50}</p>
    </div>

    <form action="/start" method="POST" style="margin-top: 20px;">
        <label>YouTube URL:</label>
        <input type="text" name="url" placeholder="Paste link here..." required>
        <button type="submit">Start / Update Bot</button>
    </form>

    <form action="/stop" method="POST">
        <button type="submit" style="background: #a00;">Stop Bot</button>
    </form>

    ${botTask.videoId ? `
        <hr>
        <h4>Live Preview (Current Video)</h4>
        <iframe width="100%" height="300" src="https://www.youtube.com/embed/${botTask.videoId}?autoplay=1&mute=1" frameborder="0"></iframe>
    ` : ''}
</body>
</html>
`;

// Routes
app.get('/', (req, res) => res.send(renderHTML()));

app.post('/start', (req, res) => {
    const vId = getYoutubeID(req.body.url);
    if (!vId) return res.status(400).send("Invalid YouTube URL. <a href='/'>Go back</a>");

    if (botTask.interval) clearInterval(botTask.interval);

    botTask.active = true;
    botTask.url = req.body.url;
    botTask.videoId = vId;
    botTask.status = 'Running';
    
    // Initial run
    runBotCycle();
    // Repeat every 60 seconds
    botTask.interval = setInterval(runBotCycle, 60000); 
    
    res.redirect('/');
});

app.post('/stop', (req, res) => {
    botTask.active = false;
    botTask.status = 'Stopped';
    if (botTask.interval) clearInterval(botTask.interval);
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Nebryx Bot active on port ${PORT}`);
});
