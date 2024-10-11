const LEFT = "left";
const RIGHT = "right";

const EVENT_MESSAGE = "message"
const EVENT_OTHER = "other"

const userPhotos = [
    "/assets/img/pic1.jpg",
    "/assets/img/pic2.jpg",
    "/assets/img/pic3.jpg",
    "/assets/img/pic4.jpg",
    "/assets/img/pic5.jpg",
    "/assets/img/pic6.jpg",
    "/assets/img/pic7.jpg",
    "/assets/img/pic8.jpg",
    "/assets/img/pic9.jpg",
    "/assets/img/pic10.jpg",
]
var PERSON_IMG = userPhotos[getRandomNum(0, userPhotos.length - 1)]; 
var PERSON_NAME = "Guest" + Math.floor(Math.random() * 1000); 

var ws;
var chatroom = document.getElementsByClassName("msger-chat");
var text = document.getElementById("msg");
var send = document.getElementById("send");

send.onclick = function (e) {
    handleMessageEvent();
};

text.onkeydown = function (e) {
    if (e.keyCode === 13 && text.value !== "") {
        handleMessageEvent();
    }
};

function createWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket is already open or connecting');
        return;
    }

    var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    var url = protocol + "chatroom-node.onrender.com/ws?id=" + PERSON_NAME;
    console.log('WebSocket URL:', url); // 確認 URL 正確
    ws = new WebSocket(url);

    ws.onopen = function() {
        console.log('WebSocket connection opened');
    };

    ws.onmessage = function(e) {
        console.log('Received message:', e.data);

        // 判斷接收到的數據是否為 Blob 對象
        if (e.data instanceof Blob) {
            e.data.text().then(function(text) {
                handleMessage(text);
            }).catch(err => console.error('Error reading Blob:', err));
        } else {
            handleMessage(e.data);
        }
    };

    // 當 WebSocket 連接關閉時
    ws.onclose = function(event) {
        console.log('WebSocket connection closed:', event);
        // 根據關閉的原因選擇是否要重新連接
        if (!event.wasClean || event.code !== 1000) {
            // 如果關閉不是正常的或代碼不是1000（表示正常關閉），進行重連
            setTimeout(createWebSocket, 10000);
        }
    };

    // 當 WebSocket 發生錯誤
    ws.onerror = function(error) {
        console.log('WebSocket error:', error);
        // 錯誤處理後，如果 WebSocket 仍然關閉，嘗試重新連接
        if (ws.readyState === WebSocket.CLOSED) {
            setTimeout(createWebSocket, 10000);
        }
    };
}

function handleMessage(data) {
    try {
        var m = JSON.parse(data);
        console.log('Parsed message:', m);

        var msg = "";
        switch (m.event) {
            case EVENT_MESSAGE:
                if (m.name === PERSON_NAME) {
                    msg = getMessage(m.name, m.photo, RIGHT, m.content);
                } else {
                    msg = getMessage(m.name, m.photo, LEFT, m.content);
                }
                break;
            case EVENT_OTHER:
                if (m.name !== PERSON_NAME) {
                    msg = getEventMessage(m.name + " " + m.content);
                } else {
                    msg = getEventMessage("您已" + m.content);
                }
                break;
        }
        insertMsg(msg, chatroom[0]);
    } catch (err) {
        console.error('Error parsing message:', data);
    }
}

function insertMsg(msg, domObj) {
    if (domObj) {
        domObj.insertAdjacentHTML("beforeend", msg);
        domObj.scrollTop = domObj.scrollHeight; // 滾動到最新消息
    } else {
        console.error('DOM object not found for message insertion');
    }
}
///////////////////////////


function handleMessageEvent() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            "event": EVENT_MESSAGE,
            "photo": PERSON_IMG,
            "name": PERSON_NAME,
            "content": text.value,
        }));
        text.value = "";
    } else {
        console.log('WebSocket is not open. ReadyState:', ws.readyState);
    }
}

function getEventMessage(msg) {
    return `<div class="msg-left">${msg}</div>`;
}

function getMessage(name, img, side, text) {
    const d = new Date();
    var msg = `
    <div class="msg ${side}-msg">
        <img src="${img}" alt="" class="msg-img">

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `;
    return msg;
}

// function insertMsg(msg, domObj) {
//     domObj.insertAdjacentHTML("beforeend", msg);
//     domObj.scrollTop = domObj.scrollHeight; // 滾動到最新消息
// }

function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 創建 WebSocket 連接
createWebSocket();
