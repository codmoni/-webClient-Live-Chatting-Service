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
            parsedData.rooms = parsedData.rooms || {};
            return parsedData;
        } else {
            console.log('Data file is empty');
        }
    } else {
        console.log('Data file does not exist');
    }
    return { users: {}, rooms:{} }; // 기본값을 { users: {} }로 설정
};

let data = loadDataFromFile();
data.users = data.users || {}; // data.users가 정의되지 않았으면 빈 객체로 초기화
data.rooms = data.rooms || {};
saveDataToFile(data);
console.log('Initial data:', data);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON 본문을 파싱하는 미들웨어 추가
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// [1] 회원가입
app.post('/register', (req, res) => {
    const { username } = req.body;
    console.log('Received body:', req.body);

    if (!username) {
        console.error('Username is required but missing');
        return res.status(400).send('Username is required');
    }

    data.users = data.users || {};

    if (!data.users[username]) {
        data.users[username] = { rooms: {} };
        saveDataToFile(data);
    } 

    res.status(200).send('User registered or logged in');
});

//[2] 채팅방 생성
app.post('/create-room', (req, res)=>{
    // const { roomName } = req.body;
    // if(!roomName){
    //     return res.status(400).send('Room name is required');
    // }
    // if(!data.rooms[roomName]){
    //     data.rooms[roomName] = [];
    //     saveDataToFile(data);
    //     res.status(200).send('Room created');
    // }else{
    //     res.status(400).send('Room already exists');
    // }

    const { username, room, message } = req.body;
    if (!username || !room || !message) {
        console.error('Username, room, and message are required but missing');
        return res.status(400).send('Username, room, and message are required');
    }

    // data.users가 정의되지 않았을 경우를 처리
    data.users = data.users || {};
    data.rooms = data.rooms || {};

    if (!data.users[username]) {
        return res.status(400).send('User not found');
    }

    data.users[username].rooms = data.users[username].rooms || {};

    data.rooms[room] = [];
    data.rooms[room].push({ username, message, timestamp: new Date() });
    data.users[username].rooms[room] = true; // 사용자 참여 채팅방 목록에 추가
    
    saveDataToFile(data);
    res.status(200).send('New Room Created');
});

//[3] 메세지 전송
app.post('/send', (req, res) => {
    // // req.body가 정의되지 않았을 경우를 처리
    // if (!req.body) {
    //     console.error('Request body is missing');
    //     return res.status(400).send('Request body is missing');
    // }

    const { username, room, message } = req.body;
    if (!username || !room || !message) {
        console.error('Username, room, and message are required but missing');
        return res.status(400).send('Username, room, and message are required');
    }

    // // data.users가 정의되지 않았을 경우를 처리
    // data.users = data.users || [];
    // data.rooms = data.rooms || [];
    if(!data.rooms[room]){
        return res.status(400).send('Room not found');
    }
    data.rooms[room].push({username, message, timestamp: new Date()});

    data.users[username].rooms = data.users[username].rooms || {};

    if (!data.users[username].rooms[room]) {
        data.users[username].rooms[room] = true; // 사용자 참여 채팅방 목록에 추가
    }

    saveDataToFile(data);
    res.status(200).send('Message received');
});

//[4] 채팅방 삭제
app.post('/delete-room', (req, res) => {
    // req.body가 정의되지 않았을 경우를 처리
    // if (!req.body) {
    //     console.error('Request body is missing');
    //     return res.status(400).send('Request body is missing');
    // }

    const { roomName } = req.body;
    if (!roomName) {
        console.error('Username and room are required but missing');
        return res.status(400).send('Room name is required');
    }

    // // data.users가 정의되지 않았을 경우를 처리
    // data.users = data.users || {};

    if (data.rooms[roomName]) {
        delete data.rooms[roomName];
        Object.keys(data.users).forEach(username=>{
            if(data.users[username].rooms[roomName]){
                delete data.users[username].rooms[roomName];
            }
        });
        saveDataToFile(data);
        res.status(200).send('Room deleted');
    } else {
        res.status(404).send('Room not found');
    }
});

//[5] 채팅 내용 반환
app.get('/messages/:room', (req, res) => {
    const { room } = req.params;
    if(data.rooms && data.rooms[room]){
        res.json(data.rooms[room]);
    }else{
        res.status(404).send('Room not found');
    }
});

//[6] 참여 중인 채팅방 목록 반환
app.get('/rooms/:username', (req, res) => {
    const { username } = req.params;
    if (data.users[username]) {
        res.json(Object.keys(data.users[username].rooms));
    } else {
        res.status(404).send('User not found');
    }
});


//[7] 동적 라우팅 처리
// app.get('/:room', (req, res) =>{
//     const roomName = req.params.room;
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// })

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
