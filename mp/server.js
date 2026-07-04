const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const GL = require('./gameLogic.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };

const rooms = new Map(); // code -> room

function generateCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({length:5}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  } while(rooms.has(code));
  return code;
}

function serveStatic(req, res){
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if(reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);
  if(!filePath.startsWith(PUBLIC_DIR)){
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data)=>{
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('Nao encontrado');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocket.Server({ server });

function broadcastRoom(room){
  room.sockets.forEach(ws=>{
    if(ws.readyState === WebSocket.OPEN){
      const view = GL.buildClientView(room, ws.seat);
      ws.send(JSON.stringify({type:'state', payload: view}));
    }
  });
}
function sendError(ws, message){
  if(ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify({type:'error', message}));
  }
}

function startTimer(room){
  if(room.timerHandle) return;
  room.timerHandle = setInterval(()=>{
    room.timeLeft -= 1;
    if(room.timeLeft <= 0){
      room.timeLeft = 0;
      clearInterval(room.timerHandle);
      room.timerHandle = null;
      GL.endPerformance(room);
    }
    broadcastRoom(room);
  }, 1000);
}

wss.on('connection', (ws)=>{
  ws.seat = { duplaIdx: null, playerIdx: null };
  ws.roomCode = null;

  ws.on('message', (raw)=>{
    let msg;
    try{ msg = JSON.parse(raw); } catch(e){ return; }

    if(msg.type === 'createRoom'){
      const code = generateCode();
      const room = GL.makeRoom(code, msg.numDuplas, msg.duration, msg.totalRounds);
      room.sockets = new Set([ws]);
      rooms.set(code, room);
      ws.roomCode = code;
      ws.send(JSON.stringify({type:'roomCreated', code}));
      broadcastRoom(room);
      return;
    }

    if(msg.type === 'joinRoom'){
      const code = (msg.code||'').toUpperCase().trim();
      const room = rooms.get(code);
      if(!room){ sendError(ws, 'Sala nao encontrada. Confira o codigo.'); return; }
      room.sockets.add(ws);
      ws.roomCode = code;
      ws.send(JSON.stringify({type:'roomCreated', code}));
      broadcastRoom(room);
      return;
    }

    if(msg.type === 'rejoin'){
      const code = (msg.code||'').toUpperCase().trim();
      const room = rooms.get(code);
      if(!room){ sendError(ws, 'Sala nao encontrada. Ela pode ter expirado.'); return; }
      room.sockets.add(ws);
      ws.roomCode = code;
      const d = room.duplas[msg.duplaIdx];
      if(d && d.players[msg.playerIdx] && d.players[msg.playerIdx].name){
        ws.seat.duplaIdx = msg.duplaIdx;
        ws.seat.playerIdx = msg.playerIdx;
        d.players[msg.playerIdx].connected = true;
      }
      ws.send(JSON.stringify({type:'roomCreated', code}));
      broadcastRoom(room);
      return;
    }

    const room = rooms.get(ws.roomCode);
    if(!room){ sendError(ws, 'Voce nao esta em uma sala.'); return; }

    let res;
    switch(msg.type){
      case 'claimSeat':
        res = GL.claimSeat(room, ws.seat, msg.duplaIdx, msg.playerIdx, msg.name);
        break;
      case 'setDuplaName':
        res = GL.setDuplaName(room, ws.seat, msg.name);
        break;
      case 'startGame':
        res = GL.startGame(room, ws.seat);
        break;
      case 'revealShow':
        res = GL.revealShow(room, ws.seat);
        break;
      case 'revealNext':
        res = GL.revealNext(room, ws.seat);
        break;
      case 'choosePrediction':
        res = GL.choosePrediction(room, ws.seat, msg.number);
        break;
      case 'raiseBid':
        res = GL.raiseBid(room, ws.seat, msg.number);
        break;
      case 'callDoubt':
        res = GL.callDoubt(room, ws.seat);
        if(res.ok && room.screen==='performance') startTimer(room);
        break;
      case 'submitAnswer':
        res = GL.submitAnswer(room, ws.seat, msg.text);
        break;
      case 'judgeMessage':
        res = GL.judgeMessage(room, ws.seat, msg.index, msg.accept);
        break;
      case 'endPerformance':
        res = GL.endPerformance(room);
        break;
      case 'nextRound':
        res = GL.goNextRound(room);
        break;
      case 'restartGame':
        res = GL.restartGame(room);
        break;
      default:
        return;
    }

    if(res && res.ok){
      broadcastRoom(room);
    } else if(res && res.error){
      sendError(ws, res.error);
    }
  });

  ws.on('close', ()=>{
    const room = rooms.get(ws.roomCode);
    if(!room) return;
    room.sockets.delete(ws);
    if(ws.seat.duplaIdx!=null){
      const p = room.duplas[ws.seat.duplaIdx].players[ws.seat.playerIdx];
      if(p) p.connected = false;
      broadcastRoom(room);
    }
  });
});

// limpeza de salas abandonadas (sem nenhuma conexao ha mais de 30 min)
setInterval(()=>{
  const now = Date.now();
  for(const [code, room] of rooms){
    if(room.sockets.size===0 && (now-room.createdAt) > 30*60*1000){
      if(room.timerHandle) clearInterval(room.timerHandle);
      rooms.delete(code);
    }
  }
}, 5*60*1000);

server.listen(PORT, ()=>{
  console.log('Eu Duvido multiplayer rodando na porta '+PORT);
});

module.exports = { wss, rooms, server };
