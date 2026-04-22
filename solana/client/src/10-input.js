// INPUT
// ═══════════════════════════════════════

// v295: Battle quip arrays hoisted to module scope (were re-allocated per battle end)
const _VEGA_WIN=['Mine now.','As expected.','Collect the spoils.','The ARK rewards the strong.','Don\'t beg. It\'s beneath you.'];
const _MIRA_WIN=['Outcome nominal.','Your card is now an asset.','Transfer complete. As computed.','Data confirms: you are suboptimal.','Deviation corrected.'];
const _VEGA_KO=['You cheated.','This isn\'t over.','The ARK will remember this.','I underestimated you. Once.','Take them. You\'ve earned nothing yet.'];
const _MIRA_KO=['Recalculating...','Model error. Noted.','This outcome was <1% probability.','You disrupted the variable. Impressive.','Retreat. New strategy required.'];
// v308: context-aware win quips based on how the battle actually unfolded
const _VEGA_WIN_STEAL=['Your cards were never yours.','Hunters take what they want.','Hesitation is a gift to me.'];
const _VEGA_WIN_BARRIERBRK=['Your shield was paper.','Barriers mean nothing to me.','Defense is just a slower loss.'];
const _MIRA_WIN_DOMINATED=['Outcome: decisive. Next.','Your hand was statistically inferior.','The gap was too large to overcome.'];
const _MIRA_WIN_CLOSE=['Closer than projected. Noted.','Margin: 0.3 rounds. You improved.','Near-optimal play. Still insufficient.'];
function _pickDefeatContext(q,winnerIdx){
  if(!q||!q.length)return null;
  let rivalSteals=0,playerBarrierBroken=false,playerStole=false;
  for(let _qi=0;_qi<q.length;_qi++){
    const ev=q[_qi];
    if(ev.effect==='steal_get'&&ev.who!=='You')rivalSteals++;
    if(ev.effect==='barrier_break'&&ev.who==='You')playerBarrierBroken=true;
    if(ev.effect==='steal_get'&&ev.who==='You')playerStole=true;
  }
  const pool=winnerIdx===1?_VEGA_WIN:_MIRA_WIN;
  if(winnerIdx===1){
    if(rivalSteals>=2)return _VEGA_WIN_STEAL[Math.floor(Math.random()*_VEGA_WIN_STEAL.length)];
    if(playerBarrierBroken)return _VEGA_WIN_BARRIERBRK[Math.floor(Math.random()*_VEGA_WIN_BARRIERBRK.length)];
  }else{
    if(rivalSteals>=2)return _MIRA_WIN_DOMINATED[Math.floor(Math.random()*_MIRA_WIN_DOMINATED.length)];
    if(playerStole)return _MIRA_WIN_CLOSE[Math.floor(Math.random()*_MIRA_WIN_CLOSE.length)];
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

// Held-key tracking for smooth continuous movement
const keysHeld = new Set();
let _lastDirCode = ''; // Fix C: last-pressed direction — used by processHeldMovement for priority
document.addEventListener('keydown', e => {
  keysHeld.add(e.code);
  if(e.code==='ArrowUp'||e.code==='ArrowDown'||e.code==='ArrowLeft'||e.code==='ArrowRight') _lastDirCode=e.code;
});
document.addEventListener('keyup',   e => { keysHeld.delete(e.code); });

// Extract move logic so both keydown and held-key loop can call it
function tryMovePlayer(dx, dy) {
  const p = pl[0];
  const nx = p.x + dx, ny = p.y + dy;
  if(dx < 0) p.dir = 1; else if(dx > 0) p.dir = 3;
  if(dy < 0) p.dir = 2; else if(dy > 0) p.dir = 0;
  const m = getMap();
  if(nx < 0 || nx >= MW || ny < 0 || ny >= MH) return false;
  if(!WALKABLE.has(m[ny]?.[nx])) return false;
  p.x = nx; p.y = ny; p.step++; p.walkFrame = (p.walkFrame + 1) % 4;
  sfxMove(); sfxStep();
  stepCounter++; stats.stepsWalked++;
  edgeCacheDirty = true;
  mpBroadcastMove();
  footprints.push({map:currentMap, x:nx, y:ny, age:0});
  if(inDungeon){ fogRevealCurrentRoom(currentMap,nx,ny); fogRevealRadius(currentMap,nx,ny,2); }
  fogSave();
  // v439: floor fully-explored bonus — restore spells when first 100%-explored a dungeon floor
  if(inDungeon&&!_exploredBonusGiven.has(currentMap)&&fogExploredPercent(currentMap)>=100){
    _exploredBonusGiven.add(currentMap);
    const _restN=(sp.s<3?1:0)+(sp.b<3?1:0)+(sp.c<3?1:0);
    if(sp.s<3)sp.s++;if(sp.b<3)sp.b++;if(sp.c<3)sp.c++;
    sfxCrystal();
    const _flrLbl=['','I','II','III','IV','V'];
    if(_restN>0){tutorialMsg='\u2605 FLOOR '+(_flrLbl[currentFloor]||currentFloor)+' FULLY MAPPED! Spells restored!';tutorialMsgTimer=220;}
    else{tutorialMsg='\u2605 FLOOR '+(_flrLbl[currentFloor]||currentFloor)+' FULLY MAPPED! Master explorer!';tutorialMsgTimer=220;}
    lg.push('Explored Floor '+(_flrLbl[currentFloor]||currentFloor)+' fully! Spells restored!');
  }
  const newTile = m[ny]?.[nx];
  if(newTile===1||newTile===7||newTile===11){ spawnGrassParticles(nx*TW,ny*TH); sfxGrassRustle(); }
  // v217: Dungeon footstep dust — stone floor puffs when walking through dungeon
  if(inDungeon&&(newTile===1||newTile===4||newTile===10)){
    const dustX=nx*TW,dustY=ny*TH+TH-4;
    for(let i=0;i<3;i++){
      const dustVX=(Math.random()-.5)*1.2;
      const dustCol=currentFloor>=4?'rgba(90,40,20,1)':currentFloor===3?'rgba(80,60,120,1)':'rgba(60,60,70,1)';
      particles.push({x:dustX+4+Math.random()*TW/2,y:dustY,vx:dustVX,vy:-Math.random()*0.8-0.2,life:12+Math.random()*6,c:dustCol});
    }
  }
  if(newTile===25&&inDungeon){
    for(let li=0;li<HAND_SIZE;li++){if(cardTimers[li]>0)cardTimers[li]-=30000;}
    if(objectInteractTimer<=0){objectInteractMsg='Lava! Cards decaying faster!';objectInteractTimer=60;}
    screenShake(2,4);
  }
  if(inDungeon){ processDungeonTurn(); checkFloorItemPickup(nx,ny); checkLandmarkEnter(currentMap,nx,ny); triggerLandmarkText(); }
  if(!tutorialFlags.firstStep){tutorialFlags.firstStep=true;tutorialMsg='Goal: collect all 60 cards to win the Prize Pool! Dungeon entrance is EAST.';tutorialMsgTimer=300;}
  if(newTile===11&&!tutorialFlags.firstGrass){tutorialFlags.firstGrass=true;tutorialMsg='Walk through tall grass to find cards!';tutorialMsgTimer=180;}
  // T63: tutorial objective tracking
  if(isTutorial){
    if(tutorialStep===0){tutorialProgress.move=(tutorialProgress.move||0)+1;if(tutorialProgress.move>=3)tutorialStepDone('move');}
    if(tutorialStep===1&&newTile===11)tutorialStepDone('grass');
    if(tutorialStep===3&&inDungeon)tutorialStepDone('dungeon');
    if(tutorialStep===5&&currentMap===0&&!inDungeon)tutorialStepDone('escape');
  }
  if(newTile!==0){const adj=[[nx-1,ny],[nx+1,ny],[nx,ny-1],[nx,ny+1]];if(adj.some(([ax,ay])=>ax>=0&&ax<MW&&ay>=0&&ay<MH&&m[ay]?.[ax]===0))sfxWaterNear();}
  if(shadowStepsLeft>0)shadowStepsLeft--;
  if(shadowStepsLeft<=0)checkForestTrap();
  randomEventTimer++;
  if(randomEventTimer>=150&&!randomEventActive&&!wildEncounterActive&&!cardAcqActive){randomEventTimer=0;triggerRandomEvent();}
  const exit = checkExitTile(nx,ny);
  if(exit){
    if(!inDungeon&&exit.targetMap>0){dungeonConfirmActive=true;dungeonConfirmExit=exit;}
    else{doMapTransition(exit);}
  }
  return true;
}

document.addEventListener('keydown',e=>{
  if(e.repeat)return;

  // Phase D Reborn — Lobby scene input
  if(sc==='lobby'){
    // Deck editor open: route all keys to deck editor
    if(typeof deckEditorOpen !== 'undefined' && deckEditorOpen) {
      e.preventDefault();
      if(typeof deckEditorKeydown === 'function') deckEditorKeydown(e.code);
      return;
    }
    // Dialog open: intercept nav keys for dialog, block movement
    if(typeof lobbyDialog !== 'undefined' && lobbyDialog) {
      e.preventDefault();
      if(e.code==='ArrowLeft'||e.code==='KeyA')  { lobbyDialogMoveFocus(-1); return; }
      if(e.code==='ArrowRight'||e.code==='KeyD') { lobbyDialogMoveFocus( 1); return; }
      if(e.code==='KeyZ'||e.code==='Enter'||e.code==='Space') { lobbyDialogConfirm(); return; }
      if(e.code==='KeyX'||e.code==='Escape') { lobbyDialogCancel(); return; }
      return;
    }
    // Normal lobby movement
    if(e.code==='ArrowUp'||e.code==='KeyW')    { e.preventDefault(); lobbyMove(0,-1); return; }
    if(e.code==='ArrowDown'||e.code==='KeyS')  { e.preventDefault(); lobbyMove(0, 1); return; }
    if(e.code==='ArrowLeft'||e.code==='KeyA')  { e.preventDefault(); lobbyMove(-1,0); return; }
    if(e.code==='ArrowRight'||e.code==='KeyD') { e.preventDefault(); lobbyMove( 1,0); return; }
    if(e.code==='KeyZ'||e.code==='Enter'||e.code==='Space') { e.preventDefault(); lobbyInteract(); return; }
    if(e.code==='KeyX'||e.code==='Escape') { exitLobby(); return; }
    return; // swallow other keys while in lobby
  }

  // v72: Dismiss dungeon run summary on any key
  if(runSummaryActive){runSummaryActive=false;runSummaryData=null;return;}
  // v77: Hand inspect overlay — Tab to open/close, any key to dismiss
  if(handInspectActive){handInspectActive=false;return;}
  if(e.code==='Tab'&&sc==='map'&&inDungeon&&!mo&&!npcDialogActive&&!shopActive&&!gachaActive&&!marketActive){
    e.preventDefault();handInspectActive=true;handInspectFrame=0;sfxSelect();return;
  }

  // Sound toggle with M key
  if(e.code==='KeyM'){
    soundEnabled=!soundEnabled;
    localStorage.setItem('oxark_sound',soundEnabled?'on':'off');
    if(!soundEnabled){stopAmbientNodes();ambientState.currentArea=-1;}
    return;
  }
  // FPS counter toggle with F key
  if(e.code==='KeyF'){
    fpsCounterVisible=!fpsCounterVisible;
    return;
  }

  // Intro tutorial input
  if(introActive){
    if(e.code==='KeyZ'){
      sfxConfirm();introFrame=fr;
      introPage++;
      if(introPage>=INTRO_PAGES.length){
        introActive=false;
        if(sc==='title'){
          // Route to Lobby (Phase D Reborn — Phase C map removed)
          sc='lobby';
          fadeOut(()=>{
            if(typeof enterLobby==='function')enterLobby();
            fadeIn();
          });
        }
        // else: reviewing rules from in-game (sc==='map') — just close the overlay
      }
    }
    if(e.code==='KeyX'&&introPage>0){sfxBack();introPage--;introFrame=fr;}
    return;
  }

  // Multiplayer screen input handling
  if(sc==='title'&&mp.mpScreen!=='off'){
    if(mp.mpScreen==='select'){
      if(e.code==='ArrowUp'){mp.mpMenuIdx=Math.max(0,mp.mpMenuIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){mp.mpMenuIdx=Math.min(2,mp.mpMenuIdx+1);sfxCursor();}
      if(e.code==='KeyZ'){
        if(mp.mpMenuIdx===0){
          // CREATE ROOM
          sfxConfirm();
          const rid=mpGenerateRoomId();
          mp.roomInput='';
          mpConnect(rid,true);
          mp.mpScreen='create';
        }else if(mp.mpMenuIdx===1){
          // JOIN ROOM
          sfxConfirm();
          mp.roomInput='';
          mp.mpScreen='join';
        }else if(mp.mpMenuIdx===2){
          // BACK
          sfxBack();mp.mpScreen='off';
        }
      }
      if(e.code==='KeyX'){mp.mpScreen='off';sfxBack();}
    }else if(mp.mpScreen==='join'){
      // Text input for room code
      if(e.code==='KeyX'){mp.mpScreen='select';sfxBack();}
      else if(e.code==='KeyZ'&&mp.roomInput.length>=4){
        sfxConfirm();mpConnect(mp.roomInput,false);mp.mpScreen='lobby';
      }else if(e.code==='Backspace'){mp.roomInput=mp.roomInput.slice(0,-1);sfxCursor();}
      else if(e.key&&e.key.length===1&&mp.roomInput.length<6){
        mp.roomInput+=e.key.toUpperCase();sfxCursor();
      }
    }else if(mp.mpScreen==='create'){
      if(e.code==='KeyX'){mpDisconnect();mp.mpScreen='select';sfxBack();}
      else if(e.code==='KeyZ'&&mp.connected){mp.mpScreen='lobby';sfxConfirm();}
    }else if(mp.mpScreen==='lobby'){
      if(e.code==='KeyX'){mpDisconnect();mp.mpScreen='select';sfxBack();}
      else if(e.code==='KeyZ'&&mp.playerCount>=2){
        // Start game
        sfxConfirm();
        mpSend({type:'start_game'});
        mp.phase='playing';
        // Replace AI rivals with real players
        if(mp.otherPlayers.length>0){
          pl[1].n=mp.otherPlayers[0].name||'Player 2';
        }
        if(mp.otherPlayers.length>1){
          pl[2].n=mp.otherPlayers[1].name||'Player 3';
        }
        mp.mpScreen='off'; // reset screen state
        fadeOut(()=>{
          if(loadGame()){
            sc='map';showBanner(mapNames[currentMap],AREA_CARD_DESC[currentMap]+' cards found here');
            fadeIn();twSet('Multiplayer game started!');
          }else{
            resetGameState(true);
            // Give starter cards for multiplayer (no tutorial) — one attack, one defense, one flee
            const mpStarters=[4,13,25]; // BARRAGE, GUARD, DASH
            mpStarters.forEach((cid,si)=>{pl[0].cd[si]=cid;pl[0].vault.add(cid);});
            pl[0].cc=3;syncCardCount(0);
            sc='map';currentMap=0;showBanner('TOWN - はじまりのまち',AREA_CARD_DESC[0]);
            fogRevealAll(0);fogSave();
            fadeIn();twSet('Multiplayer started! Starter cards: '+mpStarters.map(id=>CD[id-1].n).join(', ')+'!');
          }
        });
      }
    }
    return;
  }

  // Stake confirmation overlay input
  if(sc==='title'&&stakeConfirmActive){
    if(e.code==='KeyZ'){
      sfxConfirm();
      stakeConfirmActive=false;
      // Reset game ID for a new game, keep for continue
      if(window._stakeAction!=='continue') _sessionGameId=resetOnchainGameId();
      // Fire real on-chain create+join+deposit async; game proceeds immediately
      onchainStartSession();
      if(!stakeDeposited){
        stakeDeposited=true; // UI proceeds while TX is in flight
        lg.push('[ON-CHAIN] Sending stake TX to devnet…');
      }
      // Proceed with the game start that was pending
      if(window._stakeAction==='continue'){
        fadeOut(()=>{
          if(loadGame()){
            sc='map';showBanner(mapNames[currentMap],AREA_CARD_DESC[currentMap]+' cards found here');
            fadeIn();twSet('Welcome back! Stake deposited.');
          }else{
            sc='map';currentMap=0;showBanner('TOWN - はじまりのまち',AREA_CARD_DESC[0]);
            fogRevealAll(0);fogSave();
            fadeIn();twSet('Stake deposited! Collect 60 cards to win the Prize Pool.');
          }
        });
      }else{
        resetGameState(true);
        // Show intro tutorial on title screen, then land in town
        fadeOut(()=>{introActive=true;introPage=0;introFrame=fr;fadeIn();});
      }
    }
    if(e.code==='KeyX'){sfxBack();stakeConfirmActive=false;}
    return;
  }
  // v452 (phase-b2-title): Title options sub-overlay — [X] from Title opens it
  if(sc==='title'&&optionsOverlayOpen){
    if(e.code==='ArrowUp'){optionsMenuIdx=Math.max(0,optionsMenuIdx-1);sfxCursor();}
    if(e.code==='ArrowDown'){optionsMenuIdx=Math.min(2,optionsMenuIdx+1);sfxCursor();}
    if(e.code==='KeyZ'){
      if(optionsMenuIdx===0){
        // BIND / UNBIND VAULT (wallet)
        sfxSelect();
        if(walletConnected){
          disconnectPhantom().then(()=>{lg.push('Wallet disconnected.');});
        }else{
          if(!window.solana||!window.solana.isPhantom){
            twSet('Install Phantom wallet from phantom.app');
          }else{
            connectPhantom().then(addr=>{
              if(addr){twSet('Connected: '+walletAddressTruncated());lg.push('Wallet connected: '+walletAddressTruncated());sfxWalletConnect();showToast('Wallet connected! '+walletAddressTruncated(),'#80d080');}
              else{twSet('Connection cancelled.');showToast('Wallet connection cancelled.','#d08080');}
            }).catch(()=>{twSet('Connection failed.');showError('Wallet connection failed.');});
          }
        }
      }else if(optionsMenuIdx===1){
        // MULTIPLAYER
        sfxSelect();optionsOverlayOpen=false;mp.mpScreen='select';mp.mpMenuIdx=0;
      }else if(optionsMenuIdx===2){
        // CREDITS
        sfxSelect();optionsOverlayOpen=false;creditsActive=true;creditsFrame=0;
      }
    }
    if(e.code==='KeyX'){sfxBack();optionsOverlayOpen=false;}
    return;
  }
  if(sc==='title'){
    // [X] opens options overlay (preview-strict)
    if(e.code==='KeyX'){sfxSelect();optionsOverlayOpen=true;optionsMenuIdx=0;return;}
    const saved=hasSave();
    const maxIdx=saved?1:0; // 2-item (CONTINUE/NEW SEASON) or 1-item (NEW SEASON)
    if(titleMenuIdx>maxIdx)titleMenuIdx=maxIdx; // clamp if save cleared mid-session
    if(e.code==='ArrowUp'){titleMenuIdx=Math.max(0,titleMenuIdx-1);sfxCursor();}
    if(e.code==='ArrowDown'){titleMenuIdx=Math.min(maxIdx,titleMenuIdx+1);sfxCursor();}
    if(e.code==='KeyZ'){
      const doContinue=()=>{
        fadeOut(()=>{
          // Phase D Reborn: skip Phase C map, go directly to Lobby
          sc='lobby';
          if(typeof enterLobby==='function')enterLobby();
          fadeIn();
        });
      };
      const doNewSeason=()=>{
        resetGameState(true);
        // Phase D Reborn: skip intro tutorial, go directly to Lobby
        fadeOut(()=>{sc='lobby';if(typeof enterLobby==='function')enterLobby();fadeIn();});
      };
      if(saved&&titleMenuIdx===0){
        // CONTINUE
        sfxConfirm();
        if(walletConnected&&!stakeDeposited){stakeConfirmActive=true;window._stakeAction='continue';return;}
        doContinue();
      }else{
        // NEW SEASON (idx 1 when saved, idx 0 when not)
        sfxConfirm();
        if(walletConnected&&!stakeDeposited){stakeConfirmActive=true;window._stakeAction='new';return;}
        doNewSeason();
      }
    }
    return;
  }

  // NPC Dialog handling
  if(npcDialogActive){
    if(e.code==='KeyZ'||e.code==='Space'){
      npcDialogIdx+=2;
      if(npcDialogIdx>=npcDialogLines.length){npcDialogActive=false;npcDialogIdx=0;}
      else sfxSelect();
    }
    if(e.code==='KeyX'){npcDialogActive=false;sfxBack();}
    return;
  }

  // Signpost dialog handling
  if(signpostActive){
    if(e.code==='KeyZ'||e.code==='Space'||e.code==='KeyX'){signpostActive=false;sfxBack();}
    return;
  }

  // Dungeon entry confirmation
  if(dungeonConfirmActive){
    if(e.code==='KeyZ'){dungeonConfirmActive=false;sfxConfirm();doMapTransition(dungeonConfirmExit);}
    if(e.code==='KeyX'){dungeonConfirmActive=false;sfxBack();}
    return;
  }

  // T70: Town shop modal input
  if(townShopActive){
    // T71: Dungeon Gate specific input
    if(townShopType==='dungeon_gate'){
      if(dgPhase==='menu'){
        if(e.code==='ArrowUp'){dgMenuIdx=Math.max(0,dgMenuIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){dgMenuIdx=Math.min(2,dgMenuIdx+1);sfxCursor();}
        if(e.code==='KeyZ'){
          // T81: Require locked deck before entering dungeon
          if(dgMenuIdx===0&&!deckIsLocked()){
            dgTxError='Lock your deck first! (NFT TRADING HOUSE → MY DECK → [L])';
            dgPhase='result';sfxBack();
          }else{
            if(dgMenuIdx===0){dgQuickEnter();}
            else if(dgMenuIdx===1){dgCreateSeason();}
            else if(dgMenuIdx===2){dgJoinSeason();}
            sfxSelect();
          }
        }
        if(e.code==='KeyX'){townShopActive=false;townShopType='';dgPhase='menu';sfxBack();}
      }else if(dgPhase==='loading'){
        // no input while loading
      }else{ // result / create / join
        if(e.code==='KeyZ'&&!dgTxError){
          // Success — enter dungeon
          const ex=exits.find(ex=>ex.map===0&&ex.targetMap>0);
          if(ex){townShopActive=false;townShopType='';dgPhase='menu';sfxConfirm();doMapTransition(ex);}
        }
        if(e.code==='KeyX'){dgPhase='menu';dgTxError='';dgTxResult='';sfxBack();}
      }
      return;
    }
    // T72: NFT Trading House input
    if(townShopType==='nft_trading'){
      if(nftTxPhase==='listing'||nftTxPhase==='buying'||nftTxPhase==='cancelling')return; // busy
      if(nftTxPhase==='done'||nftTxPhase==='error'){
        if(e.code==='KeyZ'||e.code==='KeyX'){nftTxPhase='';nftTxResult='';nftTxError='';sfxBack();}
        return;
      }
      if(e.code==='ArrowLeft'&&(townShopTab!==4)){townShopTab=Math.max(0,townShopTab-1);nftSelIdx=0;deckLockPhase='';nftListings=typeof oxarkOnchain!=='undefined'?oxarkOnchain.getListings():[];sfxCursor();return;}
      if(e.code==='ArrowRight'&&(townShopTab!==4)){townShopTab=Math.min(4,townShopTab+1);nftSelIdx=0;deckLockPhase='';nftListings=typeof oxarkOnchain!=='undefined'?oxarkOnchain.getListings():[];sfxCursor();return;}
      if(townShopTab===4){ // REGISTRY tab — grid cursor
        const cols=10;
        if(e.code==='ArrowLeft'){regCursorId=regCursorId>1?regCursorId-1:60;sfxCursor();return;}
        if(e.code==='ArrowRight'){regCursorId=regCursorId<60?regCursorId+1:1;sfxCursor();return;}
        if(e.code==='ArrowUp'){regCursorId=regCursorId>cols?regCursorId-cols:regCursorId+60-cols;sfxCursor();return;}
        if(e.code==='ArrowDown'){regCursorId=regCursorId<=60-cols?regCursorId+cols:regCursorId-60+cols;sfxCursor();return;}
        if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();return;}
        return;
      }
      if(townShopTab===0){ // MY CARDS
        const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push({slot:i,id:pl[0].cd[i]});}
        if(e.code==='ArrowUp'){nftSelIdx=Math.max(0,nftSelIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){nftSelIdx=Math.min(Math.max(0,filled.length-1),nftSelIdx+1);sfxCursor();}
        if(e.code==='ArrowLeft'||e.code==='KeyA'){nftListPriceIdx=Math.max(0,nftListPriceIdx-1);nftListPrice=NFT_LIST_PRICES[nftListPriceIdx];sfxCursor();}
        if(e.code==='ArrowRight'||e.code==='KeyD'){nftListPriceIdx=Math.min(NFT_LIST_PRICES.length-1,nftListPriceIdx+1);nftListPrice=NFT_LIST_PRICES[nftListPriceIdx];sfxCursor();}
        if(e.code==='KeyZ'&&filled.length>0){
          const item=filled[nftSelIdx];if(!item)return;
          if(typeof oxarkOnchain==='undefined'||!oxarkOnchain.listCard){showError('Onchain not available');return;}
          nftTxPhase='listing';
          oxarkOnchain.listCard(item.id,nftListPrice).then(lid=>{
            nftTxResult='Listed '+CD[item.id-1].n+' for '+nftListPrice+' SOL';
            // Remove card from hand (consumed by listing)
            pl[0].cd[item.slot]=0;syncCardCount&&syncCardCount(0);
            nftTxPhase='done';
            lg.push('[NFT] Listed '+CD[item.id-1].n+' for '+nftListPrice+' SOL (id='+lid+')');
          }).catch(err=>{nftTxError=(err&&err.message)||String(err);nftTxPhase='error';sfxBack();});
          sfxSelect();
        }
        if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      }else if(townShopTab===1){ // MARKET
        const vis=nftListings.slice(0,5);
        if(e.code==='ArrowUp'){nftSelIdx=Math.max(0,nftSelIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){nftSelIdx=Math.min(Math.max(0,vis.length-1),nftSelIdx+1);sfxCursor();}
        if(e.code==='KeyZ'&&vis.length>0){
          const l=vis[nftSelIdx];if(!l)return;
          if(typeof oxarkOnchain==='undefined'||!oxarkOnchain.buyCard){showError('Onchain not available');return;}
          nftTxPhase='buying';
          oxarkOnchain.buyCard(l.id).then(listing=>{
            const cr=CD[listing.cardId-1];
            const added=addCardToPlayer&&addCardToPlayer(0,listing.cardId);
            nftTxResult='Bought '+(cr?cr.n:'card')+' for '+listing.priceSol+' SOL';
            nftListings=oxarkOnchain.getListings();
            nftTxPhase='done';
            lg.push('[NFT] Bought '+(cr?cr.n:'card #'+listing.cardId));
          }).catch(err=>{nftTxError=(err&&err.message)||String(err);nftTxPhase='error';sfxBack();});
          sfxSelect();
        }
        if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      }else if(townShopTab===2){ // MY LISTINGS
        const myAddr=walletConnected?(walletAddressTruncated&&walletAddressTruncated()||''):null;
        const myListings=nftListings.filter(l=>myAddr&&l.seller.startsWith(myAddr.slice(0,4)));
        if(e.code==='ArrowUp'){nftSelIdx=Math.max(0,nftSelIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){nftSelIdx=Math.min(Math.max(0,myListings.length-1),nftSelIdx+1);sfxCursor();}
        if(e.code==='KeyZ'&&myListings.length>0){
          const l=myListings[nftSelIdx];if(!l)return;
          if(typeof oxarkOnchain==='undefined'||!oxarkOnchain.cancelListing){showError('Onchain not available');return;}
          nftTxPhase='cancelling';
          oxarkOnchain.cancelListing(l.id).then(listing=>{
            const cr=CD[listing.cardId-1];
            // Return card to hand
            addCardToPlayer&&addCardToPlayer(0,listing.cardId);
            nftTxResult='Cancelled listing for '+(cr?cr.n:'card');
            nftListings=oxarkOnchain.getListings();
            nftTxPhase='done';
            lg.push('[NFT] Cancelled listing for '+(cr?cr.n:'card #'+listing.cardId));
          }).catch(err=>{nftTxError=(err&&err.message)||String(err);nftTxPhase='error';sfxBack();});
          sfxSelect();
        }
        if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      }else{ // MY DECK (tab 3) — T81
        if(deckLockPhase==='saving'||deckLockPhase==='locking')return; // busy
        if(deckLockPhase==='done'||deckLockPhase==='error'){
          if(e.code==='KeyZ'||e.code==='KeyX'){deckLockPhase='';deckLockResult='';deckLockError='';sfxBack();}
          return;
        }
        const handCards=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)handCards.push({slot:i,id:pl[0].cd[i]});}
        if(e.code==='ArrowUp'){nftSelIdx=Math.max(0,nftSelIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){nftSelIdx=Math.min(Math.max(0,handCards.length-1),nftSelIdx+1);sfxCursor();}
        if(e.code==='KeyZ'&&handCards.length>0&&!deckIsLocked()){
          const item=handCards[nftSelIdx];if(!item){sfxBack();return;}
          deckToggleCard(item.id);
          // Save deck to onchain (async, non-blocking)
          if(typeof oxarkOnchain!=='undefined'&&oxarkOnchain.saveDeck){
            oxarkOnchain.saveDeck([...deckCards]).catch(()=>{}); // best-effort
          }
          sfxCursor();
        }
        if(e.code==='KeyL'&&!deckIsLocked()&&deckIsValid()){
          deckLockPhase='locking';
          const doLock=()=>{
            deckLockedUntil=Math.floor(Date.now()/1000)+3600;
            deckSaveLocal();
            deckLockResult='Deck locked for 1 hour!';
            deckLockPhase='done';
            sfxSelect();
            lg.push('[DECK] Locked — '+deckCards.length+' cards, cost '+deckTotalCost());
            tutorialStepDone('deck'); // T84: Axis A tutorial step
          };
          if(typeof oxarkOnchain!=='undefined'&&oxarkOnchain.lockDeck){
            oxarkOnchain.lockDeck().then(doLock).catch(err=>{
              // Fallback to localStorage lock on onchain error
              doLock();
            });
          }else{doLock();}
        }
        if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      }
      return;
    }
    // T73: Item Shop input
    if(townShopType==='item_shop'){
      if(itemShopTxPhase==='loading')return; // busy
      if(itemShopTxPhase==='reveal'){
        if(e.code==='KeyZ'||e.code==='KeyX'){
          // Give card to player
          if(itemShopRevealCard>0){
            const added=addCardToPlayer&&addCardToPlayer(0,itemShopRevealCard);
            if(!added){discardActive=true;discardSelIdx=0;discardPendingCard=itemShopRevealCard;discardSource='wild';}
            else{startCardAcquisition&&startCardAcquisition(itemShopRevealCard-1);}
            checkWinAndTransition&&checkWinAndTransition(500);
          }
          itemShopTxPhase='';itemShopRevealCard=-1;sfxConfirm();
        }
        return;
      }
      if(itemShopTxPhase==='done'||itemShopTxPhase==='error'){
        if(e.code==='KeyZ'||e.code==='KeyX'){itemShopTxPhase='';itemShopResult='';itemShopError='';sfxBack();}
        return;
      }
      if(e.code==='ArrowUp'){itemShopSelIdx=Math.max(0,itemShopSelIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){itemShopSelIdx=Math.min(ITEM_CATALOG.length-1,itemShopSelIdx+1);sfxCursor();}
      if(e.code==='KeyZ'){doBuyItem(ITEM_CATALOG[itemShopSelIdx]);sfxSelect();}
      if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      return;
    }
    // T101: Journal (Progression Hub) input
    if(townShopType==='journal'){
      if(e.code==='ArrowLeft'){progressionTab=Math.max(0,progressionTab-1);sfxCursor();}
      if(e.code==='ArrowRight'){progressionTab=Math.min(2,progressionTab+1);sfxCursor();}
      if(progressionTab===2){  // TITLES tab — navigate + equip
        if(e.code==='ArrowUp'){playerCurrentTitle=Math.max(0,playerCurrentTitle-1);sfxCursor();}
        if(e.code==='ArrowDown'){playerCurrentTitle=Math.min((typeof TITLE_DEFS!=='undefined'?TITLE_DEFS.length:8)-1,playerCurrentTitle+1);sfxCursor();}
        if(e.code==='KeyZ'){if(typeof setTitle==='function'&&setTitle(playerCurrentTitle)){sfxSelect();}else sfxBack();}
      }
      if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
      return;
    }
    if(e.code==='KeyX'){townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack();}
    // Tab navigation fallback
    if(e.code==='ArrowLeft'){townShopTab=Math.max(0,townShopTab-1);sfxCursor();}
    if(e.code==='ArrowRight'){townShopTab=Math.min(2,townShopTab+1);sfxCursor();}
    return;
  }

  // Marketplace
  if(marketActive){
    if(e.code==='ArrowLeft'){marketTab=Math.max(0,marketTab-1);sfxCursor();}
    if(e.code==='ArrowRight'){marketTab=Math.min(MARKET_TABS.length-1,marketTab+1);sfxCursor();}
    if(e.code==='KeyX'){marketActive=false;sfxBack();}
    return;
  }

  // Gacha handling
  if(gachaActive){
    if(gachaPhase==='menu'){
      if(e.code==='ArrowUp'){gachaSelectedTier=Math.max(0,gachaSelectedTier-1);sfxCursor();}
      if(e.code==='ArrowDown'){gachaSelectedTier=Math.min(GACHA_TIERS.length-1,gachaSelectedTier+1);sfxCursor();}
      if(e.code==='KeyZ'){
        // Start gacha spin
        gachaPhase='spinning';gachaSpinFrame=0;
        // Determine result card now (hidden until spin ends)
        gachaResultCard=gachaPickCard(gachaSelectedTier);
        sfxShopTrade();
        lg.push('[GACHA] '+GACHA_TIERS[gachaSelectedTier].name+' ('+GACHA_TIERS[gachaSelectedTier].label+')...');
      }
      if(e.code==='KeyX'){gachaActive=false;sfxBack();}
    }else if(gachaPhase==='result'){
      if(e.code==='KeyZ'||e.code==='KeyX'){
        if(e.code==='KeyZ'&&gachaResultCard>0){
          // Give card to player
          const gAdded=addCardToPlayer(0,gachaResultCard);
          const cr=CD[gachaResultCard-1];
          if(!gAdded){
            // Hand full — show discard prompt
            discardActive=true;discardSelIdx=0;discardPendingCard=gachaResultCard;discardSource='wild';
            twSet('Hand full! Discard a card to make room for '+cr.n+'.');
          }
          lg.push('[GACHA] Got '+cr.n+' ('+RARITY_LABEL[cr.r]+')!');
          // v86: record in history
          gachaHistory.unshift({cardId:gachaResultCard,rarity:cr.r});
          if(gachaHistory.length>8)gachaHistory.pop();
          sfxConfirm();
          checkWinAndTransition(2000);
        }
        gachaActive=false;gachaResultCard=-1;
        sfxBack();
      }
    }
    return;
  }

  // Trading Post handling
  // v74: Synthesis shop input
  if(synthActive){
    if(synthPhase==='result'){
      if(e.code==='KeyX'||e.code==='KeyZ'){synthActive=false;sfxBack();}
      return;
    }
    // Rarity tab navigation with left/right
    if(e.code==='ArrowLeft'){synthRarityFilter=Math.max(1,synthRarityFilter-1);synthSelected=[];sfxCursor();}
    if(e.code==='ArrowRight'){synthRarityFilter=Math.min(4,synthRarityFilter+1);synthSelected=[];sfxCursor();}
    if(e.code==='KeyZ'){
      // If 3 selected → synthesize
      if(synthSelected.length===3){doSynthesis();return;}
      // Else select next available card of filtered rarity
      const avail=getPlayerFilledSlots().filter(s=>{
        const cid=pl[0].cd[s];return cid>0&&CD[cid-1]?.r===synthRarityFilter&&!synthSelected.includes(s);
      });
      if(avail.length>0){synthSelected.push(avail[0]);sfxSelect();}
    }
    if(e.code==='KeyX'){
      if(synthSelected.length>0){synthSelected.pop();sfxBack();}
      else{synthActive=false;sfxBack();}
    }
    return;
  }

  if(shopActive){
    const filled=getPlayerFilledSlots();
    if(shopPhase==='list'){
      if(filled.length>0){
        if(e.code==='ArrowUp'){shopSelectedIdx=Math.max(0,shopSelectedIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){shopSelectedIdx=Math.min(filled.length-1,shopSelectedIdx+1);sfxCursor();}
        if(e.code==='KeyZ'){shopPhase='confirm';sfxSelect();}
      }
      if(e.code==='KeyX'){shopActive=false;sfxBack();}
    }else if(shopPhase==='confirm'){
      if(e.code==='KeyZ'){doShopTrade();}
      if(e.code==='KeyX'){shopPhase='list';sfxBack();}
    }else if(shopPhase==='result'){
      if(e.code==='KeyZ'){shopPhase='list';shopSelectedIdx=0;sfxSelect();}
      if(e.code==='KeyX'){shopActive=false;sfxBack();}
    }
    return;
  }

  // Random event dismiss
  if(randomEventActive){
    if(e.code==='KeyZ'||e.code==='Space'){randomEventActive=false;}
    return;
  }

  // Discard overlay handling
  if(discardActive){
    if(e.code==='ArrowUp'){discardSelIdx=Math.max(0,discardSelIdx-1);sfxCursor();}
    if(e.code==='ArrowDown'){discardSelIdx=Math.min(HAND_SIZE-1,discardSelIdx+1);sfxCursor();}
    if(e.code==='KeyZ'){
      const slot=discardSelIdx;
      if(pl[0].cd[slot]>0){
        sfxConfirm();
        const discarded=pl[0].cd[slot];
        if(discardPendingCard>0){
          // Remove old card, place pending card in its slot
          pl[0].cd[slot]=0;cardTimers[slot]=0;decayWarn[slot]=0;syncCardCount(0);
          // Ensure vault updated (idempotent — addCardToPlayer already did this in most paths)
          if(pl[0].vault&&!pl[0].vault.has(discardPendingCard)){
            pl[0].vault.add(discardPendingCard);sfxUniqueCardSting();triggerProgressPulse();stats.cardsCollected++;
          }
          pl[0].cd[slot]=discardPendingCard;cardTimers[slot]=inDungeon?Date.now():0;decayWarn[slot]=0;syncCardCount(0);
          lg.push('Discarded '+CD[discarded-1].n+', got '+CD[discardPendingCard-1].n+'!');
          discardActive=false;
          if(discardSource==='wild'||discardSource==='menu'){startCardAcquisition(discardPendingCard-1);}
          discardPendingCard=-1;discardSource='';
          checkWinAndTransition(500);
        }else{
          // Menu discard: just remove the card
          pl[0].cd[slot]=0;cardTimers[slot]=0;decayWarn[slot]=0;syncCardCount(0);
          lg.push('Discarded '+CD[discarded-1].n+'!');
          discardActive=false;discardPendingCard=-1;discardSource='';
        }
      }else{sfxBack();}
    }
    if(e.code==='KeyX'){
      sfxBack();
      if(discardPendingCard>0){
        // Canceling means rejecting the new card
        lg.push('Skipped '+CD[discardPendingCard-1].n+' (hand full).');
      }
      discardActive=false;discardPendingCard=-1;discardSource='';
      if(wildEncounterActive){wildEncounterActive=false;cardAcqDone=true;}
    }
    return;
  }

  // Wild encounter - wait
  if(wildEncounterActive)return;

  // Battle encounter exclamation or wipe - wait
  if(encounterExclActive||wipeActive)return;

  if(sc==='map'&&inBuilding){
    // Building interior input
    if(buildingNpcDialog){
      if(e.code==='KeyZ'||e.code==='Space'){
        buildingNpcIdx+=2;
        if(buildingNpcIdx>=buildingNpcLines.length){buildingNpcDialog=false;buildingNpcIdx=0;}
        else sfxSelect();
      }
      if(e.code==='KeyX'){buildingNpcDialog=false;sfxBack();}
      return;
    }
    if(infoBrokerConfirm){
      if(e.code==='KeyZ'){
        infoBrokerConfirm=false;
        // Check if player has a card to pay
        const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
        if(filled.length>0){
          const slot=filled[Math.floor(Math.random()*filled.length)];
          const lost=pl[0].cd[slot];pl[0].cd[slot]=0;syncCardCount(0);
          const rivalArea=mapNames[rivalMaps[0]]||'???';
          const hunterArea=mapNames[rivalMaps[1]]||'???';
          infoBrokerResult='Rival is in '+rivalArea+'. Hunter is in '+hunterArea+'.';
          infoBrokerResultTimer=240;
          lg.push('Spy Master: Rival='+rivalArea+', Hunter='+hunterArea+' (paid '+CD[lost-1].n+')');
          sfxConfirm();
        }else{
          infoBrokerResult='You have no cards to pay!';
          infoBrokerResultTimer=120;
        }
      }
      if(e.code==='KeyX'){infoBrokerConfirm=false;sfxBack();}
      return;
    }
    if(x402HowItWorksActive){
      if(e.code==='KeyZ'||e.code==='KeyX'){x402HowItWorksActive=false;sfxBack();}
      return;
    }
    if(agentMarketplaceActive){
      if(e.code==='KeyZ'||e.code==='KeyX'){agentMarketplaceActive=false;sfxBack();}
      return;
    }
    if(x402ShopOpen){
      if(x402ShopLoading)return; // wait for response
      if(e.code==='ArrowUp'){x402ShopIdx=Math.max(0,x402ShopIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){x402ShopIdx=Math.min(x402ShopItems.length-1,x402ShopIdx+1);sfxCursor();}
      if(e.code==='KeyZ'){
        const item=x402ShopItems[x402ShopIdx];
        if(item.endpoint==='_agentMarketplace'){agentMarketplaceActive=true;sfxSelect();return;}
        if(item.isInfo){x402HowItWorksActive=true;sfxSelect();return;}
        const cost=item.cardCost!==undefined?item.cardCost:1;
        const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
        if(cost>0&&filled.length<cost){
          x402ShopResult='Not enough cards! Need '+cost+'.';
          x402ShopResultTimer=120;sfxBack();
        }else{
          // Pay cards if cost > 0 (save for refund on error)
          const paidCards=[];
          for(let c=0;c<cost;c++){
            if(filled.length>c){paidCards.push(pl[0].cd[filled[c]]);pl[0].cd[filled[c]]=0;syncCardCount(0);}
          }
          x402ShopLoading=true;
          x402PushState().then(()=>x402FetchIntel(item.endpoint)).then(data=>{
            x402ShopLoading=false;
            if(!data){
              // Refund paid cards on server error
              for(let c=0;c<cost;c++){if(c<filled.length){pl[0].cd[filled[c]]=paidCards[c];syncCardCount(0);}}
              x402ShopResult='Server error. Cards refunded.';
              x402ShopResultTimer=150;sfxBack();return;
            }
            // Format response based on endpoint type (matches agent-broker.js response schema)
            if(item.endpoint.startsWith('/intel/location')){
              const who=data.name||'?';
              const where=data.floorName||data.floor||'?';
              const drops=data.floorDrops?(' — '+data.floorDrops):'';
              x402ShopResult=who+' is on '+where+drops;
              lg.push('x402 Intel: '+who+' at '+where);
            }else if(item.endpoint.startsWith('/intel/hand')){
              const who=data.name||'?';
              const unique=data.uniqueCount??data.totalHeld??0;
              const cardList=data.cards?data.cards.slice(0,6).map(c=>'#'+c.cardId).join(' '):'none';
              x402ShopResult=who+' holds '+unique+' unique cards. '+cardList;
              lg.push('x402 Intel: '+who+' hand ('+unique+' unique) = '+cardList);
            }else if(item.endpoint.startsWith('/intel/strategy')){
              const act=data.recommendedAction||'?';
              const why=data.reasoning||'';
              const conf=data.confidence?(' ('+Math.round(data.confidence*100)+'%)'):'';
              x402ShopResult=act+conf+': '+why;
              lg.push('x402 Strategy: '+act+' — '+why);
            }else if(item.endpoint.startsWith('/intel/market')){
              const avail=data.availableCards??data.totalCards??0;
              x402ShopResult='Available: '+avail+'/60 cards. See log.';
              if(data.byFloor)data.byFloor.forEach(f=>lg.push('  '+f.floor+': '+f.available+'/'+f.total+' available'));
              lg.push('x402 Market: '+avail+' cards unclaimed');
            }
            x402ShopResultTimer=300;sfxConfirm();
          }).catch(()=>{x402ShopLoading=false;x402ShopResult='Connection lost.';x402ShopResultTimer=120;sfxBack();});
        }
      }
      if(e.code==='KeyX'){x402ShopOpen=false;sfxBack();}
      return;
    }
    if(x402ShopResultTimer>0){
      if(e.code==='KeyZ'||e.code==='KeyX'){x402ShopResultTimer=0;sfxBack();}
      return;
    }
    if(e.code==='KeyX'){exitBuilding();return;}
    // Movement in building
    const bm=getBuildingMap();
    let bnx=buildingPlayerX,bny=buildingPlayerY;
    if(e.code==='ArrowUp'){bny--;buildingPlayerDir=2;}
    if(e.code==='ArrowDown'){bny++;buildingPlayerDir=0;}
    if(e.code==='ArrowLeft'){bnx--;buildingPlayerDir=1;}
    if(e.code==='ArrowRight'){bnx++;buildingPlayerDir=3;}
    if(bnx!==buildingPlayerX||bny!==buildingPlayerY){
      if(bnx>=0&&bnx<BUILDING_W&&bny>=0&&bny<BUILDING_H){
        const bt=bm[bny][bnx];
        if(bt===4){
          // Exit
          exitBuilding();return;
        }
        if(buildingTileWalkable(bt)){
          buildingPlayerX=bnx;buildingPlayerY=bny;sfxStep();
        }
      }
    }
    if(e.code==='KeyZ'){
      // Interact with NPC in building
      let fx=buildingPlayerX,fy=buildingPlayerY;
      if(buildingPlayerDir===0)fy++;else if(buildingPlayerDir===2)fy--;
      else if(buildingPlayerDir===1)fx--;else if(buildingPlayerDir===3)fx++;
      if(fx>=0&&fx<BUILDING_W&&fy>=0&&fy<BUILDING_H){
        const bt=bm[fy][fx];
        if(bt===5||bt===2){
          // Adjacent to NPC or counter
          if(buildingType==='shop'){
            openCardShop();
          }else if(buildingType==='info'){
            // Spy Master interaction — x402 shop or legacy card payment
            if(x402Available){
              x402ShopOpen=true;x402ShopIdx=0;x402ShopLoading=false;
              x402PushState();
              sfxSelect();
            }else{
              const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
              if(filled.length>0){
                infoBrokerConfirm=true;
                sfxSelect();
              }else{
                buildingNpcDialog=true;
                buildingNpcLines=[
                  'I sell intelligence.','Real-time. Micropayments','via x402 protocol.',
                  'Each query costs a','fraction of USDC. Your AI','agent can buy intel.',
                  'Connect your wallet','and I\'ll show you','what I know.'
                ];
                buildingNpcIdx=0;
                buildingNpcName='Spy Master';
                sfxConfirm();
              }
            }
          }
        }
      }
    }
    return;
  }

  if(sc==='map'){
    if(e.code==='Space'){mo=!mo;mi=0;menuOpenFrame=0;sfxSelect();if(!_isMobile){if(mo){pxOpenMenu();pxMenuDim.visible=true;}else{pxCloseMenu();pxMenuDim.visible=false;}}return;}
    if(mo){
      if(e.code==='ArrowUp'){mi=Math.max(0,mi-1);sfxCursor();}
      if(e.code==='ArrowDown'){mi=Math.min(11,mi+1);sfxCursor();}
      if(e.code==='KeyZ'){
        sfxConfirm();const s=['crd','map','log']; // BATTLE removed — only via dungeon encounter
        if(mi===11)mo=false;
        else if(mi===3){
          // STATS
          mo=false;menuOpenFrame=0;
          sc='stats';
        }
        else if(mi===4){
          // USE CARD on map
          mo=false;menuOpenFrame=0;
          openMapCardUse();
        }
        else if(mi===5){
          // DISCARD
          const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
          if(filled.length>0){
            discardActive=true;discardSelIdx=0;discardPendingCard=-1;discardSource='menu';
            mo=false;menuOpenFrame=0;
          }else{twSet('No cards to discard!');mo=false;menuOpenFrame=0;}
        }
        else if(mi===6){
          // WALLET
          mo=false;menuOpenFrame=0;
          if(walletConnected){
            disconnectPhantom().then(()=>{twSet('Wallet disconnected.');lg.push('Wallet disconnected.');});
          }else{
            if(!window.solana||!window.solana.isPhantom){
              twSet('Install Phantom wallet from phantom.app');
            }else{
              connectPhantom().then(addr=>{
                if(addr){twSet('Connected: '+walletAddressTruncated());lg.push('Wallet connected: '+walletAddressTruncated());}
                else{twSet('Connection cancelled.');}
              }).catch(()=>{twSet('Connection failed.');});
            }
          }
        }
        else if(mi===7){
          // TEXT SPEED
          textSpeedIdx=(textSpeedIdx+1)%3;
          localStorage.setItem('oxark_textspeed',String(textSpeedIdx));
          twSet('Text speed: '+TEXT_SPEED_LABELS[textSpeedIdx]);
          sfxCursor();
        }
        else if(mi===8){
          // SAVE
          saveGame();saveStats();
          twSet('Game saved!');
          mo=false;menuOpenFrame=0;
        }
        else if(mi===9){
          // RULES: show intro tutorial again
          mo=false;menuOpenFrame=0;
          introActive=true;introPage=0;introFrame=fr;
        }
        else if(mi===10){
          // NEW GAME: reset all state
          resetGameState(true);
          fadeOut(()=>{sc='title';mo=false;fadeIn();ub();});
        }
        else{fadeOut(()=>{sc=s[mi];mo=false;fadeIn();ub();});}
      }
      if(e.code==='KeyX'){mo=false;menuOpenFrame=0;sfxBack();}
    }else{
      // Map card use overlay input
      if(mapCardUseActive){
        if(mapCardDirSelect){
          if(e.code==='ArrowUp'){mapCardDirIdx=2;sfxCursor();}
          if(e.code==='ArrowDown'){mapCardDirIdx=0;sfxCursor();}
          if(e.code==='ArrowLeft'){mapCardDirIdx=1;sfxCursor();}
          if(e.code==='ArrowRight'){mapCardDirIdx=3;sfxCursor();}
          if(e.code==='KeyZ'){sfxConfirm();executeDirCard(mapCardDirIdx);}
          if(e.code==='KeyX'){mapCardDirSelect=false;mapCardUseActive=false;sfxBack();}
          return;
        }
        const usable=getMapUsableCards();
        if(e.code==='ArrowUp'){mapCardUseIdx=Math.max(0,mapCardUseIdx-1);sfxCursor();}
        if(e.code==='ArrowDown'){mapCardUseIdx=Math.min(usable.length-1,mapCardUseIdx+1);sfxCursor();}
        if(e.code==='KeyZ'){
          sfxConfirm();
          const item=usable[mapCardUseIdx];
          executeMapCard(item.cardId,item.slot);
        }
        if(e.code==='KeyX'){mapCardUseActive=false;sfxBack();}
        return;
      }

      // Fountain dialog input
      if(fountainActive&&fountainConfirm){
        if(e.code==='KeyZ'){fountainConfirm=false;doFountainExchange();}
        if(e.code==='KeyX'){fountainConfirm=false;fountainActive=false;sfxBack();}
        return;
      }

      // Fishing input
      if(fishingActive){
        if(fishingPhase==='bite'&&e.code==='KeyZ'){
          fishingCatchCard();
          return;
        }
        if(e.code==='KeyX'){fishingActive=false;sfxBack();}
        return;
      }

      // Z = interact / wait (dungeon)
      if(e.code==='KeyZ'){
        // T70: open town shop modal when adjacent to an interactable building
        if(nearInteractable&&!inDungeon&&currentMap===0){
          if(nearInteractable.id==='dungeon_gate'){
            // Dungeon gate — use existing confirm flow (T71 will enhance this)
            const glowExit=exits.find(ex=>ex.map===currentMap&&maps[currentMap]&&
              maps[currentMap][ex.ty]&&maps[currentMap][ex.ty][ex.tx]===24);
            if(glowExit){dungeonConfirmActive=true;dungeonConfirmExit=glowExit;sfxSelect();return;}
          }
          townShopActive=true;townShopType=nearInteractable.id;townShopTab=0;townShopOpenFrame=fr;
          nftSelIdx=0;nftTxPhase='';nftTxResult='';nftTxError='';
          if(nearInteractable.id==='nft_trading')nftListings=typeof oxarkOnchain!=='undefined'?oxarkOnchain.getListings():[];
          sfxSelect();return;
        }
        if(checkNPCInteraction())return;
        if(checkSignpostInteraction())return;
        if(checkBuildingEntry())return;
        if(checkPuzzleInteraction())return;
        if(checkObjectInteraction())return;
        // Fishing check
        if(canFish()){startFishing();return;}
        // v155: In dungeon with no interaction — Z = wait (pass turn, rivals advance one step)
        if(inDungeon){
          processDungeonTurn();
          sfxStep&&sfxStep();
          return;
        }
      }

      let mdx=0,mdy=0;
      if(e.code==='ArrowUp')mdy=-1;
      if(e.code==='ArrowDown')mdy=1;
      if(e.code==='ArrowLeft')mdx=-1;
      if(e.code==='ArrowRight')mdx=1;
      if(mdx!==0||mdy!==0){
        _moveRepeatAccumMs=0; // reset so processHeldMovement waits full interval before firing
        if(tryMovePlayer(mdx,mdy)){
          checkTreasure();
          if(!cardAcqActive&&!randomEventActive&&shadowStepsLeft<=0)tryWildEncounter();
        }
      }
    }
  }

  if(sc==='act'){
    // QTE input during resolving phase
    if(battlePhase==='resolving'&&!qteActive&&e.code==='KeyZ'&&bpResolveQueue&&bpResolveQueue.length>0){
      // v335: Z skips remaining resolve events when at least 1 event already shown
      if(fr-bpFrame>=50){bpFrame=fr-bpResolveQueue.length*50;}
    } else if(battlePhase==='resolving'&&qteActive&&!qteKeyPressed&&e.code==='KeyZ'){
      qteKeyPressed=true;qteActive=false;qteSuccess=true;
      sfxQteSuccess();
      if(qteType==='defend'){
        qteResultText='BLOCKED!';qteResultTimer=40;
        // Halve steal damage: give back stolen card if possible
        // (The steal already happened, so we give a pity boost instead)
        sp.b=Math.min(sp.b+1,3);
        lg.push('QTE success! Barrier charge restored!');
      }else{
        qteResultText='BONUS!';qteResultTimer=40;
        // Attack bonus: extra steal charge
        sp.s=Math.min(sp.s+1,3);
        lg.push('QTE success! Steal charge bonus!');
      }
    }
    // T113: in-battle card detail modal (close with X or Z)
    if(bpCardInspectActive){
      if(e.code==='KeyX'||e.code==='KeyZ'){bpCardInspectActive=false;bpCardInspectId=0;sfxBack();}
      return;
    }
    if(battlePhase==='select'&&bpCardSelectActive){
      // Card selection for USE CARD
      const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
      if(e.code==='ArrowUp'){bpCardSelectIdx=Math.max(0,bpCardSelectIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){bpCardSelectIdx=Math.min(filled.length-1,bpCardSelectIdx+1);sfxCursor();}
      // T113: [A] = inspect selected card
      if(e.code==='KeyA'&&filled.length>0){
        const _cid=pl[0].cd[filled[bpCardSelectIdx]]||0;
        if(_cid>0){bpCardInspectActive=true;bpCardInspectId=_cid;sfxSelect();}
        return;
      }
      if(e.code==='KeyZ'){
        sfxConfirm();
        bpAction=4;bpCardSelectActive=false;
        // Store which slot to use
        bpSelectedCardSlot=filled[bpCardSelectIdx];
        battlePhase='confirming';bpFrame=fr;
      }
      if(e.code==='KeyX'){bpCardSelectActive=false;sfxBack();}
    }else if(battlePhase==='select'&&bpTargetSelectActive){
      // Target selection for STEAL/SCOUT
      if(e.code==='ArrowUp'||e.code==='ArrowDown'){bpTargetSelectIdx=bpTargetSelectIdx===1?2:1;sfxCursor();}
      if(e.code==='KeyZ'){
        sfxConfirm();bpTargetSelectActive=false;
        bpAction=bpPendingAction;bpSelectedTarget=bpTargetSelectIdx;
        battlePhase='confirming';bpFrame=fr;
      }
      if(e.code==='KeyX'){bpTargetSelectActive=false;sfxBack();}
    }else if(battlePhase==='select'){
      // 2x2 grid navigation: 0=DRAW(TL), 1=STEAL(TR), 2=BARRIER(BL), 3=SCOUT(BR), 4=USE CARD(below)
      if(e.code==='ArrowUp'){
        if(ai===4){ai=2;sfxCursor();}
        else if(ai>=2){ai-=2;sfxCursor();}
      }
      if(e.code==='ArrowDown'){
        if(ai<2){ai+=2;sfxCursor();}
        else if(ai<4){ai=4;sfxCursor();}
      }
      if(e.code==='ArrowLeft'){
        if(ai===1){ai=0;sfxCursor();}
        else if(ai===3){ai=2;sfxCursor();}
      }
      if(e.code==='ArrowRight'){
        if(ai===0){ai=1;sfxCursor();}
        else if(ai===2){ai=3;sfxCursor();}
      }
      if(e.code==='KeyZ'){
        if(!isActionAvailable(ai)){sfxBack();return;}
        if(ai===4){
          // USE CARD: open card selection
          bpCardSelectActive=true;bpCardSelectIdx=0;sfxSelect();
        }else if(ai===1||ai===3){
          // STEAL or SCOUT: open target selection
          bpTargetSelectActive=true;bpTargetSelectIdx=1;bpPendingAction=ai;sfxSelect();
        }else{
          sfxConfirm();bpAction=ai;
          mpBroadcastBattleAction(ai,bpSelectedTarget);
          battlePhase='confirming';bpFrame=fr;
        }
      }
    }else if(battlePhase==='result'){
      if(e.code==='KeyZ'){
        sfxConfirm();
        // Flee card: skip round increment, go directly to map
        if(bpResolveQueue&&bpResolveQueue._escaped){
          saveGame();
          stopBattleBGM(); // T64
          startWipe('vslide',16,()=>{
            sc='map';mo=false;battlePhase='select';encounterCooldown=600;ub();
            twSet('Escaped safely!');
            startWipe('vslide_out',16);
          });
          return;
        }
        // Player HP defeat: lose weakest card to the rival who last stole, retreat
        if(bpResolveQueue&&bpResolveQueue._playerDefeated&&!bpRdIncremented){
          bpRdIncremented=true;rd++;roundsThisRun++;
          addXP(XP_REWARDS.battle_loss||15); // T115: consolation XP on defeat
          // Lose the weakest (lowest rarity) card in hand
          let worstSlot=-1,worstRar=99;
          for(let i=0;i<HAND_SIZE;i++){
            const cid=pl[0].cd[i];
            if(cid>0&&CD[cid-1].r<worstRar){worstRar=CD[cid-1].r;worstSlot=i;}
          }
          if(worstSlot>=0){
            const lostId=pl[0].cd[worstSlot];
            const winnerIdx=(bpRivalActions[0]===1)?1:2;
            addCardToPlayer(winnerIdx,lostId);
            pl[0].cd[worstSlot]=0;pl[0].cc=pl[0].cd.filter(c=>c>0).length;
            // v308: context-aware winner quip (analyzes bpResolveQueue events)
            const _quip=pl[winnerIdx].n+': "'+(_pickDefeatContext(bpResolveQueue,winnerIdx)||(winnerIdx===1?_VEGA_WIN:_MIRA_WIN)[0])+'"';
            lg.push('DEFEATED! Lost '+CD[lostId-1].n+' to '+pl[winnerIdx].n+'. '+_quip);
            twSet('Defeated! Lost '+CD[lostId-1].n+'... '+_quip);
          }else{lg.push('DEFEATED! No cards to lose.');}
          saveGame();
          startWipe('vslide',16,()=>{
            sc='map';mo=false;battlePhase='select';encounterCooldown=600;
            bpHP=[BATTLE_HP_MAX,BATTLE_HP_MAX,BATTLE_HP_MAX];
            startWipe('vslide_out',16);ub();
          });
          return;
        }
        // Rival KO: KO'd rivals immediately surrender all cards to player
        if(bpResolveQueue&&(bpResolveQueue._rival1KO||bpResolveQueue._rival2KO)){
          // v287/v295: KO quip (module-scope arrays, for loop replaces forEach)
          for(let ri=1;ri<=2;ri++){
            const key=ri===1?'_rival1KO':'_rival2KO';
            if(!bpResolveQueue[key])continue;
            bpResolveQueue[key]=false;
            for(let i=0;i<HAND_SIZE;i++){
              const cid=pl[ri].cd[i];
              if(cid>0){addCardToPlayer(0,cid);pl[ri].cd[i]=0;}
            }
            pl[ri].cc=0;
            const _kp=ri===1?_VEGA_KO:_MIRA_KO;
            const _kq=_kp[Math.floor(Math.random()*_kp.length)];
            lg.push(pl[ri].n+' KO\'d! All cards claimed! '+pl[ri].n+': "'+_kq+'"');
            twSet(pl[ri].n+' KO\'d! "'+_kq+'"');
            bpHP[ri]=0;
          }
        }
        if(!bpRdIncremented){
          // v90: record this round's actions before incrementing rd
          {
            // v295: effect-field check replaces .map().join().includes() per round
            let gotCard=false,lostCard=false;
            if(bpResolveQueue){for(let _rei=0;_rei<bpResolveQueue.length;_rei++){const _eff=bpResolveQueue[_rei].effect||'';if(_eff==='steal_get'||_eff==='card_get')gotCard=true;else if(_eff==='card_lost'||_eff==='card_get_rival')lostCard=true;}}
            battleRoundHistory.unshift({rd:rd,pa:bpAction,r1a:bpRivalActions[0],r2a:bpRivalActions[1],got:gotCard,lost:lostCard});
            if(battleRoundHistory.length>4)battleRoundHistory.pop();
            // v284: maintain running net for per-frame momentum strip (avoids reduce per frame)
            _battleRoundNet=0;for(let _bni=0;_bni<battleRoundHistory.length;_bni++){const _bnh=battleRoundHistory[_bni];_battleRoundNet+=(_bnh.got?1:0)-(_bnh.lost?1:0);}
          }
          bpRdIncremented=true;
          rd++;roundsThisRun++;
          // Fire resolve_round on-chain (fire-and-forget; doesn't block UI)
          if(walletConnected&&window.oxarkOnchain){
            window.oxarkOnchain.resolveRound(_sessionGameId,[window.solana.publicKey.toBase58()])
              .then(sig=>logOnchain('resolve_round TX:'+sig.slice(0,8)+'..'))
              .catch(()=>{});
          }
          // v79: track survive mission
          if(runMission&&runMission.type==='survive'&&!runMission.completed){
            runMission.progress=roundsThisRun;
            if(roundsThisRun>=runMission.goal){runMission.completed=true;sfxStreakUp();}
          }
          // Every 10 rounds: recharge 1 depleted spell (prevents late-game stalemate)
          if(rd%10===0){
            let recharged=false;
            if(sp.s<2){sp.s++;recharged=true;}
            if(sp.b<3){sp.b++;recharged=true;}
            if(sp.c<2){sp.c++;recharged=true;}
            if(recharged){lg.push('R'+rd+': Spell energy restored!');}
          }
        }
        // Check if there's a pending draw card needing discard (only on first Z press)
        if(bpResolveQueue&&bpResolveQueue._pendingDrawCard>0){
          const pendCard=bpResolveQueue._pendingDrawCard;
          bpResolveQueue._pendingDrawCard=0;
          discardActive=true;discardSelIdx=0;discardPendingCard=pendCard;discardSource='wild';
        }
        saveGame();
        if(playerHasAllSixty()){checkWinAndTransition(0);}
        else if(!discardActive){
          // Battle-to-map: quick slide-down wipe
          startWipe('vslide',16,()=>{
            sc='map';mo=false;battlePhase='select';encounterCooldown=300;ub();
            startWipe('vslide_out',16);
          });
        }
      }
    }
  }

  // Story sequence input (Z to skip)
  if(false){ // story system removed
    if(e.code==='KeyZ'){}
    return;
  }

  // Credits screen input
  if(sc==='title'&&creditsActive){
    if(e.code==='KeyX'||e.code==='KeyZ'){creditsActive=false;creditsFrame=0;sfxBack();}
    return;
  }

  // Card collection screen input (page navigation)
  if(sc==='crd'){
    // v75: Card detail panel takes priority
    if(crdDetailActive){
      if(e.code==='KeyX'||e.code==='KeyZ'){crdDetailActive=false;sfxBack();}
      return;
    }
    // Cursor navigation (4 cols × 3 rows)
    if(e.code==='ArrowRight'){
      const maxOnPage=Math.min(CRD_PER_PAGE,CD.length-crdPage*CRD_PER_PAGE)-1;
      if(crdCursor%CRD_COLS<CRD_COLS-1&&crdCursor<maxOnPage){crdCursor++;sfxCursor();}
      else{crdPage=Math.min(CRD_MAX_PAGE,crdPage+1);crdCursor=0;sfxCursor();}
    }
    if(e.code==='ArrowLeft'){
      if(crdCursor%CRD_COLS>0){crdCursor--;sfxCursor();}
      else if(crdPage>0){crdPage--;crdCursor=CRD_COLS-1;sfxCursor();}
    }
    if(e.code==='ArrowUp'){
      if(crdCursor>=CRD_COLS){crdCursor-=CRD_COLS;sfxCursor();}
    }
    if(e.code==='ArrowDown'){
      const maxOnPage=Math.min(CRD_PER_PAGE,CD.length-crdPage*CRD_PER_PAGE)-1;
      if(crdCursor+CRD_COLS<=maxOnPage){crdCursor+=CRD_COLS;sfxCursor();}
    }
    if(e.code==='KeyZ'){crdDetailActive=true;sfxSelect();}
    if(e.code==='KeyX'){sfxBack();sc='map';ub();}
    return;
  }

  // Log screen input (scroll + back)
  if(sc==='log'){
    if(e.code==='ArrowUp'){logScrollOff=Math.min(logScrollOff+1,Math.max(0,lg.length-8));sfxCursor();}
    if(e.code==='ArrowDown'){logScrollOff=Math.max(0,logScrollOff-1);sfxCursor();}
    if(e.code==='KeyX'||e.code==='KeyZ'){sfxBack();logScrollOff=0;sc='map';ub();}
    return;
  }

  // Stats screen input
  if(sc==='stats'){
    if(e.code==='KeyX'||e.code==='KeyZ'){sfxBack();sc='map';ub();}
    return;
  }

  if(sc==='victory'){
    const waitTime=gameOverTimesUp?140:170;
    if((fr-victoryFrame)>waitTime){
      // C — claim prize: calls real on-chain claim_prize (requires game Finished on-chain)
      if(e.code==='KeyC'&&playerHasAllSixty()&&walletConnected&&!victoryClaimed){
        sfxConfirm();
        victoryClaimed=true; // optimistic UI
        screenShake(2,6);
        lg.push('[ON-CHAIN] Claiming prize…');
        (window.oxarkOnchain
          ? window.oxarkOnchain.claimPrize(_sessionGameId)
          : Promise.reject(new Error('onchain not loaded'))
        ).then(sig=>{
          victoryClaimedTx=sig;
          lg.push('[ON-CHAIN] Prize claimed! TX: '+sig.slice(0,12)+'..');
        }).catch(e=>{
          // Game may not be Finished on-chain yet (requires program upgrade for solo)
          victoryClaimedTx='sim:'+generateFakeTxSig();
          lg.push('[ON-CHAIN] Claim sent (pending upgrade): '+((e&&e.message)||'').slice(0,40));
        });
        return;
      }
      // M — mint all collected cards as NFTs (mint_solo_card, no game completion needed)
      if(e.code==='KeyM'&&playerHasAllSixty()&&!victoryMinted&&!victoryMinting){
        sfxSelect();
        victoryMinting=true;victoryMintProgress=0;
        const allCards=[...pl[0].vault];
        let idx=0;
        async function mintNext(){
          if(idx>=allCards.length){
            victoryMinted=true;victoryMinting=false;
            sfxVictory();
            lg.push('[ON-CHAIN] Minted '+allCards.length+' card NFTs!');
            return;
          }
          const cardId=allCards[idx++];
          const cr=CD[cardId-1];
          victoryMintProgress=idx;
          let sig;
          if(walletConnected&&window.oxarkOnchain){
            try{sig=await window.oxarkOnchain.mintCardWithMetadata(cardId);}catch(_){}
          }
          if(!sig){sig='sim:'+generateFakeTxSig();}
          lg.push('[NFT] '+cr.n+' ('+RARITY_LABEL[cr.r]+') TX:'+sig.slice(0,12)+'..');
          setTimeout(mintNext,walletConnected?1200:60);
        }
        mintNext();
        return;
      }
      // v420: T — share result on X (Twitter)
      if(e.code==='KeyT'){
        sfxSelect();
        const vaultSz=pl[0].vault?pl[0].vault.size:0;
        const tweetText=vaultSz>=60
          ?'🎴 I broke the seal in 0xARK — all 60 cards collected on #Solana! ⚓ #SolanaHackathon'
          :'🎴 Playing 0xARK — '+vaultSz+'/60 cards collected on Solana! ⚓ #SolanaHackathon';
        const url='https://r0ze998.github.io/0xark';
        window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(tweetText)+'&url='+encodeURIComponent(url),'_blank','noopener,noreferrer');
        return;
      }
      if(e.code==='KeyZ'){
        // Play again - reset all state
        sfxConfirm();
        gameOverTimesUp=false;
        resetGameState(false);
        fadeOut(()=>{sc='map';mo=false;showBanner('TOWN - はじまりのまち',AREA_CARD_DESC[0]);
          fogRevealAll(0);fogSave();
          fadeIn();twSet('Welcome back! Collect all 60 cards to win!');ub();});
      }
      if(e.code==='KeyX'){sfxBack();gameOverTimesUp=false;fadeOut(()=>{sc='title';fadeIn();ub();});}
    }
    return;
  }

  if(e.code==='KeyX'&&sc!=='title'&&sc!=='victory'&&sc!=='stats'){
    if(sc==='act'&&battlePhase!=='select')return;
    sfxBack();fadeOut(()=>{sc='map';mo=false;battlePhase='select';fadeIn();ub();});
  }
});

function ss(s){sfxSelect();fadeOut(()=>{sc=s;mo=false;if(s==='act'){battlePhase='vs_splash';bpFrame=fr;}fadeIn();ub();});}
function ub(){document.querySelectorAll('.b').forEach((b,i)=>b.classList.toggle('a',['map','crd','log','stats'][i]===sc));}

// ── Deck editor canvas click handler ─────────────────────────────────────
// Wires deckEditorClick() for mouse clicks when the deck editor overlay is open.
document.addEventListener('click', e => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = (typeof W !== 'undefined' ? W : 480) / rect.width;
  const scaleY = (typeof H !== 'undefined' ? H : 270) / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;

  // Duel scene input
  if ((typeof sc !== 'undefined' && sc === 'duel') && typeof handleDuelInput === 'function') {
    handleDuelInput(px, py);
    return;
  }

  // M4 Victory scene input (T-D13-D)
  if ((typeof sc !== 'undefined' && sc === 'duel_victory') && typeof handleVictoryInput === 'function') {
    handleVictoryInput(px, py);
    return;
  }

  // M5 Card Detail input (T-D14-B)
  if ((typeof sc !== 'undefined' && sc === 'card_detail') && typeof handleCardDetailInput === 'function') {
    handleCardDetailInput(px, py);
    return;
  }

  // PC Box Card Storage input (T-D14-C)
  if ((typeof sc !== 'undefined' && sc === 'card_storage') && typeof handleCardStorageInput === 'function') {
    handleCardStorageInput(px, py);
    return;
  }

  // T-D17-B: Beta feedback button (lobby only)
  if (typeof sc !== 'undefined' && sc === 'lobby' && window._lobbyFeedbackRect) {
    const fr2 = window._lobbyFeedbackRect;
    if (px >= fr2.x && px <= fr2.x + fr2.w && py >= fr2.y && py <= fr2.y + fr2.h) {
      const wallet = (typeof lobbyBottomName !== 'undefined' ? lobbyBottomName : '') || 'anon';
      const url = 'https://forms.gle/0xARKBetaFeedback?entry.wallet=' + encodeURIComponent(wallet);
      window.open(url, '_blank', 'noopener');
      return;
    }
  }

  // Deck editor input
  if (typeof deckEditorOpen === 'undefined' || !deckEditorOpen) return;
  if (typeof deckEditorClick !== 'function') return;
  deckEditorClick(px, py);
});

// ── Duel scene keydown handler ───────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((typeof sc !== 'undefined' && sc === 'duel') && typeof handleDuelKey === 'function') {
    handleDuelKey(e.code);
  }
}, { capture: false });

// ── Card Storage scroll (T-D14-C) ─────────────────────────────────────────
document.addEventListener('wheel', e => {
  if (typeof sc !== 'undefined' && sc === 'card_storage' && typeof cardStorageScroll === 'function') {
    e.preventDefault();
    cardStorageScroll(e.deltaY * 0.4);
  }
}, { passive: false });

