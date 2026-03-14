// Simple WebSocket relay server for LAN multiplayer
import { WebSocketServer } from 'ws';

const PORT = 9000;
const rooms = new Map(); // roomCode -> { host: ws, client: ws }

const wss = new WebSocketServer({ host: '0.0.0.0', port: PORT });

console.log(`WebSocket server running on 0.0.0.0:${PORT}`);

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.roomCode = null;
    ws.isHost = false;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'host') {
                // Create a new room
                const code = msg.code;
                if (rooms.has(code)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room exists' }));
                    return;
                }
                rooms.set(code, { host: ws, client: null });
                ws.roomCode = code;
                ws.isHost = true;
                ws.send(JSON.stringify({ type: 'hosted', code }));
                console.log(`Room ${code} created`);
            }
            else if (msg.type === 'join') {
                // Join existing room
                const code = msg.code;
                const room = rooms.get(code);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                    return;
                }
                if (room.client) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room full' }));
                    return;
                }
                room.client = ws;
                ws.roomCode = code;
                ws.isHost = false;
                ws.send(JSON.stringify({ type: 'joined', code }));
                room.host.send(JSON.stringify({ type: 'client-connected' }));
                console.log(`Client joined room ${code}`);
            }
            else if (msg.type === 'relay') {
                // Relay message to the other peer
                const room = rooms.get(ws.roomCode);
                if (!room) return;

                const target = ws.isHost ? room.client : room.host;
                if (target && target.readyState === 1) {
                    target.send(JSON.stringify({ type: 'relay', data: msg.data }));
                }
            }
        } catch (e) {
            console.error('Message parse error:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ws.roomCode) {
            const room = rooms.get(ws.roomCode);
            if (room) {
                // Notify the other peer
                const other = ws.isHost ? room.client : room.host;
                if (other && other.readyState === 1) {
                    other.send(JSON.stringify({ type: 'peer-disconnected' }));
                }
                // Clean up room if host left
                if (ws.isHost) {
                    rooms.delete(ws.roomCode);
                    console.log(`Room ${ws.roomCode} closed`);
                } else {
                    room.client = null;
                }
            }
        }
    });
});
