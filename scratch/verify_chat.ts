import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET!;
const userId = 1;
const username = 'iquick';
const eventId = 1;

const token = jwt.sign(
    { sub: userId, username, isAdmin: true },
    JWT_SECRET
);

const socket = io('http://localhost:3000', {
    auth: { token }
});

socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    socket.emit('joinRoom', { eventId });
    
    setTimeout(() => {
        console.log('Sending message...');
        socket.emit('sendMessage', {
            eventId,
            text: 'Hello from verification script!'
        });
    }, 1000);
});

socket.on('newMessage', (msg) => {
    console.log('Received newMessage:', msg);
    if (msg.text === 'Hello from verification script!') {
        console.log('SUCCESS: Message received back!');
        socket.disconnect();
        process.exit(0);
    }
});

socket.on('error', (err) => {
    console.error('Socket error:', err);
    process.exit(1);
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('Timeout waiting for message');
    process.exit(1);
}, 10000);
