const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;

const dataFilePath = path.join(__dirname, 'data.txt');
console.log('Data file path:', dataFilePath);

fs.access(dataFilePath, fs.constants.R_OK, (err) => {
    if (err) {
        console.error(`${dataFilePath} cannot be read. Error:`, err.message);
    } else {
        console.log(`${dataFilePath} can be read.`);
    }
});

const saveDataToFile = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log('Data saved to file:', data);
};

const loadDataFromFile = () => {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        if (data.trim()) {
            console.log('Data loaded from file:', data);
            const parsedData = JSON.parse(data);
            parsedData.users = parsedData.users || {}; // users 속성이 없을 경우 빈 객체로 초기화
            return parsedData;
        } else {
            console.log('Data file is empty');
        }
    } else {
        console.log('Data file does not exist');
    }
    return { users: {} }; // 기본값을 { users: {} }로 설정
};

let data = loadDataFromFile();
data.users = data.users || {}; // data.users가 정의되지 않았으면 빈 객체로 초기화
saveDataToFile(data);
console.log('Initial data:', data);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON 본문을 파싱하는 미들웨어 추가
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.post('/register', (req, res) => {
    const { username } = req.body;
    console.log('Received body:', req.body);
    // if (!req.body) {
    //     console.error('Request body is missing');
    //     return res.status(400).send('Request body is missing');
    // }
    if (!username) {
        console.error('Username is required but missing');
        return res.status(400).send('Username is required');
    }

    data.users = data.users || {};

    if (!data.users[username]) {
        data.users[username] = { rooms: {} };
        saveDataToFile(data);
        res.status(200).send('User registered');
    } else {
        res.status(400).send('User already exists');
    }
});


app.post('/send', (req, res) => {
    // req.body가 정의되지 않았을 경우를 처리
    if (!req.body) {
        console.error('Request body is missing');
        return res.status(400).send('Request body is missing');
    }

    const { username, room, message } = req.body;
    if (!username || !room || !message) {
        console.error('Username, room, and message are required but missing');
        return res.status(400).send('Username, room, and message are required');
    }

    // data.users가 정의되지 않았을 경우를 처리
    data.users = data.users || {};

    if (!data.users[username]) {
        return res.status(400).send('User not found');
    }
    if (!data.users[username].rooms[room]) {
        data.users[username].rooms[room] = [];
    }
    data.users[username].rooms[room].push({ username, message, timestamp: new Date() });
    saveDataToFile(data);
    res.status(200).send('Message received');
});

app.post('/delete-room', (req, res) => {
    // req.body가 정의되지 않았을 경우를 처리
    if (!req.body) {
        console.error('Request body is missing');
        return res.status(400).send('Request body is missing');
    }

    const { username, room } = req.body;
    if (!username || !room) {
        console.error('Username and room are required but missing');
        return res.status(400).send('Username and room are required');
    }

    // data.users가 정의되지 않았을 경우를 처리
    data.users = data.users || {};

    if (data.users[username] && data.users[username].rooms[room]) {
        delete data.users[username].rooms[room];
        saveDataToFile(data);
        res.status(200).send('Room deleted');
    } else {
        res.status(404).send('Room not found');
    }
});

app.get('/messages/:username/:room', (req, res) => {
    const { username, room } = req.params;
    if (data.users[username] && data.users[username].rooms[room]) {
        res.json(data.users[username].rooms[room]);
    } else {
        res.status(404).send('Room not found');
    }
});

app.get('/rooms/:username', (req, res) => {
    const { username } = req.params;
    if (data.users[username]) {
        res.json(Object.keys(data.users[username].rooms));
    } else {
        res.status(404).send('User not found');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
