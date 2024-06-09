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

//dataFilePath경로의 파일에 데이터를 저장
const saveDataToFile = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log('Data saved to file:', data);
};
//데이터를 dataFilePath경로의 파일로부터 불러옴
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
    return { users: {}, rooms:{} }; // 기본값 설정
};

let data = loadDataFromFile();
// 빈 객체로 초기화
data.users = data.users || {}; 
data.rooms = data.rooms || {};
saveDataToFile(data);
console.log('Initial data:', data);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// [1] 회원가입
app.post('/register', (req, res) => {
    const { username } = req.body;
    if (!username) {
        console.error('Username is required but missing');
        return res.status(400).send('Username is required');
    }

    data.users = data.users || {};

    //사용자가 존재하지 않을 경우 새로 등록
    if (!data.users[username]) {
        data.users[username] = { rooms: {} };
        saveDataToFile(data);
    } 
    return res.status(200).send('User registered or logged in');
});

//[2] 채팅방 생성
app.post('/create-room', (req, res)=>{
    const { username, room, roomPassword } = req.body;
    if (!username || !room ) {
        console.error('Username, room are required but missing');
        return res.status(400).send('Username, room are required');
    }

    // data.users가 정의되지 않았을 경우를 처리
    data.users = data.users || {};
    data.rooms = data.rooms || {};
    data.users[username].rooms = data.users[username].rooms || {};

    //사용자가 존재해야함
    if (!data.users[username]) {
        return res.status(400).send('User not found');
    }

    //채팅방이 없으면 새로 등록
    if (!data.rooms[room]) {
        data.rooms[room] = { password: roomPassword, messages: [] };
        data.users[username].rooms[room] = true;
        saveDataToFile(data);
        return res.status(200).send('Room created');
    } 
    //채팅방이 존재하고, 비밀번호가 일치하면 등록
    else if (data.rooms[room].password === roomPassword) {
        data.users[username].rooms[room] = true;
        saveDataToFile(data);
        return res.status(200).send('Joined room');
    } else {
        return res.status(400).send('Incorrect password');
    }
});

//[3] 채팅방 삭제
app.post('/delete-room', (req, res) => {
    const { username, roomName } = req.body;
    if (!roomName) {
        console.error('Username and room are required but missing');
        return res.status(400).send('Room name is required');
    }

    if (data.rooms[roomName]) {
        delete data.users[username].rooms[roomName];

        //해당 채팅방에 접속한 유저가 없으면 완전히 삭제
        let userCount=0;
        Object.keys(data.users).forEach(user=>{
            if(data.users[user].rooms[roomName]){
                userCount ++;
                console.log('username: '+user+'  usercount: '+userCount);
            }
        });
        if(userCount === 0){
            delete data.rooms[roomName];
        }

        saveDataToFile(data);
        return res.status(200).send('Room deleted');
    } else {
        return res.status(404).send('Room not found');
    }
});

//[4] 메세지 전송
app.post('/send', (req, res) => {
    const { username, room, message } = req.body;
    if (!username || !room || !message) {
        console.error('Username, room, and message are required but missing');
        return res.status(400).send('Username, room, and message are required');
    }

    if(!data.rooms[room]){
        return res.status(400).send('Room not found');
    }
    data.rooms[room].messages.push({username, message, timestamp: new Date()});

    data.users[username].rooms = data.users[username].rooms || {};

    if (!data.users[username].rooms[room]) {
        data.users[username].rooms[room] = true; // 사용자 참여 채팅방 목록에 추가
    }

    saveDataToFile(data);
    return res.status(200).send('Message received');
});



//[5] 채팅 내용 반환
app.get('/messages/:room', (req, res) => {
    const { room } = req.params;
    if(data.rooms && data.rooms[room]){
        res.json(data.rooms[room].messages);
        return res.status(200).send('messages return')
    }
});

//[6] 참여 중인 채팅방 목록 반환
app.get('/rooms/:username', (req, res) => {
    const { username } = req.params;
    if (data.users[username]) {
        res.json(Object.keys(data.users[username].rooms));
    } else {
        return res.status(404).send('User not found');
    }
});


// [7] 동적 라우팅 처리
app.get('/:room', (req, res) =>{
    const roomName = req.params.room;
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});