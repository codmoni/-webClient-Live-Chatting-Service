document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chattingInput');//element: textarea
    const messagesContainer = document.getElementById('messagesContainer');//element: 채팅 내용 표시되는 곳
    const createRoomForm = document.getElementById('createRoomForm');
    const roomNameInput = document.getElementById('roomNameInput');
    const roomList = document.getElementById('roomList');
    const newMessageAlert = document.getElementById('newMessageAlert');
    const newRoomAlert = document.getElementById('newRoomAlert');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    let room = window.location.pathname.split('/').pop() || 'default';
    let initialLoad = true; // 채팅 창에 처음 접속했는지 여부를 나타내는 플래그
    let lastMessageTimestamp = null;
    let currentUsername = '';

    //[1] 로그인 모달 관리
    const showLoginModal = () => {
        loginModal.style.display = 'block';
    };

    const hideLoginModal = () => {
        loginModal.style.display = 'none';
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUsername = document.getElementById('username').value.trim();
        console.log('Current Username:', currentUsername);
        if (currentUsername) {
            hideLoginModal();
        }
    });

    //[2] fetch를 XMLHttpRequest로 변환
    const fetchRooms = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/rooms', true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                const rooms = JSON.parse(xhr.responseText);
                displayRooms(rooms);
            } else {
                console.error('Error fetching rooms:', xhr.statusText);
            }
        };
        xhr.onerror = function() {
            console.error('Error fetching rooms:', xhr.statusText);
        };
        xhr.send();
    };

    const fetchMessages = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/messages/${room}`, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                const messages = JSON.parse(xhr.responseText);
                displayMessages(messages);
                if (initialLoad) {
                    scrollToBottom(); // 메시지 로드 후 처음 접속 시에만 스크롤을 맨 아래로 이동
                    initialLoad = false;
                } else if (messages.length > 0) {
                    const latestMessageTimestamp = new Date(messages[messages.length - 1].timestamp).getTime();
                    if (lastMessageTimestamp && latestMessageTimestamp > lastMessageTimestamp) {
                        newMessageAlert.style.display = 'block';
                    }
                    lastMessageTimestamp = latestMessageTimestamp;
                }
            } else {
                console.error('Error fetching messages:', xhr.statusText);
            }
        };
        xhr.onerror = function() {
            console.error('Error fetching messages:', xhr.statusText);
        };
        xhr.send();
    };

    //[3] display
    const displayRooms = (rooms) => {
        roomList.innerHTML = '';
        rooms.forEach(roomName => {
            const roomElement = document.createElement('li');
            roomElement.className = 'd-flex justify-content-between align-items-center';
            roomElement.innerHTML = `
                <span>${roomName}</span>
                <button class="btn btn-danger btn-sm delete-button">x</button>
            `;

            roomElement.querySelector('.delete-button').addEventListener('click', (e) => {
                e.stopPropagation();
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/delete-room', true);
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        roomList.removeChild(roomElement);
                    } else {
                        console.error('Error deleting room');
                    }
                };
                xhr.onerror = function() {
                    console.error('Error deleting room');
                };
                xhr.send(JSON.stringify({ room: roomName }));
            });

            roomElement.addEventListener('click', () => {
                document.querySelectorAll('#roomList li').forEach(li => li.classList.remove('selected-room'));
                roomElement.classList.add('selected-room');
                room = roomName;
                initialLoad = true;
                fetchMessages();
            });

            roomList.appendChild(roomElement);
        });
    };

    const displayMessages = (messages) => {
        messagesContainer.innerHTML = '';
        messages.slice(1).forEach(({ username, message, timestamp }) => {
            const messageElement = document.createElement('li');
            messageElement.className = 'd-flex justify-content-between mb-4';
            messageElement.innerHTML = `
                <div class="card ${username === currentUsername ? 'my-message' : 'their-message'}">
                    <div class="card-footer d-flex justify-content-between p-3">
                        ${username === currentUsername ? `
                            <p class="text-muted small mb-0 timestamp" style="font-size: 12px; color:grey;">
                                <i class="far fa-clock"></i> ${new Date(timestamp).toLocaleTimeString()}
                            </p>
                            <p class="fw-bold mb-0 username">${username}</p>
                        ` : `
                            <p class="fw-bold mb-0 username">${username}</p>
                            <p class="text-muted small mb-0 timestamp" style="font-size: 12px; color:grey;">
                                <i class="far fa-clock"></i> ${new Date(timestamp).toLocaleTimeString()}
                            </p>
                        `}
                    </div>
                    <div class="card-body">
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(messageElement);
        });
    };

    //[4] 메세지 전송
    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/send', true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    chatInput.value = '';
                    fetchMessages();
                    scrollToBottom(); // 메시지 전송 후 스크롤을 맨 아래로 이동
                } else {
                    console.error('Error sending message:', xhr.statusText);
                }
            };
            xhr.onerror = function() {
                console.error('Error sending message:', xhr.statusText);
            };
            xhr.send(JSON.stringify({ room, username: currentUsername, message }));
        }
    };

    //[5] 스크롤 맨 아래로 이동
    const scrollToBottom = () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        newMessageAlert.style.display = 'none'; // 스크롤을 맨 아래로 이동할 때 알림 숨기기
    };

    newMessageAlert.addEventListener('click', scrollToBottom);

    //[6] 전송 버튼 클릭 대신 키다운 이벤트 추가
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    //[7] 새로운 채팅방 생성
    createRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const roomName = roomNameInput.value.trim();
        if (roomName) {
            room = roomName;
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/send', true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    initialLoad = true;
                    fetchRooms();
                    fetchMessages();
                    // 새로운 채팅방 생성 알림 표시
                    newRoomAlert.style.display = 'block';
                    setTimeout(() => {
                        newRoomAlert.style.display = 'none';
                    }, 3000);
                } else {
                    const errorMessage = xhr.responseText;
                    console.error('Error creating room:', errorMessage);
                }
            };
            xhr.onerror = function() {
                console.error('Error creating room:', xhr.statusText);
            };
            xhr.send(JSON.stringify({ room, username: currentUsername, message: '' }));
        }
    });

    setInterval(fetchMessages, 3000);
    fetchRooms();
    fetchMessages();
    showLoginModal(); // 페이지 로드 시 로그인 모달 표시
});
