const express = require('express');
const app = express();

const port = 4000;

const http = require('http');
const server = http.createServer(app);

const io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile('public/index.html', { root: __dirname });
});

app.get('/:id', function (req, res) {
  res.sendFile('public/index.html', { root: __dirname });
})

// maps a socket id to an object representing a player
const players = {};
// maps an id to an object representing the game session (i.e. game match)
const sessions = {}
// matchmaking queue
const sessionQ = [];
// ids used for sessions
let sessionId = 1;

io.on('connectoin', function (socket) {
  console.log(`${socket.id} joined`);

  players[socket.id] = {
    socket: socket,
    sessionId: null,
    rtcReady: false,
  }

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
        sessionQ = sessionQ.filter(session => session['id'] != playerSession['id'])
      }
    }

    delete players[socket.id];

  });

  socket.on('playCard', function (cardValue) {
    const playerSessionId = players[socket.id].sessionId;
    var playerSession = sessions[playerSessionId];

    console.log(playerSession);

    const turnResult = {
      winner: null,
      player: null,
      isEven: null,
      nextTurn: null,
    };

    turnResult.player = socket.id;
    turnResult.isEven = (cardValue % 2) == 0;

    if (!playerSession.lastPlayed) {
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

    playerSession.players.array.forEach(playerId => {
      players[playerId].socket.emit('turnUpdate', turnResult);
    });
  });

  socket.on('rtcReady', function () {
    players[socket.id].rtcReady = true;

    session_id = players[socket.id]['sessionId'];

    if (session_id) {
      session = session[session_id];

      if (session.players.length == 2) {
        p0Socket = players[session.players[0]].socket;
        p1Socket = players[session.players[1]].socket;

        if (players[p0Socket].rtcReady && players[p1Socket.id].rtcReady) {
          p0Socket.emit('connectToRtc', p1Socket.id);
          p1Socket.emit('connectToRtc', p0Socket.id);
        }
      }
    }
  });

  socket.on('offer', (to, message) => {
    socket.to(to).emit('offer', socket.id, message);
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

  const session = sessionQ.shift();

  if (session) {
    session.players.push(socket.id);

    players[socket.id].sessionId = session.id;

    console.log('joining session');
    console.log(session);
    console.log(players);

    const p0Socket = players[session.players[0]].socket;
    const p1Socket = socket;

    p0Socket.emit('foundGame', { myTurn: 0 });
    p1Socket.emit('foundGame', { myTurn: 1 });

    if (players[p0Socket.id].rtcReady && players[p1Socket.id].rtcReady) {
      p0Socket.emit('connectToRtc', p1Socket.id);
      p1Socket.emit('connectToRtc', p0Socket.id);
    }

  } else {
    const playerSessionId = sessionId++;

    const session = {
      id: playerSessionId,
      players: [socket.id],
      lastPlayed: null,
      currentTurn: 0,
    };

    players[socket.id].sessionId = playerSessionId;

    sessions[playerSessionId] = session;

    sessionQ.push(session);
  }
});

server.listen(process.env.PORT || port, () => {
  console.log(`Server is running on port ${port}`)
});
