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
    let lastMessageTimestamp = null; // 마지막 메세지의 timestamp. 메세지가 추가됐는지 확인하기 위함
    let currentUsername = ''; // 현재 사용자의 이름을 식별하기 위함

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

    //[2] 데이터 요청(using XMLHttpRequest)
    const fetchRooms = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/rooms', true); // true: 비동기 호출
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
                const oldMessagesLength = messagesContainer.children.length;
                const wasScrolledToBottom = isScrolledToBottom();
                displayMessages(messages);
                if (initialLoad) {
                    scrollToBottom(); // 메시지 로드 후 채팅방 처음 접속 시 스크롤을 맨 아래로 이동
                    initialLoad = false;
                } else if (messages.length > 0) {
                    const latestMessageTimestamp = new Date(messages[messages.length - 1].timestamp).getTime();
                    // 최신 메시지 timestamp > 마지막 메세지 timestamp이면 새로운 채팅이 추가된 것
                    if (lastMessageTimestamp && latestMessageTimestamp > lastMessageTimestamp) {
                        // 새로운 채팅이 다른 사용자에 의해 추가된 거면
                        if (messages.length > oldMessagesLength && messages[messages.length - 1].username !== currentUsername) {
                            // 스크롤이 맨 밑에 위치해 있지 않으면 '새로운 채팅' 알림 띄우기
                            if (!wasScrolledToBottom) {
                                showNewMessageAlert();
                            } else {
                                scrollToBottom();
                            }
                        } else {
                            // "나"에 의해 추가된 메시지이거나 스크롤이 맨 아래에 위치해 있는 경우
                            scrollToBottom();
                        }
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

    const showNewMessageAlert = () => {
        if (!newRoomAlert.classList.contains('show')) {
            newMessageAlert.classList.add('show');
            setTimeout(() => {
                if (newMessageAlert.classList.contains('show')) {
                    newMessageAlert.classList.remove('show');
                }
            }, 5000);
        }
    };

    const isScrolledToBottom = () => {
        // messagesContainer.scrollHeight: 스크롤 가능한 전체 높이, messageContainer.scrollTop: 현재 스크롤 위치
        // messagesContainer.scrollHeight - messagesContainer.scrollTop: 맨 아래까지 남은 높이
        // messageContainer.clientHeight: 클라이언트의 높이
        // 두 값이 같으면, 현재 스크롤이 맨 아래에 있음을 의미
        return messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 1;
    };

    //[3] display
    const displayRooms = (rooms) => {
        roomList.innerHTML = '';
        rooms.forEach(roomName => {
            const roomElement = document.createElement('li');
            roomElement.className = 'd-flex justify-content-between align-items-center';
            roomElement.innerHTML = `
                <span>${roomName}</span>
                <button class="btn btn-danger btn-sm delete-button" style="color:black;">x</button>
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
        messages.slice(1).forEach(({ username, message, timestamp }) => {  // slice(1) -> slice(0)
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
        newMessageAlert.classList.remove('show'); // 스크롤을 맨 아래로 이동할 때 알림 숨기기
    };

    newMessageAlert.addEventListener('click', () => {
        newMessageAlert.classList.remove('show');
        scrollToBottom();
    });

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
                    if (!newMessageAlert.classList.contains('show')) {
                        newRoomAlert.classList.add('show');
                        setTimeout(() => {
                            newRoomAlert.classList.remove('show');
                        }, 5000);
                    }
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

    //[8] 사이드바 토글
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    sidebarToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('closed')) {
            sidebar.classList.remove('closed');
            sidebar.classList.add('open');
        } else {
            sidebar.classList.remove('open');
            sidebar.classList.add('closed');
        }
    });

    setInterval(fetchMessages, 3000);
    setInterval(fetchRooms, 3000);
    fetchRooms();
    fetchMessages();
    showLoginModal(); // 페이지 로드 시 로그인 모달 표시
});
