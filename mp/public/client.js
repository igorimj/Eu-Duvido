/* client.js — renderizador fino: toda a autoridade do jogo fica no servidor.
   Este arquivo so conecta via WebSocket, manda acoes e desenha o que o servidor manda. */

let ws = null;
let serverState = null;
let homeView = 'menu'; // 'menu' | 'create' | 'join'
let createCfg = { numDuplas:2, duration:90, totalRounds:5 };
let claimingSeat = null; // {duplaIdx, playerIdx}
let seatNameDraft = '';
let joinCodeDraft = '';
let toastMsg = null;
let toastTimer = null;
let connStatus = 'idle'; // idle | connecting | open | closed

const STORAGE_KEY = 'euduvido_seat_v1';

function wsUrl(){
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return proto + '://' + location.host;
}

function connect(onOpen){
  connStatus = 'connecting';
  ws = new WebSocket(wsUrl());
  ws.onopen = ()=>{ connStatus='open'; render(); if(onOpen) onOpen(); };
  ws.onmessage = (ev)=>{
    let msg;
    try{ msg = JSON.parse(ev.data); } catch(e){ return; }
    if(msg.type === 'roomCreated'){
      // nada especial aqui, o estado completo vem em 'state'
    } else if(msg.type === 'error'){
      showToast(msg.message);
    } else if(msg.type === 'state'){
      serverState = msg.payload;
      if(serverState.you){
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          code: serverState.code, duplaIdx: serverState.you.duplaIdx, playerIdx: serverState.you.playerIdx
        }));
      }
      render();
    }
    render();
  };
  ws.onclose = ()=>{
    connStatus = 'closed';
    render();
  };
  ws.onerror = ()=>{};
}

function send(obj){
  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify(obj));
  }
}

function showToast(msg){
  toastMsg = msg;
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ toastMsg=null; render(); }, 3200);
  render();
}

/* ============ AÇÕES DE TELA INICIAL ============ */
function goCreate(){ homeView='create'; render(); }
function goJoin(){ homeView='join'; render(); }
function backToMenu(){ homeView='menu'; render(); }
function setCfgNumDuplas(n){ createCfg.numDuplas=n; render(); }
function setCfgDuration(d){ createCfg.duration=d; render(); }
function setCfgRounds(n){ createCfg.totalRounds=n; render(); }

function submitCreate(){
  connect(()=>{
    send({type:'createRoom', numDuplas:createCfg.numDuplas, duration:createCfg.duration, totalRounds:createCfg.totalRounds});
  });
}
function submitJoin(){
  const code = (joinCodeDraft||'').trim().toUpperCase();
  if(!code){ showToast('Digite o codigo da sala.'); return; }
  connect(()=>{
    send({type:'joinRoom', code});
  });
}
function updateJoinCode(v){ joinCodeDraft = v; }

/* ============ LOBBY ============ */
function startClaimSeat(duplaIdx, playerIdx){
  claimingSeat = {duplaIdx, playerIdx};
  seatNameDraft = '';
  render();
}
function cancelClaimSeat(){ claimingSeat=null; render(); }
function updateSeatNameDraft(v){ seatNameDraft = v; }
function confirmClaimSeat(){
  if(!claimingSeat) return;
  send({type:'claimSeat', duplaIdx:claimingSeat.duplaIdx, playerIdx:claimingSeat.playerIdx, name:seatNameDraft});
  claimingSeat = null;
}
function doStartGame(){ send({type:'startGame'}); }

/* ============ JOGO ============ */
function doRevealShow(){ send({type:'revealShow'}); }
function doRevealNext(){ send({type:'revealNext'}); }
function doChoosePrediction(n){ send({type:'choosePrediction', number:n}); }
function doRaiseBid(n){ send({type:'raiseBid', number:n}); }
function doCallDoubt(){ send({type:'callDoubt'}); }
function doSubmitAnswer(){
  const inp = document.getElementById('chatInput');
  if(!inp) return;
  const v = inp.value;
  inp.value = '';
  if(!v.trim()) return;
  send({type:'submitAnswer', text:v});
}
function doJudge(idx, accept){ send({type:'judgeMessage', index:idx, accept}); }
function doEndPerformance(){ send({type:'endPerformance'}); }
function doNextRound(){ send({type:'nextRound'}); }
function doRestart(){ send({type:'restartGame'}); }

function leaveRoom(){
  localStorage.removeItem(STORAGE_KEY);
  if(ws) ws.close();
  ws = null; serverState = null; connStatus='idle'; homeView='menu';
  render();
}

/* ============ RECONEXAO AUTOMATICA ============ */
(function tryAutoRejoin(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return;
  let data;
  try{ data = JSON.parse(saved); } catch(e){ return; }
  if(!data || !data.code) return;
  connect(()=>{
    send({type:'rejoin', code:data.code, duplaIdx:data.duplaIdx, playerIdx:data.playerIdx});
  });
})();

/* ============ RENDER ============ */
function render(){
  const app = document.getElementById('app');
  let html = '<div class="brand"><h1>EU DUVIDO</h1><span class="dot">?</span></div>';

  if(toastMsg){ html += '<div class="toast">'+escapeHtml(toastMsg)+'</div>'; }

  if(!serverState){
    if(connStatus==='connecting'){
      html += '<div class="card"><div class="waiting-box"><div class="spin">Conectando…</div></div></div>';
    } else if(connStatus==='closed'){
      html += '<div class="card"><div class="waiting-box"><div class="spin">Conexão perdida</div><p>Verifique sua internet e tente novamente.</p></div><button class="btn btn-primary" onclick="location.reload()">Recarregar</button></div>';
    } else {
      html += renderHome();
    }
    app.innerHTML = html;
    return;
  }

  if(serverState.screen !== 'lobby' && serverState.screen !== 'final'){
    html += renderScorebar();
  }

  switch(serverState.screen){
    case 'lobby': html += renderLobby(); break;
    case 'reveal': html += renderReveal(); break;
    case 'predict': html += renderPredict(); break;
    case 'bidding': html += renderBidding(); break;
    case 'performance': html += renderPerformance(); break;
    case 'roundResult': html += renderRoundResult(); break;
    case 'final': html += renderFinal(); break;
  }
  app.innerHTML = html;

  if(serverState.screen==='performance'){
    const box = document.getElementById('chatBox');
    if(box) box.scrollTop = box.scrollHeight;
  }
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderHome(){
  if(homeView==='create'){
    let s = '<div class="card"><p class="eyebrow">Nova partida</p><h2 class="section-title">Configure a sala</h2>';
    s += '<label class="field-label">Número de duplas</label><div class="choice-row">';
    [2,3].forEach(n=>{ s += '<div class="choice-btn'+(createCfg.numDuplas===n?' active':'')+'" onclick="setCfgNumDuplas('+n+')">'+n+' duplas</div>'; });
    s += '</div>';
    s += '<label class="field-label">Duração de cada rodada</label><div class="choice-row">';
    [[60,'1:00'],[90,'1:30'],[120,'2:00']].forEach(d=>{ s += '<div class="choice-btn'+(createCfg.duration===d[0]?' active':'')+'" onclick="setCfgDuration('+d[0]+')">'+d[1]+'</div>'; });
    s += '</div>';
    s += '<label class="field-label">Número de rodadas</label><div class="choice-row">';
    [5,9].forEach(n=>{ s += '<div class="choice-btn'+(createCfg.totalRounds===n?' active':'')+'" onclick="setCfgRounds('+n+')">'+n+' rodadas</div>'; });
    s += '</div>';
    s += '<button class="btn btn-primary" onclick="submitCreate()">Criar sala</button>';
    s += '<button class="btn btn-ghost" onclick="backToMenu()">Voltar</button>';
    s += '</div>';
    return s;
  }
  if(homeView==='join'){
    let s = '<div class="card"><p class="eyebrow">Entrar em partida</p><h2 class="section-title">Digite o código da sala</h2>';
    s += '<input type="text" placeholder="Ex: 7F3KQ" style="text-transform:uppercase" oninput="updateJoinCode(this.value)">';
    s += '<button class="btn btn-primary" onclick="submitJoin()">Entrar</button>';
    s += '<button class="btn btn-ghost" onclick="backToMenu()">Voltar</button>';
    s += '</div>';
    return s;
  }
  let s = '<div class="card"><p class="eyebrow">Multiplayer em tempo real</p><h2 class="section-title">Cada dupla no seu próprio celular</h2>';
  s += '<p class="hint">Uma pessoa cria a sala e compartilha o código. Todo mundo entra pelo próprio aparelho e escolhe seu assento.</p>';
  s += '<button class="btn btn-primary" onclick="goCreate()">Criar sala</button>';
  s += '<button class="btn btn-ghost" onclick="goJoin()">Entrar em sala</button>';
  s += '</div>';
  return s;
}

function renderScorebar(){
  const st = serverState;
  let s = '<div class="round-tag">RODADA '+st.roundNum+' DE '+st.totalRounds+'</div><div class="scorebar">';
  st.scores.forEach((d,i)=>{
    const isActive = st.activeName!==undefined && d.name===st.activeName && st.screen!=='roundResult';
    s += '<div class="score-chip'+(isActive?' active-chip':'')+'"><div class="nm">'+escapeHtml(d.name)+'</div><div class="pts">'+d.score+'</div></div>';
  });
  s += '</div>';
  return s;
}

function renderLobby(){
  const st = serverState;
  let s = '<div class="card"><p class="eyebrow">Sala criada</p>';
  s += '<div class="room-code-box"><div class="code">'+st.code+'</div><p class="hint">Compartilhe esse código com os outros jogadores.</p></div>';
  s += '<div class="seat-grid">';
  st.seats.forEach(dupla=>{
    s += '<div class="dupla-seats"><div class="dupla-title-row"><span class="dupla-title">'+escapeHtml(dupla.name)+'</span></div><div class="seat-row">';
    dupla.players.forEach(p=>{
      const isMine = st.you && st.you.duplaIdx===dupla.idx && st.you.playerIdx===p.idx;
      const isClaiming = claimingSeat && claimingSeat.duplaIdx===dupla.idx && claimingSeat.playerIdx===p.idx;
      if(isClaiming){
        s += '<div class="seat-slot"><input type="text" placeholder="Seu nome" style="margin-bottom:6px" oninput="updateSeatNameDraft(this.value)" onkeydown="if(event.key==\'Enter\'){confirmClaimSeat();}"><div style="display:flex;gap:4px;"><button class="btn btn-primary btn-sm" style="flex:1" onclick="confirmClaimSeat()">Entrar</button><button class="btn btn-ghost btn-sm" onclick="cancelClaimSeat()">✕</button></div></div>';
      } else if(p.taken){
        s += '<div class="seat-slot taken'+(isMine?' mine':'')+'">'+escapeHtml(p.name)+(isMine?' (você)':'')+'</div>';
      } else {
        s += '<div class="seat-slot" onclick="startClaimSeat('+dupla.idx+','+p.idx+')">Assento livre<br><span style="color:var(--gold)">toque para entrar</span></div>';
      }
    });
    s += '</div></div>';
  });
  s += '</div>';
  if(st.allFilled){
    s += '<button class="btn btn-primary" onclick="doStartGame()">Iniciar jogo</button>';
  } else {
    s += '<div class="waiting-box"><div class="spin">Aguardando jogadores…</div></div>';
  }
  s += '<button class="btn btn-ghost" onclick="leaveRoom()">Sair da sala</button>';
  s += '</div>';
  return s;
}

function renderReveal(){
  const st = serverState;
  let s = '<div class="card"><p class="eyebrow">Prévia do desafio</p>';
  s += '<div class="reveal-box"><div class="who">'+escapeHtml(st.revealWhoName)+'</div>';
  if(st.canReveal){
    s += '<p class="hint">O respondente não deve ver a tela agora.</p>';
    s += '<div class="challenge-hidden">🔒 Desafio oculto</div>';
    s += '<button class="btn btn-primary" onclick="doRevealShow()">Estou pronto — mostrar desafio</button>';
  } else if(st.canAdvance){
    s += '<div class="diff-tag diff-'+st.difficulty+'">Dificuldade: '+(st.difficulty==='baixo'?'Baixa':'Média')+'</div>';
    s += '<div class="challenge-text">'+escapeHtml(st.challengeText)+'</div>';
    s += '<button class="btn btn-primary" onclick="doRevealNext()">Já vi — esconder e continuar</button>';
  } else {
    s += '<div class="waiting-box"><div class="spin">Aguardando '+escapeHtml(st.revealWhoName)+'…</div></div>';
  }
  s += '</div></div>';
  return s;
}

function renderPredict(){
  const st = serverState;
  let s = '<div class="card"><p class="eyebrow">Aposta inicial</p>';
  if(st.canPredict){
    s += '<h2 class="section-title">Quantos acertos o seu parceiro vai ter?</h2>';
    s += '<p class="hint">Escolha um número de 1 a 20.</p>';
  } else {
    s += '<h2 class="section-title">Aguardando aposta de '+escapeHtml(st.apostadorName)+'</h2>';
    s += '<p class="hint">Você pode acompanhar, mas só '+escapeHtml(st.apostadorName)+' escolhe o número.</p>';
  }
  s += '<div class="challenge-hidden">🔒 Desafio secreto ('+(st.difficulty==='baixo'?'dificuldade baixa':'dificuldade média')+')</div>';
  s += '<div class="num-grid">';
  for(let n=1;n<=20;n++){
    if(st.canPredict){ s += '<div class="num-btn" onclick="doChoosePrediction('+n+')">'+n+'</div>'; }
    else { s += '<div class="num-btn disabled">'+n+'</div>'; }
  }
  s += '</div>';
  s += '</div>';
  return s;
}

function renderBidding(){
  const st = serverState;
  let s = '<div class="card"><p class="eyebrow">Disputa</p>';
  s += '<div class="turn-banner">Vez de <strong>'+escapeHtml(st.turnPlayerName)+'</strong> ('+escapeHtml(st.turnName)+')</div>';
  s += '<div class="bid-label">Número atual em jogo</div>';
  s += '<div class="bid-current">'+st.bidCurrent+'</div>';
  s += '<div class="bid-meter"><div class="bid-meter-fill" style="width:'+(st.bidCurrent/20*100)+'%"></div></div>';
  s += '<div class="bid-log">'+escapeHtml(st.bidLog||'')+'</div>';
  if(st.canAct){
    s += '<p class="hint" style="text-align:center;">Aumente o número ou aperte "Eu Duvido".</p>';
  } else {
    s += '<p class="hint" style="text-align:center;">Só '+escapeHtml(st.turnPlayerName)+' pode agir agora. Acompanhe por aqui.</p>';
  }
  if(st.bidCurrent<20){
    s += '<div class="num-grid">';
    for(let n=1;n<=20;n++){
      const disabled = n<=st.bidCurrent || !st.canAct;
      s += '<div class="num-btn'+(disabled?' disabled':'')+'" '+(disabled?'':'onclick="doRaiseBid('+n+')"')+'>'+n+'</div>';
    }
    s += '</div>';
  } else if(st.canAct){
    s += '<p class="hint" style="text-align:center;">O número máximo (20) já foi atingido. Só resta duvidar!</p>';
  }
  if(st.canAct){
    s += '<button class="btn btn-doubt" onclick="doCallDoubt()">🔥 Eu Duvido!</button>';
  }
  s += '</div>';
  return s;
}

function fmtTime(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function renderPerformance(){
  const st = serverState;
  let s = '<div class="card"><p class="eyebrow">Rodada em andamento</p>';
  s += '<div class="diff-tag diff-'+st.difficulty+'">Dificuldade: '+(st.difficulty==='baixo'?'Baixa':'Média')+'</div>';
  s += '<div class="challenge-text">'+escapeHtml(st.challengeText)+'</div>';
  s += '<p class="hint" style="text-align:center;">Respondente: <strong>'+escapeHtml(st.respondenteName)+'</strong></p>';
  s += '<div class="timer-display'+(st.timeLeft<=10?' low':'')+'">'+fmtTime(st.timeLeft)+'</div>';
  s += '<div class="target-strip"><div class="t"><div class="v">'+st.correctCount+'</div><div class="l">Acertos</div></div><div class="t"><div class="v">'+st.target+'</div><div class="l">Meta</div></div></div>';
  s += '<div class="chat-box" id="chatBox">';
  st.messages.forEach((m,idx)=>{
    s += '<div class="msg '+m.status+'">';
    if(m.status==='correct'){ s += '<div class="badge">'+m.badge+'</div>'; }
    s += '<div class="word">'+escapeHtml(m.text)+(m.status==='invalid'?' <span style="opacity:.7">(inválido)</span>':'')+(m.status==='duplicate'?' <span style="opacity:.7">(já citado)</span>':'')+'</div>';
    if(m.status==='pending' && st.canJudge){
      s += '<div class="judge-btns"><button class="judge-btn judge-yes" onclick="doJudge('+idx+',true)">✓</button><button class="judge-btn judge-no" onclick="doJudge('+idx+',false)">✗</button></div>';
    } else if(m.status==='pending'){
      s += '<div class="judge-btns"><span style="font-size:11px;color:var(--muted)">aguardando validação</span></div>';
    }
    s += '</div>';
  });
  s += '</div>';
  if(st.canSubmit){
    s += '<div class="chat-input-row"><input type="text" id="chatInput" placeholder="Digite uma resposta e envie" onkeydown="if(event.key===\'Enter\'){doSubmitAnswer();}"><button class="send-btn" onclick="doSubmitAnswer()">Enviar</button></div>';
  } else if(st.canJudge){
    s += '<p class="small-note">Valide as respostas pendentes acima.</p>';
  } else {
    s += '<p class="small-note">Só o respondente pode enviar respostas.</p>';
  }
  s += '<button class="btn btn-ghost" style="margin-top:12px;" onclick="doEndPerformance()">Encerrar rodada agora</button>';
  s += '</div>';
  return s;
}

function renderRoundResult(){
  const sum = serverState.summary;
  let s = '<div class="card"><p class="eyebrow">Resultado da rodada</p>';
  s += '<div class="result-hero"><div class="big">'+sum.correctCount+' / '+sum.target+'</div>';
  const winnerName = serverState.scores[sum.winnerIdx] ? serverState.scores[sum.winnerIdx].name : '';
  if(sum.activeWins){
    s += '<p class="hint">O parceiro alcançou a meta! <span class="winner-name">'+escapeHtml(winnerName)+'</span> vence a rodada.</p>';
  } else {
    s += '<p class="hint">A meta não foi alcançada. <span class="winner-name">'+escapeHtml(winnerName)+'</span> venceu ao duvidar.</p>';
  }
  s += '</div>';
  s += '<button class="btn btn-primary" onclick="doNextRound()">'+(serverState.roundNum>=serverState.totalRounds?'Ver resultado final':'Próxima rodada')+'</button>';
  s += '</div>';
  return s;
}

function renderFinal(){
  let s = '<div class="card"><p class="eyebrow">Fim de jogo</p><h2 class="section-title">Placar final</h2>';
  serverState.ranking.forEach((r,i)=>{
    s += '<div class="final-rank'+(i===0?' first':'')+'"><div class="rank-pos">'+(i+1)+'º</div><div class="rank-name">'+escapeHtml(r.name)+'</div><div class="rank-pts">'+r.score+' pts</div></div>';
  });
  s += '<button class="btn btn-primary" onclick="doRestart()">Jogar novamente</button>';
  s += '<button class="btn btn-ghost" onclick="leaveRoom()">Sair da sala</button>';
  s += '</div>';
  return s;
}

render();
