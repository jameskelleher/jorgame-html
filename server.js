const express = require('express');
const app = express();

const port = 4000;

const http = require('http');
const { start } = require('repl');
const server = http.createServer(app);

const io = require('socket.io')(server);

const { v4: uuidv4 } = require('uuid');

const axios = require('axios');

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile('public/index.html', { root: __dirname });
});

app.get('/public', function (req, res) {
  res.sendFile('public/game.html', { root: __dirname })
})

app.get('/private', function (req, res) {
  res.sendFile('public/game.html', { root: __dirname })
})

app.get('/:id', function (req, res) {
  res.sendFile('public/game.html', { root: __dirname });
})

// maps a socket id to an object representing a player
const players = {};
// maps an id to an object representing the game session (i.e. game match)
const sessions = {}
// matchmaking queue
let sessionQ = [];

class RtcConfigHandler {
  constructor() {
    this.updated = null;
    this.timeoutSec = 60;
    this.latestRtcConfig = null;
  }

  get rtcConfigPromise() {
    if (!this.latestRtcConfig || (Date.now() - this.updated) / 1000 > this.timeoutSec - 5) {
      return this.updateRtcConfig();
    } else {
      return new Promise((res, rej) => res(this.latestRtcConfig));
    }
  }

  updateRtcConfig() {
    const env = process.env;
    return axios({
      method: 'put',
      url: `https://${env.XIRSYS_USERNAME}:${env.XIRSYS_SECRET}@global.xirsys.net/_turn/${env.XIRSYS_APP_NAME}`,
      headers: { 'Content-type': 'application/json' },
      data: { format: 'urls', expire: "60" }
    }).then(res => {
      console.log('updated rtcConfig');
      this.updated = Date.now();
      this.latestRtcConfig = { iceServers: [res.data.v.iceServers] };
      return this.latestRtcConfig;
    }).catch(error => {
      console.log(error)
    })
  }
}

const rtcConfigHandler = new RtcConfigHandler();

io.on('connection', function (socket) {
  console.log(`${socket.id} joined`);

  players[socket.id] = {
    socket: socket,
    sessionId: null,
    rtcReady: false,
  }

  socket.on('joinGame', loc => {
    if (loc === 'public') {
      addToPublicSession(socket)
    } else {
      addToPrivateSession(socket, loc);
    }
  });

  socket.on('disconnect', function () {
    console.log(`${socket.id} disconnected`);

    const playerSessionId = players[socket.id].sessionId;
    const playerSession = sessions[playerSessionId];

    if (playerSession) {
      playerSession.players = playerSession.players.filter(socketId => socketId != socket.id);

      if (playerSession.players.length > 0) {
        // add the session back into the matchmaking queue
        players[playerSession.players[0]].socket.emit('opponentDisconnect');

        // scrub the session before putting it back into the queue
        playerSession.lastPlayed = null;
        playerSession.currentTurn = 0;
        sessionQ.push(playerSession);
      } else {
        // remove the session from the matchmaking queue
        // this happens when a player waiting for an opponent disconnects
        // TODO: change this so sessionQ can be a const
        sessionQ = sessionQ.filter(session => session['id'] != playerSession['id'])
        delete sessions[playerSessionId];
      }
    }

    delete players[socket.id];

  });

  socket.on('playCard', function (cardValue) {
    const playerSessionId = players[socket.id].sessionId;
    var playerSession = sessions[playerSessionId];

    const turnResult = {
      winner: null,
      player: null,
      isEven: null,
      nextTurn: null,
    };

    turnResult.player = socket.id;
    turnResult.isEven = (cardValue % 2) == 0;

    if (playerSession.lastPlayed === null) {
      // first turn in the round has been played
      turnResult.nextTurn = (playerSession.currentTurn + 1) % 2;
      playerSession.lastPlayed = cardValue;
    } else {
      // second turn in the round has been played
      if (cardValue > playerSession.lastPlayed) {
        turnResult.nextTurn = playerSession.currentTurn;
        turnResult.winner = socket.id;
      } else if (cardValue < playerSession.lastPlayed) {
        turnResult.nextTurn = (playerSession.currentTurn + 1) % 2;
        turnResult.winner = playerSession.players[turnResult.nextTurn];
      } else {
        turnResult.nextTurn = (playerSession.currentTurn + 1) % 2;
        turnResult.winner = 'tie';
      }

      playerSession.lastPlayed = null;
    }

    playerSession.currentTurn = turnResult.nextTurn;

    playerSession.players.forEach(playerId => {
      players[playerId].socket.emit('turnUpdate', turnResult);
    });
  });

  socket.on('rtcReady', function (isReady) {
    players[socket.id].rtcReady = isReady;

    if (!isReady) return;

    console.log(`${socket.id} is rtcReady`);

    session_id = players[socket.id]['sessionId'];

    if (session_id) {
      var session = sessions[session_id];

      if (session.players.length == 2) {
        p0Socket = players[session.players[0]].socket;
        p1Socket = players[session.players[1]].socket;

        if (players[p0Socket.id].rtcReady && players[p1Socket.id].rtcReady) {
          rtcConfigHandler.rtcConfigPromise.then(rtcConfig => {
            p0Socket.emit('connectToRtc', p1Socket.id, rtcConfig);
            p1Socket.emit('connectToRtc', p0Socket.id, rtcConfig);
          })
        }
      }
    }
  });

  socket.on('offer', (to, message) => {
    rtcConfigHandler.rtcConfigPromise.then(config => {
      socket.to(to).emit('offer', socket.id, message, config);
    })
  });

  socket.on('answer', (to, message) => {
    socket.to(to).emit('answer', socket.id, message);
  });

  socket.on('outboundCandidate', (to, message) => {
    socket.to(to).emit('outboundCandidate', socket.id, message);
  });

  socket.on('inboundCandidate', (to, message) => {
    socket.to(to).emit('inboundCandidate', socket.id, message);
  });
});

function addToPublicSession(socket) {
  var session = sessionQ.shift();

  console.log(session);

  if (session) {
    addPlayerToSession(socket.id, session);
    startGame(session);
  } else {
    const newSessionId = uuidv4();
    const newSession = initNewSession(socket, newSessionId, public = true);
    console.log(`pushing session ${newSession.id} to the public session queue`);
    pushSessionToQueue(newSession);
  }
}

function addToPrivateSession(socket, sessionId) {
  if (sessionId in sessions) {
    const session = sessions[sessionId];
    if (session.players.length === 2) {
      socket.emit('sessionFull');
      return;
    } else {
      addPlayerToSession(socket.id, session);
      initVidChat(session);
      startGame(session);
    }
  } else {
    initNewSession(socket, sessionId);
  }
}

function initVidChat(session) {
  players[session.players[0]].socket.emit('initVidChat');
  players[session.players[1]].socket.emit('initVidChat');
}

function initNewSession(socket, newSessionId = null, public = false) {
  const newSession = createSession(newSessionId);
  addPlayerToSession(socket.id, newSession);

  return newSession
}

function createSession(newSessionId) {
  const newSession = {
    id: newSessionId,
    players: [],
    lastPlayed: null,
    currentTurn: 0,
  };

  sessions[newSessionId] = newSession;

  return newSession;
}

function addPlayerToSession(socketId, session) {
  session.players.push(socketId);
  players[socketId].sessionId = session.id;
}

function pushSessionToQueue(session) {
  sessionQ.push(session);
}

function startGame(session) {
  const p0Socket = players[session.players[0]].socket;
  const p1Socket = players[session.players[1]].socket;

  p0Socket.emit('foundGame', { myTurn: 0 });
  p1Socket.emit('foundGame', { myTurn: 1 });

  if (players[p0Socket.id].rtcReady && players[p1Socket.id].rtcReady) {
    rtcConfigHandler.rtcConfigPromise.then(rtcConfig => {
      p0Socket.emit('connectToRtc', p1Socket.id, rtcConfig);
      p1Socket.emit('connectToRtc', p0Socket.id, rtcConfig);
    })
  }
}

server.listen(process.env.PORT || port, () => {
  console.log(`Server is running on port ${port}`)
});