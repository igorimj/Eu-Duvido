/* gameLogic.js
   Motor do jogo, autoritativo no servidor. Nao depende de WebSocket/HTTP diretamente:
   recebe (room, seat, payload) e devolve {ok, error} enquanto muta o `room`.
   server.js cuida de rotear mensagens e fazer broadcast da view apos cada mutacao.
*/
const { normalize, pickRandom, buildPool } = require('./gameData.js');

function makeRoom(code, numDuplas, duration, totalRounds){
  return {
    code,
    numDuplas: numDuplas===3?3:2,
    duration: [60,90,120].includes(duration)?duration:90,
    totalRounds: totalRounds===9?9:5,
    duplas: [0,1,2].map(()=>({ name:'', players:[{name:'',connected:false},{name:'',connected:false}], score:0, timesActive:0 })),
    createdAt: Date.now(),
    pool:null, usedIds:new Set(),
    roundNum:0,
    activeIdx:0, opponentIdx:1, refereeIdx:-1,
    apostadorIdx:0, respondenteIdx:1,
    challenge:null,
    revealQueue:[], revealStep:0, revealShown:false,
    prediction:null,
    bidCurrent:0, bidTurn:'opponent', bidLog:[],
    target:0, doubterIdx:-1,
    timeLeft:0, timerHandle:null, running:false,
    submitted:new Set(), messages:[], correctCount:0,
    screen:'lobby',
    lastRoundSummary:null
  };
}

function duplaName(room, i){
  const d = room.duplas[i];
  return (d.name && d.name.trim()) ? d.name.trim() : ('Dupla '+(i+1));
}
function playerName(room, duplaIdx, playerIdx){
  const p = room.duplas[duplaIdx].players[playerIdx];
  return (p.name && p.name.trim()) ? p.name.trim() : ('Jogador '+(playerIdx+1));
}
function seatsFilled(room){
  for(let i=0;i<room.numDuplas;i++){
    for(let j=0;j<2;j++){
      if(!room.duplas[i].players[j].name) return false;
    }
  }
  return true;
}

/* ---------- ACTIONS ---------- */

function claimSeat(room, seat, duplaIdx, playerIdx, name){
  if(room.screen!=='lobby') return {ok:false, error:'O jogo ja comecou nesta sala.'};
  if(duplaIdx<0 || duplaIdx>=room.numDuplas) return {ok:false, error:'Dupla invalida.'};
  if(playerIdx!==0 && playerIdx!==1) return {ok:false, error:'Assento invalido.'};
  const slot = room.duplas[duplaIdx].players[playerIdx];
  if(slot.name && slot.name.trim()) return {ok:false, error:'Esse assento ja foi escolhido.'};
  slot.name = (name||'').trim().slice(0,24) || ('Jogador '+(playerIdx+1));
  slot.connected = true;
  seat.duplaIdx = duplaIdx; seat.playerIdx = playerIdx;
  return {ok:true};
}

function setDuplaName(room, seat, name){
  if(room.screen!=='lobby') return {ok:false, error:'Nao da mais para renomear a dupla.'};
  if(seat.duplaIdx==null) return {ok:false, error:'Escolha um assento primeiro.'};
  room.duplas[seat.duplaIdx].name = (name||'').trim().slice(0,24);
  return {ok:true};
}

function startGame(room, seat){
  if(room.screen!=='lobby') return {ok:false, error:'O jogo ja comecou.'};
  if(seat.duplaIdx==null) return {ok:false, error:'Entre em um assento antes de iniciar.'};
  if(!seatsFilled(room)) return {ok:false, error:'Ainda faltam jogadores para ocupar os assentos.'};
  room.pool = buildPool();
  room.usedIds = new Set();
  for(let i=0;i<3;i++){ room.duplas[i].score = 0; room.duplas[i].timesActive = 0; }
  room.roundNum = 0;
  nextRound(room);
  return {ok:true};
}

function nextRound(room){
  room.roundNum += 1;
  if(room.roundNum > room.totalRounds){
    room.screen = 'final';
    return;
  }
  const r = room.roundNum;
  if(room.numDuplas===2){
    room.activeIdx = (r-1)%2;
    room.opponentIdx = 1-room.activeIdx;
    room.refereeIdx = -1;
  } else {
    room.activeIdx = (r-1)%3;
    room.opponentIdx = (room.activeIdx+1)%3;
    room.refereeIdx = (room.activeIdx+2)%3;
  }
  const activeDupla = room.duplas[room.activeIdx];
  room.apostadorIdx = activeDupla.timesActive % 2;
  room.respondenteIdx = 1-room.apostadorIdx;
  activeDupla.timesActive += 1;

  const neededDifficulty = (r%2===1) ? 'baixo' : 'medio';
  let candidates = room.pool.filter(c=>!room.usedIds.has(c.id) && c.difficulty===neededDifficulty);
  if(candidates.length===0) candidates = room.pool.filter(c=>!room.usedIds.has(c.id));
  if(candidates.length===0){ room.usedIds = new Set(); candidates = room.pool.filter(c=>c.difficulty===neededDifficulty); }
  const challenge = pickRandom(candidates);
  room.usedIds.add(challenge.id);
  room.challenge = challenge;

  room.revealQueue = [
    {duplaIdx: room.activeIdx, playerIdx: room.apostadorIdx},
    {duplaIdx: room.opponentIdx, playerIdx: null}
  ];
  room.revealStep = 0;
  room.revealShown = false;
  room.prediction = null;
  room.bidCurrent = 0; room.bidLog = [];
  room.screen = 'reveal';
}

function currentRevealStep(room){
  return room.revealQueue[room.revealStep] || null;
}
function canActOnStep(room, seat, step){
  if(!step) return false;
  if(seat.duplaIdx !== step.duplaIdx) return false;
  if(step.playerIdx!=null && seat.playerIdx !== step.playerIdx) return false;
  return true;
}

function revealShow(room, seat){
  if(room.screen!=='reveal') return {ok:false, error:'Fora da fase de previa.'};
  const step = currentRevealStep(room);
  if(!canActOnStep(room, seat, step)) return {ok:false, error:'Nao e sua vez de ver o desafio.'};
  room.revealShown = true;
  return {ok:true};
}
function revealNext(room, seat){
  if(room.screen!=='reveal') return {ok:false, error:'Fora da fase de previa.'};
  const step = currentRevealStep(room);
  if(!canActOnStep(room, seat, step)) return {ok:false, error:'Nao e sua vez.'};
  if(!room.revealShown) return {ok:false, error:'Mostre o desafio antes de continuar.'};
  room.revealStep += 1;
  room.revealShown = false;
  if(room.revealStep >= room.revealQueue.length){
    room.screen = 'predict';
  }
  return {ok:true};
}

function choosePrediction(room, seat, number){
  if(room.screen!=='predict') return {ok:false, error:'Fora da fase de aposta.'};
  if(seat.duplaIdx!==room.activeIdx || seat.playerIdx!==room.apostadorIdx) return {ok:false, error:'So quem aposta escolhe o numero.'};
  const n = parseInt(number,10);
  if(!(n>=1 && n<=20)) return {ok:false, error:'Escolha um numero entre 1 e 20.'};
  room.prediction = n;
  room.bidCurrent = n;
  room.bidTurn = 'opponent';
  room.bidLog = [duplaName(room, room.activeIdx)+' aposta '+n];
  room.screen = 'bidding';
  return {ok:true};
}

function turnDuplaIdx(room){
  return room.bidTurn==='opponent' ? room.opponentIdx : room.activeIdx;
}
function raiseBid(room, seat, number){
  if(room.screen!=='bidding') return {ok:false, error:'Fora da fase de disputa.'};
  const td = turnDuplaIdx(room);
  if(seat.duplaIdx!==td) return {ok:false, error:'Nao e a vez da sua dupla.'};
  const n = parseInt(number,10);
  if(!(n>room.bidCurrent && n<=20)) return {ok:false, error:'O numero precisa ser maior que o atual (ate 20).'};
  room.bidCurrent = n;
  room.bidLog.push(duplaName(room, td)+' aumenta para '+n);
  room.bidTurn = room.bidTurn==='opponent' ? 'active' : 'opponent';
  return {ok:true};
}
function callDoubt(room, seat){
  if(room.screen!=='bidding') return {ok:false, error:'Fora da fase de disputa.'};
  const td = turnDuplaIdx(room);
  if(seat.duplaIdx!==td) return {ok:false, error:'Nao e a vez da sua dupla.'};
  room.doubterIdx = td;
  room.target = room.bidCurrent;
  startPerformance(room);
  return {ok:true};
}

function startPerformance(room){
  room.messages = [];
  room.submitted = new Set();
  room.correctCount = 0;
  room.timeLeft = room.duration;
  room.running = true;
  room.screen = 'performance';
}

function isJudgeSeat(room, seat){
  if(room.numDuplas===2) return seat.duplaIdx===room.opponentIdx;
  return seat.duplaIdx===room.refereeIdx;
}

function submitAnswer(room, seat, rawText){
  if(room.screen!=='performance' || !room.running) return {ok:false, error:'Fora da fase de resposta.'};
  if(seat.duplaIdx!==room.activeIdx || seat.playerIdx!==room.respondenteIdx) return {ok:false, error:'Somente o respondente digita respostas.'};
  const raw = (rawText||'').slice(0,60);
  const norm = normalize(raw);
  if(!norm) return {ok:false, error:'Resposta vazia.'};
  const ch = room.challenge;
  let status;
  if(room.submitted.has(norm)){
    status = 'duplicate';
  } else if(ch.hasLetter && !norm.startsWith(ch.letter)){
    status = 'invalid';
  } else if(ch.dictSet.has(norm)){
    status = 'correct';
  } else {
    status = 'pending';
  }
  const msg = { text: raw, norm, status, badge:null };
  if(status==='correct'){
    room.correctCount += 1;
    msg.badge = room.correctCount;
    room.submitted.add(norm);
  }
  room.messages.push(msg);
  return {ok:true};
}

function judgeMessage(room, seat, index, accept){
  if(room.screen!=='performance') return {ok:false, error:'Fora da fase de resposta.'};
  if(!isJudgeSeat(room, seat)) return {ok:false, error:'Voce nao pode validar respostas nesta rodada.'};
  const m = room.messages[index];
  if(!m || m.status!=='pending') return {ok:false, error:'Nada para validar aqui.'};
  if(accept){
    m.status = 'correct';
    room.correctCount += 1;
    m.badge = room.correctCount;
    room.submitted.add(m.norm);
  } else {
    m.status = 'invalid';
  }
  return {ok:true};
}

function endPerformance(room){
  if(room.screen!=='performance') return {ok:false, error:'Fora da fase de resposta.'};
  if(room.timerHandle){ clearInterval(room.timerHandle); room.timerHandle=null; }
  room.running = false;
  const hasPending = room.messages.some(m=>m.status==='pending');
  if(hasPending) return {ok:true, blocked:true};
  finishRound(room);
  return {ok:true};
}

function finishRound(room){
  const activeWins = room.correctCount >= room.target;
  const winnerIdx = activeWins ? room.activeIdx : room.doubterIdx;
  room.duplas[winnerIdx].score += 1;
  room.lastRoundSummary = { activeWins, winnerIdx, correctCount: room.correctCount, target: room.target };
  room.screen = 'roundResult';
}

function goNextRound(room){
  if(room.screen!=='roundResult') return {ok:false, error:'Ainda nao acabou a rodada.'};
  nextRound(room);
  return {ok:true};
}

function restartGame(room){
  room.pool = null; room.usedIds = new Set();
  room.roundNum = 0;
  for(let i=0;i<3;i++){ room.duplas[i].score=0; room.duplas[i].timesActive=0; }
  room.screen = 'lobby';
  room.challenge = null; room.messages = []; room.correctCount = 0;
  room.lastRoundSummary = null;
  return {ok:true};
}

/* ---------- VIEW BUILDER (visibilidade por assento) ---------- */

function buildClientView(room, seat){
  const seated = seat.duplaIdx!=null;
  const base = {
    code: room.code,
    screen: room.screen,
    numDuplas: room.numDuplas,
    totalRounds: room.totalRounds,
    duration: room.duration,
    roundNum: room.roundNum,
    scores: [...Array(room.numDuplas)].map((_,i)=>({name:duplaName(room,i), score:room.duplas[i].score})),
    you: seated ? { duplaIdx: seat.duplaIdx, playerIdx: seat.playerIdx, name: playerName(room, seat.duplaIdx, seat.playerIdx) } : null
  };

  if(room.screen==='lobby'){
    base.seats = [...Array(room.numDuplas)].map((_,i)=>({
      idx:i, name: duplaName(room,i),
      players: room.duplas[i].players.map((p,j)=>({idx:j, name:p.name, taken: !!(p.name && p.name.trim())}))
    }));
    base.allFilled = seatsFilled(room);
    return base;
  }
  if(room.screen==='final'){
    base.ranking = [...Array(room.numDuplas)].map((_,i)=>({name:duplaName(room,i), score:room.duplas[i].score}))
      .sort((a,b)=>b.score-a.score);
    return base;
  }

  base.activeName = duplaName(room, room.activeIdx);
  base.opponentName = duplaName(room, room.opponentIdx);
  base.refereeName = room.refereeIdx>=0 ? duplaName(room, room.refereeIdx) : null;
  base.apostadorName = playerName(room, room.activeIdx, room.apostadorIdx);
  base.respondenteName = playerName(room, room.activeIdx, room.respondenteIdx);
  base.difficulty = room.challenge ? room.challenge.difficulty : null;

  if(room.screen==='reveal'){
    const step = currentRevealStep(room);
    base.canReveal = canActOnStep(room, seat, step) && !room.revealShown;
    base.canAdvance = canActOnStep(room, seat, step) && room.revealShown;
    const iSeeIt = canActOnStep(room, seat, step) && room.revealShown;
    base.challengeText = iSeeIt ? room.challenge.text : null;
    base.revealWhoName = step ? (step.playerIdx!=null ? playerName(room, step.duplaIdx, step.playerIdx) : duplaName(room, step.duplaIdx)) : null;
    return base;
  }
  if(room.screen==='predict'){
    base.canPredict = (seat.duplaIdx===room.activeIdx && seat.playerIdx===room.apostadorIdx);
    return base;
  }
  if(room.screen==='bidding'){
    const td = turnDuplaIdx(room);
    base.bidCurrent = room.bidCurrent;
    base.bidLog = room.bidLog[room.bidLog.length-1];
    base.turnName = duplaName(room, td);
    base.canAct = seat.duplaIdx===td;
    return base;
  }
  if(room.screen==='performance'){
    base.challengeText = room.challenge.text;
    base.timeLeft = room.timeLeft;
    base.target = room.target;
    base.correctCount = room.correctCount;
    base.canSubmit = (seat.duplaIdx===room.activeIdx && seat.playerIdx===room.respondenteIdx);
    base.canJudge = isJudgeSeat(room, seat);
    base.messages = room.messages.map(m=>({text:m.text, status:m.status, badge:m.badge}));
    return base;
  }
  if(room.screen==='roundResult'){
    base.summary = room.lastRoundSummary;
    return base;
  }
  return base;
}

module.exports = {
  makeRoom, claimSeat, setDuplaName, startGame,
  revealShow, revealNext, choosePrediction, raiseBid, callDoubt,
  submitAnswer, judgeMessage, endPerformance, goNextRound, restartGame,
  buildClientView, duplaName, playerName, seatsFilled
};
