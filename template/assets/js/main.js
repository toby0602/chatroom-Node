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
const MAX_RETRIES = 5; // 最大重試次數
let retryCount = 0; // 當前重試次數

send.onclick = function (e) {
    handleMessageEvent();
};

text.onkeydown = function (e) {
    if (e.keyCode === 13 && text.value.trim() !== "") {
        handleMessageEvent();
        e.preventDefault(); // 防止 Enter 鍵導致換行
    }
};

function createWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket is already open or connecting');
        return;
    }

    var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    var url = protocol + "chatroom-node.onrender.com/ws?id=" + PERSON_NAME;

    ws = new WebSocket(url);
    ws.onopen = function () {
        console.log('WebSocket connection opened');
        retryCount = 0 // 連線成功後重置重試次數
    };

    ws.onmessage = function (e) {
        // 判斷接收到的數據是否為 Blob 對象
        if (e.data instanceof Blob) {
            e.data.text().then(function (text) {
                handleMessage(text);
            }).catch(err => console.error('Error reading Blob:', err));
        } else {
            handleMessage(e.data);
        }
    };

    // 當 WebSocket 連接關閉時
    ws.onclose = function (event) {
        console.log('WebSocket connection closed:', event);
        // 根據關閉的原因選擇是否要重新連接
        if (!event.wasClean || event.code !== 1000) {
            retryConnection();
        }
    };

    // 當 WebSocket 發生錯誤
    ws.onerror = function (error) {
        console.log('WebSocket error:', error);
        // 錯誤處理後，如果 WebSocket 仍然關閉，嘗試重新連接
        if (ws.readyState === WebSocket.CLOSED) {
            retryConnection();
        }
    };
}

function retryConnection() {
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(10000, 1000 * Math.pow(2, retryCount)) // 指數退避，最大10秒
        console.log(`Retrying connection in ${delay / 1000} seconds ... (Attempt ${retryCount})`);
    } else {
        console.error(`Failed to reconnect after multiple attempts.`);
    }
}

function handleMessage(data) {
    try {
        var m = JSON.parse(data);
        // 轉為台灣區時間
        const timestamp = m.timestamp ? m.timestamp : new Date();
        const timeDate = new Date(timestamp);
        const taiwanTime = timeDate.toLocaleString("zh-TW", {
            timeZone: "Asia/Taipei",
            hour12: false,
            second: undefined,  // 隱藏秒數
            minute: '2-digit',
            hour: '2-digit',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        var msg = "";
        switch (m.event) {
            case EVENT_MESSAGE:
                if (m.name === PERSON_NAME) {
                    msg = getMessage(m.name, m.photo, RIGHT, m.content, taiwanTime);
                } else {
                    msg = getMessage(m.name, m.photo, LEFT, m.content, taiwanTime);
                }
                break;
            case EVENT_OTHER:
                if (m.name !== PERSON_NAME) {
                    msg = getEventMessage(m.name + " " + m.content);
                } else {
                    msg = getEventMessage(`哈囉 ${m.name}，您已${m.content}`);
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
    // 檢查 textarea 是否為空
    if (text.value.trim() === "") {
        console.log('Message is empty, not sending.');
        return; // 若內容為空，則不執行後續動作
    }

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
    return `<div class="msg-center">${msg}</div>`;
}

function getMessage(name, img, side, text, date) {
    var msg = `
    <div class="msg ${side}-msg">
        <img src="${img}" alt="" class="msg-img">

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${date}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `;
    return msg;
}

function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 創建 WebSocket 連接
createWebSocket();
