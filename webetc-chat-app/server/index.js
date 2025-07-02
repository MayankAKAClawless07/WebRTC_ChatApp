const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory room tracking
const rooms = new Map();

wss.on("connection", (ws) => {
    let currentRoom = null;

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        const {type, room, payload} = data;

        switch(type){
            case "join":
                currentRoom = room;
                if(!rooms.has(room)){
                    rooms.set(room, []);
                }
                rooms.get(room).push(ws);
                break;
            case "signal":
                if(currentRoom && rooms.has(currentRoom)) {
                    rooms.get(currentRoom).forEach((client) => {
                        if(client != ws && client.readyState == WebSocket.OPEN){
                            client.send(JSON.stringify({type: "signal", payload}));
                        }
                    });
                }
                break;
        }
    });
} );

app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server running on http://localhost:${PORT}`));