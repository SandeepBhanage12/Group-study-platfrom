require('dotenv').config();
const express = require("express");
const https = require("https");
const path = require('path')
const http = require("http");
const app = express();
const fs = require('fs');
app.use(express.static(__dirname))

const cors = require('cors')

let server;

const socket = require("socket.io");

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
  } else {
    app.use(express.static(__dirname));
  }

app.use(cors());
app.use(express.json());

const useHttps = process.env.USE_HTTPS === 'true';

if (useHttps) {
  const key = fs.readFileSync('cert.key');
  const cert = fs.readFileSync('cert.crt');
  server = https.createServer({ key, cert }, app);
} else {
  server = http.createServer(app);
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
  

const io = socket(server, {
    cors: {
        origin: [
            // "https://localhost",
            // "https://192.168.29.188"
            "*"
        ],
        methods:["GET", "POST"]
    }
});

const users = {};

app.post("/get-rooms", async(req, res)=>{
    res.send(users);
})

const socketToRoom = {};
const socketToEmail = {};

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
            
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    }); 

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });


    socket.on("send message", ({ roomID, message, from }) => {
        users[roomID].forEach(async userSocketId => {
            if(userSocketId!=socket.id){                
                io.to(userSocketId).emit('receive message', {from: from||"Unknown", message});
            }
        });
    });


    function removeSocketIdFromRoom(){
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        
        if(users[roomID]){
            users[roomID].forEach(userSocketId => {
                io.to(userSocketId).emit('remove user', socket.id);
            });
        }
    }

    socket.on('leave room', ()=>{
        removeSocketIdFromRoom();
    })

    socket.on('tell everyone that i arrived', async({name, roomID}) => {
        socketToEmail[socket.id] = name;
        
        if(users[roomID]){
            const user = name;
            users[roomID].forEach(userSocketId => {
                io.to(userSocketId).emit('user broadcasting his name', name||"unknown");
            });
        }
    })

    socket.on('disconnect', () => {
        removeSocketIdFromRoom();
    });

});


const PORT = process.env.PORT || 8181;
server.listen(PORT, "0.0.0.0", () => console.log(`server is running on port ${PORT}`));