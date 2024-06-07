const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;

const dataFilePath = path.join(__dirname, 'data.txt');

// 메시지를 파일에 저장하는 함수
const saveMessagesToFile = (messages) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(messages, null, 2));
};

// 파일에서 메시지를 읽어오는 함수
const loadMessagesFromFile = () => {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        if (data.trim()) {
            return JSON.parse(data);
        }
    }
    return {};
};

let messages = loadMessagesFromFile();

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메시지 저장 미들웨어
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/send', (req, res) => {
    const { room, username, message } = req.body;
    if (!messages[room]) {
        messages[room] = [];
    }
    messages[room].push({ username, message, timestamp: new Date() });
    saveMessagesToFile(messages);
    res.status(200).send('Message received');
});

app.post('/delete-room', (req, res) => {
    const { room } = req.body;
    if (messages[room]) {
        delete messages[room];
        saveMessagesToFile(messages);
        res.status(200).send('Room deleted');
    } else {
        res.status(404).send('Room not found');
    }
});

app.get('/messages/:room', (req, res) => {
    const room = req.params.room;
    res.json(messages[room] || []);
});

// 채팅방 목록 반환
app.get('/rooms', (req, res) => {
    res.json(Object.keys(messages));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
