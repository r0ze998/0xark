// ═══════════════════════════════════════
// MULTIPLAYER SYSTEM (WebSocket client)
// ═══════════════════════════════════════
let mp={
  connected:false,
  ws:null,
  serverUrl:'ws://localhost:3500',
  roomId:null,
  playerId:null,
  playerCount:0,
  otherPlayers:[], // [{id, name, area, cardCount, x, y}]
  phase:'lobby', // lobby, playing, finished
  pendingActions:[],
  pingMs:0,
  pingColor:'#40d040', // green/yellow/red
  lastPingTime:0,
  reconnectAttempts:0,
  maxReconnectAttempts:5,
  disconnectMsg:'',
  disconnectTimer:0,
  lobbyPlayers:[], // [{id, name, ready}]
  roomInput:'',
  mpMenuIdx:0, // 0=CREATE ROOM, 1=JOIN ROOM
  mpScreen:'off', // off, select, create, join, lobby
};

function mpConnect(roomId,isCreate){
  if(mp.ws)mpDisconnect();
  mp.reconnectAttempts=0;
  mp.disconnectMsg='';mp.disconnectTimer=0;
  try{
    const url=mp.serverUrl+'?room='+encodeURIComponent(roomId)+(isCreate?'&create=1':'');
    mp.ws=new WebSocket(url);
    mp.ws.onopen=function(){
      mp.connected=true;mp.roomId=roomId;
      mp.phase='lobby';mp.reconnectAttempts=0;
      mp.lastPingTime=performance.now();
      lg.push('[MP] Connected to room '+roomId);
    };
    mp.ws.onmessage=function(evt){
      try{
        const msg=JSON.parse(evt.data);
        mpHandleMessage(msg);
      }catch(e){}
    };
    mp.ws.onclose=function(){
      const wasConnected=mp.connected;
      mp.connected=false;mp.ws=null;
      if(wasConnected){
        mp.disconnectMsg='CONNECTION LOST - switching to AI';
        mp.disconnectTimer=180; // 3 seconds
        lg.push('[MP] Disconnected from server.');
        // Attempt reconnect
        if(mp.reconnectAttempts<mp.maxReconnectAttempts&&mp.roomId){
          mp.reconnectAttempts++;
          setTimeout(()=>{if(!mp.connected&&mp.roomId)mpConnect(mp.roomId,false);},2000);
        }
      }
    };
    mp.ws.onerror=function(){
      mp.disconnectMsg='CONNECTION ERROR';mp.disconnectTimer=120;
    };
  }catch(e){
    mp.disconnectMsg='FAILED TO CONNECT';mp.disconnectTimer=120;
  }
}

function mpDisconnect(){
  if(mp.ws){try{mp.ws.close();}catch(e){}}
  mp.ws=null;mp.connected=false;mp.roomId=null;mp.playerId=null;
  mp.playerCount=0;mp.otherPlayers=[];mp.phase='lobby';
  mp.lobbyPlayers=[];mp.mpScreen='off';
}

function mpSend(obj){
  if(mp.ws&&mp.ws.readyState===WebSocket.OPEN){
    try{mp.ws.send(JSON.stringify(obj));}catch(e){}
  }
}

function mpHandleMessage(msg){
  if(msg.type==='welcome'){
    mp.playerId=msg.playerId;
    mp.roomId=msg.roomId;
  }else if(msg.type==='lobby_update'){
    mp.lobbyPlayers=msg.players||[];
    mp.playerCount=mp.lobbyPlayers.length;
  }else if(msg.type==='game_start'){
    mp.phase='playing';
    mp.otherPlayers=msg.players?msg.players.filter(p=>p.id!==mp.playerId):[];
  }else if(msg.type==='player_move'){
    const op=mp.otherPlayers.find(p=>p.id===msg.id);
    if(op){op.x=msg.x;op.y=msg.y;op.area=msg.area;}
  }else if(msg.type==='player_join'){
    if(mp.phase==='playing'){
      const exists=mp.otherPlayers.find(p=>p.id===msg.id);
      if(!exists)mp.otherPlayers.push({id:msg.id,name:msg.name||'Player',area:0,cardCount:0,x:15,y:13});
    }
  }else if(msg.type==='player_leave'){
    mp.otherPlayers=mp.otherPlayers.filter(p=>p.id!==msg.id);
    mp.playerCount=mp.otherPlayers.length+1;
  }else if(msg.type==='battle_action'){
    mp.pendingActions.push(msg);
  }else if(msg.type==='pong'){
    mp.pingMs=Math.round(performance.now()-mp.lastPingTime);
    mp.pingColor=mp.pingMs<80?'#40d040':mp.pingMs<200?FRLG.hpYellow:FRLG.hpRed;
  }
}

// Broadcast player movement
function mpBroadcastMove(){
  if(!mp.connected||mp.phase!=='playing')return;
  mpSend({type:'move',x:pl[0].x,y:pl[0].y,area:currentMap});
}

// Broadcast battle action
function mpBroadcastBattleAction(action,target){
  if(!mp.connected||mp.phase!=='playing')return;
  mpSend({type:'battle_action',action:action,target:target});
}

// Ping server periodically
function mpPing(){
  if(!mp.connected)return;
  mp.lastPingTime=performance.now();
  mpSend({type:'ping'});
}

// Generate a random room ID
function mpGenerateRoomId(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id='';
  for(let i=0;i<6;i++)id+=chars[Math.floor(Math.random()*chars.length)];
  return id;
}

// Draw multiplayer lobby UI (FRLG-style windows)
function drawMPLobby(){
  bx(0,0,W,H,'#0c0c18');
  // Stars
  g.fillStyle='#ffffff';
  for(let i=0;i<60;i++){const sx=(i*47+13)%W,sy=(i*31+7)%320;const a=Math.sin(fr*.03+i*1.7)*.35+.5;g.globalAlpha=a*.3;g.fillRect(sx,sy,1,1);}
  g.globalAlpha=1;

  if(mp.mpScreen==='select'){
    // Room entry UI
    win(W/2-180,120,360,340);
    txShadow('MULTIPLAYER',W/2-72,160,12,FRLG.selHighlight,'rgba(0,0,0,.5)');
    // CREATE ROOM
    const sel0=mp.mpMenuIdx===0;
    if(sel0)bx(W/2-160,190,320,36,'rgba(248,216,48,.12)');
    if(sel0)txShadow('\u25B6',W/2-160,214,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    txShadow('CREATE ROOM',W/2-70,214,10,sel0?FRLG.selHighlight:'#888898','rgba(0,0,0,.4)');
    txShadow('Host a new game',W/2-80,236,6,'#686068','rgba(0,0,0,.35)');
    // JOIN ROOM
    const sel1=mp.mpMenuIdx===1;
    if(sel1)bx(W/2-160,260,320,36,'rgba(248,216,48,.12)');
    if(sel1)txShadow('\u25B6',W/2-160,284,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    txShadow('JOIN ROOM',W/2-58,284,10,sel1?FRLG.selHighlight:'#888898','rgba(0,0,0,.4)');
    txShadow('Enter a room code',W/2-80,306,6,'#686068','rgba(0,0,0,.35)');
    // BACK
    const sel2=mp.mpMenuIdx===2;
    if(sel2)txShadow('\u25B6',W/2-60,360,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    txShadow('BACK',W/2-24,360,10,sel2?FRLG.selHighlight:'#888898','rgba(0,0,0,.4)');
    // Connection status
    txShadow(mp.connected?'CONNECTED':'NOT CONNECTED',W/2-70,420,6,mp.connected?'#40d080':'#a06060','rgba(0,0,0,.35)');
  }else if(mp.mpScreen==='join'){
    // Join room: enter room code
    win(W/2-180,150,360,240);
    txShadow('JOIN ROOM',W/2-56,186,12,FRLG.selHighlight,'rgba(0,0,0,.5)');
    txShadow('Enter Room Code:',W/2-90,220,8,FRLG.textColor,'rgba(0,0,0,.35)');
    // Room code display
    win(W/2-80,236,160,32);
    const displayCode=mp.roomInput+(Math.floor(fr/30)%2===0?'_':'');
    txShadow(displayCode,W/2-60,260,14,FRLG.textColor,'rgba(0,0,0,.4)');
    txShadow('Type code, Z to connect',W/2-100,290,6,'#686068','rgba(0,0,0,.35)');
    txShadow('X to go back',W/2-50,310,6,'#686068','rgba(0,0,0,.35)');
  }else if(mp.mpScreen==='create'){
    // Creating room...
    win(W/2-180,150,360,240);
    txShadow('CREATE ROOM',W/2-70,186,12,FRLG.selHighlight,'rgba(0,0,0,.5)');
    if(mp.roomId){
      txShadow('Room Code:',W/2-56,224,8,FRLG.textColor,'rgba(0,0,0,.35)');
      win(W/2-60,236,120,32);
      txShadow(mp.roomId,W/2-44,260,14,'#40d080','rgba(0,0,0,.4)');
      txShadow('Share this code!',W/2-70,290,7,'#686068','rgba(0,0,0,.35)');
      txShadow('Waiting for players...',W/2-90,320,6,'#888898','rgba(0,0,0,.35)');
    }else{
      txShadow('Connecting...',W/2-60,250,8,'#888898','rgba(0,0,0,.35)');
    }
  }else if(mp.mpScreen==='lobby'){
    // Lobby: show connected players, START button
    win(W/2-200,80,400,440);
    txShadow('ROOM: '+(mp.roomId||'???'),W/2-80,116,12,FRLG.selHighlight,'rgba(0,0,0,.5)');
    // Connected players list
    txShadow('PLAYERS:',W/2-48,150,8,FRLG.textColor,'rgba(0,0,0,.35)');
    const players=mp.lobbyPlayers;
    for(let i=0;i<Math.min(players.length,3);i++){
      const py_=174+i*40;
      win(W/2-160,py_,320,34);
      const pc=i===0?'#48b8e8':i===1?'#d860a0':'#d8b028';
      bx(W/2-148,py_+8,18,18,pc);
      txShadow(players[i].name||('Player '+(i+1)),W/2-120,py_+24,8,FRLG.textColor,'rgba(0,0,0,.35)');
      txShadow(players[i].ready?'READY':'WAITING',W/2+80,py_+24,6,players[i].ready?'#40d080':'#a09888','rgba(0,0,0,.35)');
    }
    // Empty slots
    for(let i=players.length;i<3;i++){
      const py_=174+i*40;
      win(W/2-160,py_,320,34);
      txShadow('Waiting...',W/2-50,py_+24,8,'#686068','rgba(0,0,0,.35)');
    }
    // Player count
    txShadow('ONLINE: '+mp.playerCount+'/3',W/2-56,320,8,mp.playerCount>=2?'#40d080':'#a09888','rgba(0,0,0,.35)');
    // Ping
    if(mp.connected){
      bx(W/2+70,312,6,6,mp.pingColor);
      txShadow(mp.pingMs+'ms',W/2+80,320,6,mp.pingColor,'rgba(0,0,0,.35)');
    }
    // START button (only if 2+ players)
    const canStart=mp.playerCount>=2;
    const startSel=mp.mpMenuIdx===0;
    if(canStart){
      if(startSel)bx(W/2-80,360,160,36,'rgba(248,216,48,.15)');
      txShadow('START',W/2-32,384,14,startSel?FRLG.selHighlight:'#40d080','rgba(0,0,0,.4)');
    }else{
      txShadow('Need 2+ players',W/2-70,384,8,'#686068','rgba(0,0,0,.35)');
    }
    // Entry fee and pot display
    win(W/2-140,400,280,24);
    txShadow('ENTRY FEE: 0.01 SOL',W/2-80,416,7,'#14F195','rgba(0,0,0,.4)');
    txShadow('CURRENT POT: 0.03 SOL',W/2-86,432,7,'#f0c830','rgba(0,0,0,.4)');
    // LEAVE
    txShadow('X = Leave Room',W/2-60,456,6,'#a06060','rgba(0,0,0,.35)');
  }
}

// Draw other multiplayer players on map as real sprites
function drawMPPlayers(){
  if(!mp.connected||mp.phase!=='playing')return;
  mp.otherPlayers.forEach(op=>{
    if(op.area!==currentMap)return;
    // ZK fog-of-war: in dungeon, only render if tile is revealed AND within visible radius
    // Town (map 0) is always visible — no fog restriction
    if(inDungeon&&!isVisibleThroughFog(op.x,op.y,3))return;
    const sx=op.x*TW-camX,sy=op.y*TH-camY-16;
    if(sx<-TW*2||sx>W+TW||sy<-TH*2||sy>H+TH)return;
    // Draw as colored sprite (like player but different color)
    const spriteColors=['#d860a0','#d8b028','#48b8e8'];
    const ci=mp.otherPlayers.indexOf(op)%3;
    const col=spriteColors[ci];
    // Body
    bx(sx+6,sy+8,20,16,col);bx(sx+8,sy+10,16,12,'rgba(255,255,255,.15)');
    // Head
    bx(sx+8,sy,16,12,'#f0dcc0');bx(sx+10,sy+2,12,8,'#e8d0b0');
    // Eyes
    bx(sx+11,sy+5,3,3,'#181820');bx(sx+18,sy+5,3,3,'#181820');
    // Legs
    bx(sx+9,sy+24,6,8,'#4050a0');bx(sx+17,sy+24,6,8,'#4050a0');
    bx(sx+8,sy+30,7,4,'#383030');bx(sx+17,sy+30,7,4,'#383030');
    // Player name above sprite
    const nameW=(op.name||'Player').length*6;
    bx(sx+16-nameW/2-2,sy-12,nameW+4,10,'rgba(0,0,0,.5)');
    txShadow(op.name||'Player',sx+16-nameW/2,sy-4,5,'#fff','rgba(0,0,0,.4)');
  });
}

// Draw multiplayer connection status in HUD
function drawMPStatus(){
  if(!mp.connected&&mp.disconnectTimer<=0)return;
  // Disconnect message
  if(mp.disconnectTimer>0){
    mp.disconnectTimer--;
    const a=Math.min(1,mp.disconnectTimer/30);
    g.globalAlpha=a;
    win(W/2-200,H/2-30,400,60);
    txShadow(mp.disconnectMsg,W/2-180,H/2+2,8,'#d04040','rgba(0,0,0,.4)');
    g.globalAlpha=1;
    return;
  }
  // Online indicator (top-right of HUD when on map)
  if(sc==='map'&&mp.phase==='playing'){
    const statusX=W-130,statusY=4;
    bx(statusX,statusY,120,16,'rgba(0,0,0,.5)');
    txShadow('ONLINE:'+mp.playerCount+'/3',statusX+4,statusY+12,6,'#40d080','rgba(0,0,0,.4)');
    // Ping dot
    bx(statusX+104,statusY+5,6,6,mp.pingColor);
  }
}

// ═══════════════════════════════════════
// TYPEWRITER
// ═══════════════════════════════════════
let twText='',twTarget='',twI=0,twDone=true,twAccum=0,twShowFrame=0;
function twSet(s){twTarget=s;twText='';twI=0;twDone=false;twAccum=0;twShowFrame=fr;pxShowTextbox(s);}
function twTick(){
  if(!twDone){
    twAccum+=dt;
    const spd=getTextSpeed();
    while(twAccum>=spd&&twI<twTarget.length){
      twText+=twTarget[twI];twI++;twAccum-=spd;
      if(twI>=twTarget.length)twDone=true;
    }
  }
}

// ═══════════════════════════════════════
// FADE + FLASH
// ═══════════════════════════════════════
let fadeAlpha=1,fadingIn=true,fadeCallback=null,fadeProgress=0;
function fadeIn(cb){fadeAlpha=1;fadingIn=true;fadeCallback=cb;fadeProgress=0;}
function fadeOut(cb){fadeAlpha=0;fadingIn=false;fadeCallback=cb;fadeProgress=0;}
function fadeUpdate(){
  const speed=0.06*dt;
  if(fadingIn&&fadeAlpha>0){
    fadeProgress=Math.min(1,fadeProgress+speed);
    fadeAlpha=1-easeInOut(fadeProgress);
    if(fadeAlpha<=0){fadeAlpha=0;if(fadeCallback){fadeCallback();fadeCallback=null;}}
  }
  if(!fadingIn&&fadeAlpha<1){
    fadeProgress=Math.min(1,fadeProgress+speed);
    fadeAlpha=easeInOut(fadeProgress);
    if(fadeAlpha>=1){fadeAlpha=1;if(fadeCallback){fadeCallback();fadeCallback=null;}}
  }
}
function fadeDraw(){if(fadeAlpha>0){g.globalAlpha=fadeAlpha;g.fillStyle='#000000';g.fillRect(0,0,W,H);g.globalAlpha=1;}}
let flashT=0;
function flash(){flashT=20;}
let shakeT=0,shakeIntensity=0;
function screenShake(intensity,duration){shakeT=duration||8;shakeIntensity=intensity||3;}
let hitPauseFrames=0;
function hitPause(frames){hitPauseFrames=Math.max(hitPauseFrames,frames||4);}

// ═══════════════════════════════════════
// SCREEN TRANSITION WIPES
// ═══════════════════════════════════════
// Wipe types: 'hswipe' (horizontal FRLG-style), 'vslide' (vertical slide-down), 'door_open', 'door_close'
let wipeActive=false, wipeType='hswipe', wipeProgress=0, wipeCallback=null, wipeDuration=30;
let wipeDoorX=0, wipeDoorY=0; // door position in screen coords for door wipe

function startWipe(type, duration, cb, doorX, doorY){
  wipeActive=true; wipeType=type; wipeProgress=0; wipeDuration=duration||30; wipeCallback=cb;
  wipeDoorX=doorX||W/2; wipeDoorY=doorY||H/2;
}
function updateWipe(){
  if(!wipeActive)return;
  wipeProgress+=dt;
  if(wipeProgress>=wipeDuration){
    wipeActive=false;
    if(wipeCallback){wipeCallback();wipeCallback=null;}
  }
}
function drawWipe(){
  if(!wipeActive)return;
  const t=Math.min(1,wipeProgress/wipeDuration);
  const ease=easeInOut(t);
  if(wipeType==='hswipe'){
    // Horizontal wipe like FRLG wild encounter — black bars sweep from edges
    const barW=Math.floor(W*ease);
    // Alternating horizontal stripes sweep from left and right
    const stripeH=Math.ceil(H/8);
    for(let i=0;i<8;i++){
      const fromLeft=(i%2===0);
      const sx=fromLeft?0:W-barW;
      bx(sx,i*stripeH,barW,stripeH,'#181828');
    }
  }else if(wipeType==='hswipe_out'){
    // Reverse horizontal wipe — stripes retract
    const barW=Math.floor(W*(1-ease));
    const stripeH=Math.ceil(H/8);
    for(let i=0;i<8;i++){
      const fromLeft=(i%2===0);
      const sx=fromLeft?0:W-barW;
      bx(sx,i*stripeH,barW,stripeH,'#181828');
    }
  }else if(wipeType==='vslide'){
    // Vertical slide-down wipe
    const barH=Math.floor(H*ease);
    bx(0,0,W,barH,'#181828');
  }else if(wipeType==='vslide_out'){
    // Reverse slide-down
    const barH=Math.floor(H*(1-ease));
    bx(0,0,W,barH,'#181828');
  }else if(wipeType==='mosaic'){
    // FRLG-style mosaic pixelation wipe — screen pixelates then goes black
    const pixelSize=Math.max(2,Math.floor(ease*32));
    if(ease<0.7){
      // Pixelate phase: draw screen at reduced resolution
      g.imageSmoothingEnabled=false;
      // Draw current screen scaled down then back up for pixelation effect
      const sw=Math.max(1,Math.floor(W/pixelSize)),sh=Math.max(1,Math.floor(H/pixelSize));
      g.drawImage(c,0,0,W,H,0,0,sw,sh);
      g.drawImage(c,0,0,sw,sh,0,0,W,H);
    }else{
      // Fade to black
      g.globalAlpha=(ease-0.7)/0.3;g.fillStyle='#181828';g.fillRect(0,0,W,H);g.globalAlpha=1;
    }
  }else if(wipeType==='mosaic_out'){
    // Reverse mosaic — de-pixelate from black
    if(ease<0.3){
      g.globalAlpha=1-ease/0.3;g.fillStyle='#181828';g.fillRect(0,0,W,H);g.globalAlpha=1;
    }else{
      const pixelSize=Math.max(2,Math.floor((1-ease)*32));
      g.imageSmoothingEnabled=false;
      const sw=Math.max(1,Math.floor(W/pixelSize)),sh=Math.max(1,Math.floor(H/pixelSize));
      g.drawImage(c,0,0,W,H,0,0,sw,sh);
      g.drawImage(c,0,0,sw,sh,0,0,W,H);
    }
  }else if(wipeType==='door_open'){
    // Dark rectangle expanding from door position
    const maxW=W, maxH=H;
    const cw=Math.floor(maxW*ease), ch=Math.floor(maxH*ease);
    const cx=wipeDoorX-cw/2, cy=wipeDoorY-ch/2;
    bx(cx,cy,cw,ch,'#080810');
  }else if(wipeType==='door_close'){
    // Dark rectangle shrinking to door position
    const maxW=W, maxH=H;
    const cw=Math.floor(maxW*(1-ease)), ch=Math.floor(maxH*(1-ease));
    const cx=wipeDoorX-cw/2, cy=wipeDoorY-ch/2;
    bx(cx,cy,cw,ch,'#080810');
  }
}

// ═══════════════════════════════════════
// MAP LOADING SCREEN
// ═══════════════════════════════════════
let mapLoadScreenActive=false, mapLoadScreenFrame=0, mapLoadScreenName='', mapLoadScreenCards='';
let mapLoadScreenFloor=0; // 0=town/generic, 1-5=dungeon floor
// v72: Dungeon Run Summary
let dungeonRunSnapshot=null; // snapshot when entering dungeon
let runSummaryActive=false, runSummaryFrame=0, runSummaryData=null;
// v79: Active Run Mission
let runMission=null; // {type,desc,progress,goal,reward,rewardKey,completed,rewardGiven}
let roundsThisRun=0; // battle rounds completed this dungeon run
const MAP_LOAD_DURATION=80; // ~1.3 seconds at 60fps — dramatic pause

function showMapLoadScreen(name, cards, floor){
  mapLoadScreenActive=true;
  mapLoadScreenFrame=0;
  mapLoadScreenName=name;
  mapLoadScreenCards=cards||'';
  mapLoadScreenFloor=floor||0;
}
function updateMapLoadScreen(){
  if(!mapLoadScreenActive)return;
  mapLoadScreenFrame++;
  if(mapLoadScreenFrame>=MAP_LOAD_DURATION)mapLoadScreenActive=false;
}
function drawMapLoadScreen(){
  if(!mapLoadScreenActive)return;
  const t=mapLoadScreenFrame/MAP_LOAD_DURATION;
  // Fade in quickly, hold, fade out at end
  let alpha;
  if(t<0.15) alpha=t/0.15;
  else if(t>0.85) alpha=(1-t)/0.15;
  else alpha=1;
  alpha=Math.max(0,Math.min(1,alpha));

  const fl=mapLoadScreenFloor;
  const isDungeon=fl>0;
  // Floor atmosphere colors
  const atmosBg=['#0c0c18','#1a1828','#0d1a10','#1c1608','#1a0808','#200404'][fl]||'#0c0c18';
  const atmosAccent=['#c8c0a0','#a8a0c0','#70b870','#d0a840','#d06040','#e06020'][fl]||'#c8c0a0';

  g.globalAlpha=alpha;
  bx(0,0,W,H,atmosBg);

  if(isDungeon){
    // Dramatic: falling pixel particles (dungeon descent effect)
    for(let i=0;i<30;i++){
      const px_=((i*1237+mapLoadScreenFrame*3)%1000/1000)*W;
      const py_=((i*3141+mapLoadScreenFrame*4)%1000/1000)*(H+40)-20;
      const pa=0.3+Math.sin(mapLoadScreenFrame*0.08+i*0.7)*0.3;
      g.globalAlpha=alpha*pa;
      g.fillStyle=atmosAccent;
      g.fillRect(px_,py_,2,4);
    }
    g.globalAlpha=alpha;

    // Floor number — huge
    const floorNums=['','I','II','III','IV','V'];
    const floorNum=floorNums[fl]||String(fl);
    const floorLabel='FLOOR '+floorNum;
    const flLabelW=floorLabel.length*20;
    // Glowing floor number
    const glowA=0.12+Math.sin(mapLoadScreenFrame*0.12)*0.08;
    g.globalAlpha=alpha*glowA;
    g.font='bold 120px VT323, monospace';
    g.textAlign='center';
    g.fillStyle=atmosAccent;
    g.fillText(floorLabel,W/2,H/2+45);
    g.textAlign='left';
    g.globalAlpha=alpha;

    txShadow(floorLabel,W/2-flLabelW/2,H/2-5,20,atmosAccent,'rgba(0,0,0,.7)');

    // Horizontal decorative lines
    bx(W/2-120,H/2+6,240,1,atmosAccent+'80');

    // Atmosphere description
    const flAtmosDesc=[
      '','Ancient dust settles...','Mushroom spores drift in the dark...',
      'Crumbling ruins whisper old secrets...','Embers drift upward from below...',
      'The heat here is nearly unbearable...'
    ];
    const atmDesc=flAtmosDesc[fl]||'';
    if(atmDesc&&t>0.2&&t<0.9){
      const txtAlpha=t>0.2&&t<0.3?(t-0.2)/0.1:t>0.8?(1-t)/0.1:1;
      g.globalAlpha=alpha*txtAlpha*0.75;
      txShadow(atmDesc,W/2-atmDesc.length*4,H/2+24,8,'#a09080','rgba(0,0,0,.5)');
      g.globalAlpha=alpha;
    }

    // v95: Rival threat warning — show rivals already present on this floor
    if(t>0.38&&t<0.90){
      const warnAlpha=t<0.48?(t-0.38)/0.10:t>0.82?(0.90-t)/0.08:1;
      const rivalsHere=[];
      if(rivalMaps[0]===mapLoadScreenFloor)rivalsHere.push({name:pl[1].n,cards:pl[1].cd.filter(c=>c>0).length,col:'#e060a0'});
      if(rivalMaps[1]===mapLoadScreenFloor)rivalsHere.push({name:pl[2].n,cards:pl[2].cd.filter(c=>c>0).length,col:'#d0a030'});
      if(rivalsHere.length>0){
        const baseY=H/2+60;
        g.textAlign='center';
        rivalsHere.forEach((rv,i)=>{
          const wTxt='\u26a0 '+rv.name+': '+rv.cards+' cards \u2014 HERE';
          g.globalAlpha=alpha*warnAlpha*0.9;
          g.font='bold 9px VT323, monospace';
          g.fillStyle=rv.col;
          g.shadowColor=rv.col;g.shadowBlur=8;
          g.fillText(wTxt,W/2,baseY+i*14);
          g.shadowBlur=0;
        });
        g.textAlign='left';
        g.globalAlpha=alpha;
      }
    }

    // Card rarity hint at bottom
    if(mapLoadScreenCards&&t>0.25){
      txShadow(mapLoadScreenCards,W/2-mapLoadScreenCards.length*4,H/2+46,7,atmosAccent,'rgba(0,0,0,.5)');
    }
  }else{
    // Town/generic: simple name display
    const nameW=mapLoadScreenName.length*8;
    txShadow(mapLoadScreenName,W/2-nameW,H/2-10,16,'#f8f0e0','rgba(0,0,0,.6)');
    if(mapLoadScreenCards){
      txShadow(mapLoadScreenCards,W/2-mapLoadScreenCards.length*3,H/2+20,6,'#c8c0a0','rgba(0,0,0,.4)');
    }
    bx(W/2-80,H/2+4,160,1,'rgba(200,180,140,.5)');
  }
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v72: DUNGEON RUN SUMMARY OVERLAY
// ═══════════════════════════════════════
function updateRunSummary(){
  if(!runSummaryActive)return;
  runSummaryFrame++;
}
function drawRunSummary(){
  if(!runSummaryActive||!runSummaryData)return;
  const d=runSummaryData;
  const t=Math.min(1,runSummaryFrame/30); // 0.5s slide-in
  const slideY=(1-t)*60;
  const missionExtra=d.missionDesc?44:0;
  const panelW=320,panelH=Math.max(160,140+d.lostCards.length*18)+missionExtra;
  const px=W/2-panelW/2,py=H/2-panelH/2+slideY;

  // Dim background
  g.globalAlpha=Math.min(0.75,t*0.75);
  bx(0,0,W,H,'rgba(0,0,0,.9)');
  g.globalAlpha=t;

  // Panel
  bx(px,py,panelW,panelH,'#0c1018');
  bx(px,py,panelW,1,'#60a8d0');bx(px,py+panelH-1,panelW,1,'#60a8d0');
  bx(px,py,1,panelH,'#60a8d0');bx(px+panelW-1,py,1,panelH,'#60a8d0');
  bx(px+1,py+1,panelW-2,1,'#304860');bx(px+1,py+panelH-2,panelW-2,1,'#304860');

  // Title
  const titleX=px+panelW/2;
  txShadow('DUNGEON REPORT',titleX-64,py+20,9,'#60c8f0','rgba(0,0,0,.6)');
  bx(px+20,py+28,panelW-40,1,'#304860');

  // Floor depth
  const floorNums=['','I','II','III','IV','V'];
  const floorTxt='Deepest floor: FLOOR '+(floorNums[d.deepest]||d.deepest);
  txShadow(floorTxt,px+20,py+46,7,'#c8c0a0','rgba(0,0,0,.3)');

  // Cards collected
  const gainColor=d.cardsGained>0?'#50e090':'#888898';
  txShadow('Cards collected: '+(d.cardsGained>0?'+':'')+d.cardsGained,px+20,py+64,7,gainColor,'rgba(0,0,0,.3)');

  // Cards lost
  if(d.lostCards.length>0){
    bx(px+20,py+76,panelW-40,1,'#301010');
    txShadow('Cards lost:',px+20,py+90,7,'#d06060','rgba(0,0,0,.3)');
    d.lostCards.forEach((cr,i)=>{
      const ly=py+107+i*18;
      const rCol=['','#888898','#60b060','#6090d8','#c060c0','#f0c830'][cr.r]||'#888898';
      txShadow('\u2717 '+cr.n,px+28,ly,6,'#f06060','rgba(0,0,0,.3)');
      txShadow((['','C','U','R','E','L'][cr.r]||'?'),px+panelW-40,ly,6,rCol,'rgba(0,0,0,.3)');
    });
  }else{
    bx(px+20,py+76,panelW-40,1,'#103010');
    txShadow('All cards preserved!',px+20,py+90,7,'#50e090','rgba(0,0,0,.3)');
  }

  // v79: Mission result section
  if(d.missionDesc){
    const mSecY=py+panelH-missionExtra-2;
    bx(px+20,mSecY,panelW-40,1,'#103030');
    txShadow('\u2605 MISSION: '+d.missionDesc,px+20,mSecY+14,7,'#f0c830','rgba(0,0,0,.4)');
    txShadow('REWARD: '+d.missionReward,px+20,mSecY+30,7,'#50e090','rgba(0,0,0,.3)');
  }

  // Dismiss hint — blink after 2s
  if(runSummaryFrame>120){
    const blinkA=0.5+Math.sin(runSummaryFrame*0.1)*0.4;
    g.globalAlpha=t*blinkA;
    txShadow('[ PRESS ANY KEY ]',px+panelW/2-56,py+panelH-10,6,'#9098b0','rgba(0,0,0,.4)');
    g.globalAlpha=t;
  }
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v77: QUICK HAND INSPECT OVERLAY
// ═══════════════════════════════════════
function updateHandInspect(){
  if(!handInspectActive)return;
  handInspectFrame++;
  if(handInspectFrame>=handInspectAutoDismiss)handInspectActive=false;
}
function drawHandInspect(){
  if(!handInspectActive||sc!=='map')return;
  const t=Math.min(1,handInspectFrame/10);
  const fadeOut_=handInspectFrame>handInspectAutoDismiss-20?
    Math.max(0,(handInspectAutoDismiss-handInspectFrame)/20):1;
  const alpha=t*fadeOut_;

  g.globalAlpha=alpha*0.88;
  bx(0,0,W,H,'rgba(0,0,0,.75)');
  g.globalAlpha=alpha;

  const filled=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
  const total=filled.length;
  if(total===0){
    txShadow('Hand is empty.',W/2-60,H/2,9,'#888898','rgba(0,0,0,.5)');
    g.globalAlpha=1;return;
  }

  // Header
  txShadow('YOUR HAND',W/2-52,40,10,'#c8d0f0','rgba(0,0,0,.5)');
  txShadow(total+'/'+HAND_SIZE+' cards',W/2-30,56,6,'#8890b0','rgba(0,0,0,.4)');
  bx(40,62,W-80,1,'#30305060');

  // Card grid: up to 8 cards in 2 rows
  const cols=Math.min(4,total),rows=Math.ceil(total/4);
  const cw=160,ch=180,padX=(W-(cols*cw))/2,padY=80;

  filled.forEach((slot,i)=>{
    const cid=pl[0].cd[slot];if(!cid)return;
    const cr=CD[cid-1];
    const col_=i%cols,row_=Math.floor(i/cols);
    const cx_=padX+col_*cw+8,cy_=padY+row_*ch;

    // Rarity glow behind card for rare+
    const rarC=RARITY_COLOR[cr.r]||'#888';
    if((cr.r||1)>=3){
      const glPulse=0.18+0.06*Math.sin(fr*0.07+i*1.4);
      g.globalAlpha=alpha*glPulse;
      bx(cx_-4,cy_-4,cw-8,ch,rarC+'80'||'rgba(0,0,0,.1)');
      g.globalAlpha=alpha;
    }

    // Card background
    bx(cx_,cy_,cw-16,ch-8,cr.d);
    bx(cx_+1,cy_+1,cw-18,ch-10,cr.c);
    if((cr.r||1)>=3){bx(cx_,cy_,2,ch-8,rarC);} // left rarity accent bar

    // Card art
    bx(cx_+2,cy_+2,cw-20,72,cr.d);
    drawCardCharacter(cx_+(cw-20)/2-10,cy_+4,cid,1.6,fr);

    // Rarity stars
    for(let s=0;s<cr.r;s++)txShadow('\u2605',cx_+4+s*10,cy_+80,6,rarC,'rgba(0,0,0,.3)');

    // Card name
    const nfs=Math.max(7,Math.min(11,Math.floor((cw-24)/(cr.n.length*0.7))));
    txShadow(cr.n,cx_+(cw-16)/2-(cr.n.length*nfs/2.4),cy_+94,nfs,'#f0e8d0','rgba(0,0,0,.4)');

    // Effect / flavor text
    txShadow(cr.f||'',cx_+4,cy_+112,5,'#c0b888','rgba(0,0,0,.2)');

    // Decay bar + time
    if(cardTimers[slot]>0){
      const elapsed=Date.now()-cardTimers[slot];
      const remFrac=Math.max(0,1-elapsed/CARD_DECAY_MS);
      const remMs=Math.max(0,CARD_DECAY_MS-elapsed);
      const barW=cw-24;
      bx(cx_+4,cy_+ch-24,barW,5,'#181828');
      const barCol=remFrac>0.5?'#40d040':remFrac>0.25?'#d0c040':'#d04040';
      bx(cx_+4,cy_+ch-24,Math.floor(barW*remFrac),5,barCol);
      const secs=Math.ceil(remMs/1000);
      const mm=Math.floor(secs/60),ss=secs%60;
      const timeStr=mm>0?mm+'m'+('0'+ss).slice(-2)+'s':ss+'s';
      txShadow(timeStr,cx_+4,cy_+ch-10,5,barCol,'rgba(0,0,0,.3)');
    }else{
      txShadow('SAFE',cx_+4,cy_+ch-10,5,'#60c060','rgba(0,0,0,.3)');
    }
  });

  // Dismiss hint (blink)
  const blinkA=0.5+Math.sin(handInspectFrame*0.12)*0.4;
  g.globalAlpha=alpha*blinkA;
  txShadow('TAB or any key to close',W/2-64,H-20,6,'#9098b0','rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v73: RIVAL INTEL DISPATCH TICKER
// ═══════════════════════════════════════
function updateRivalNews(){
  if(rivalNewsCurrent){
    rivalNewsFrame++;
    if(rivalNewsFrame>=RIVAL_NEWS_DURATION){
      rivalNewsCurrent=null;
      rivalNewsFrame=0;
    }
  }else if(rivalNewsQueue.length>0){
    rivalNewsCurrent=rivalNewsQueue.shift();
    rivalNewsFrame=0;
  }
}
function drawRivalNews(){
  if(!rivalNewsCurrent||!inDungeon)return;
  const t=rivalNewsFrame/RIVAL_NEWS_DURATION;
  // slide in from left in first 8 frames, hold, slide out at end
  const slideIn=Math.min(1,rivalNewsFrame/8);
  const slideOut=t>0.85?Math.max(0,(1-t)/0.15):1;
  const alpha=slideIn*slideOut;
  if(alpha<0.02)return;

  const rivalCols=[['#d860a0','#401028'],['#d8b028','#402808']]; // VEGA pink, MIRA gold
  const item=rivalNewsCurrent;
  const rCols=item.rivalIdx>=0&&item.rivalIdx<2?rivalCols[item.rivalIdx]:['#80c0d0','#102028'];
  const [nameCol,bgTint]=rCols;
  // Rarity tint for the card name color
  const rarCol=['#888898','#888898','#60b060','#6090d8','#c060c0','#f0c830'][item.rarity]||'#a0a0b0';

  const msgW=Math.min(300,item.text.length*6+32);
  const msgH=28;
  const mx=8;
  const my=H-HUD_HEIGHT-msgH-8;
  const slideX=(1-slideIn)*-(msgW+mx);

  g.globalAlpha=alpha;
  // Background
  bx(mx+slideX,my,msgW,msgH,bgTint);
  bx(mx+slideX,my,3,msgH,nameCol); // color accent bar
  bx(mx+slideX,my,msgW,1,'rgba(255,255,255,0.12)');
  bx(mx+slideX,my+msgH-1,msgW,1,'rgba(0,0,0,0.5)');

  // INTEL label
  g.font='bold 7px monospace';g.fillStyle=nameCol;
  g.fillText('INTEL',mx+slideX+8,my+9);

  // Main message
  g.font='7px monospace';g.fillStyle='#e8e0d0';
  const textX=mx+slideX+8;
  const maxChars=Math.floor((msgW-20)/6);
  const display=item.text.length>maxChars?item.text.substring(0,maxChars-1)+'…':item.text;
  g.fillText(display,textX,my+20);
  g.globalAlpha=1;
  _lastFontSz=-1; // invalidate txShadow font cache — direct g.font= calls above used non-VT323 format
}

// ═══════════════════════════════════════
// FPS COUNTER (toggle with F key)
// ═══════════════════════════════════════
let fpsCounterVisible=false, fpsFrames=0, fpsLast=performance.now(), fpsDisplay=60;
function updateFPS(){
  fpsFrames++;
  const now=performance.now();
  if(now-fpsLast>=1000){
    fpsDisplay=fpsFrames;
    fpsFrames=0;
    fpsLast=now;
  }
}
function drawFPS(){
  if(!fpsCounterVisible)return;
  const col=fpsDisplay>=50?'#40d040':fpsDisplay>=30?'#d0d040':'#d04040';
  bx(2,2,48,14,'rgba(0,0,0,.6)');
  txShadow('FPS:'+fpsDisplay,4,12,6,col,'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// CARD COLLECTION PROGRESS BAR
// ═══════════════════════════════════════
let progressBarPulseTimer=0;
function triggerProgressPulse(){progressBarPulseTimer=60;}
function drawCardProgressBar(){
  if(sc!=='map'||mo||inBuilding||introActive)return;
  const barY=2, barX=W/2-150, barW=300, barH=10;
  // Background
  bx(barX-1,barY-1,barW+2,barH+2,'#1a1a30');
  bx(barX,barY,barW,barH,'#282838');
  // Vault progress
  const vaultSize=pl[0].vault?pl[0].vault.size:0;
  const pct=Math.min(1,vaultSize/60);
  // Color gradient: grey→blue→purple→gold
  let fillColor='#48b8e8';
  if(vaultSize>=50)fillColor='#f8c840';
  else if(vaultSize>=30)fillColor='#c060d8';
  else if(vaultSize>=10)fillColor='#48b8e8';
  if(pct>0){
    bx(barX,barY,Math.floor(barW*pct),barH,fillColor);
    bx(barX,barY,Math.floor(barW*pct),Math.floor(barH/2),'rgba(255,255,255,.15)');
  }
  // Milestone markers at 10, 20, 30, 40, 50 with labels
  const mileLabels=[10,20,30,40,50];
  for(let m=1;m<=5;m++){
    const mx=barX+Math.floor(barW*m*10/60);
    const reached=vaultSize>=m*10;
    bx(mx,barY,1,barH,reached?'rgba(255,255,255,.3)':'#1a1a30');
    // Tick label below bar
    const mlbl=mileLabels[m-1]+'';
    const mlblA=reached?0.8:0.35;
    g.globalAlpha=mlblA;
    txShadow(mlbl,mx-mlbl.length*2,barY+barH+6,4,reached?fillColor:'#888898','rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }
  // Text
  const countLabel=vaultSize+'/60';
  txShadow(countLabel,barX+barW+8,barY+9,7,vaultSize>=60?'#40d040':'#c8c0a0','rgba(0,0,0,.4)');
  // Dungeon floor indicator — show floor name abbreviation
  if(inDungeon){
    const floorAbbr=['','SG','DA','EC','DV','AC'];
    const floorLabel=(floorAbbr[currentFloor]||'B'+currentFloor);
    txShadow(floorLabel,barX-30,barY+9,7,'#d8b028','rgba(0,0,0,.4)');
  }
  // Pulse glow when new card added
  if(progressBarPulseTimer>0){
    progressBarPulseTimer--;
    const pulse=Math.sin(progressBarPulseTimer*0.2)*0.3+0.3;
    g.globalAlpha=pulse;
    bx(barX-3,barY-3,barW+6,barH+6,'#f0c830');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// GRASS PARTICLES
// ═══════════════════════════════════════
const particles=[];
function spawnGrassParticles(px,py){
  for(let i=0;i<4;i++){
    particles.push({x:px+Math.random()*TW,y:py+TH-4,vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5-0.5,life:20+Math.random()*10,c:Math.random()>.5?'#48984a':'#70c070'});
  }
}
function updateParticles(){
  // v224: Swap-and-pop removal — O(1) vs O(n) splice, order unimportant for 2×2 pixels
  let i=0;
  while(i<particles.length){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life--;
    if(p.life<=0){particles[i]=particles[particles.length-1];particles.length--;}
    else i++;
  }
}
function drawParticles(cx,cy){
  // v224: plain for-loop avoids forEach closure allocation each frame
  for(let i=0,l=particles.length;i<l;i++){
    const p=particles[i];
    const sx=p.x-cx,sy=p.y-cy;
    if(sx>-2&&sx<W+2&&sy>-2&&sy<H+2){
      const a=Math.min(1,p.life/10);
      g.fillStyle=p.c;g.globalAlpha=a;g.fillRect(sx,sy,2,2);g.globalAlpha=1;
    }
  }
}

