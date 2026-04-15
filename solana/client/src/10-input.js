// INPUT
// ═══════════════════════════════════════

// Held-key tracking for smooth continuous movement
const keysHeld = new Set();
document.addEventListener('keydown', e => { keysHeld.add(e.code); });
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
  const newTile = m[ny]?.[nx];
  if(newTile===1||newTile===7||newTile===11){ spawnGrassParticles(nx*TW,ny*TH); sfxGrassRustle(); }
  if(newTile===25&&inDungeon){
    for(let li=0;li<HAND_SIZE;li++){if(cardTimers[li]>0)cardTimers[li]-=30000;}
    if(objectInteractTimer<=0){objectInteractMsg='Lava! Cards decaying faster!';objectInteractTimer=60;}
    screenShake(2,4);
  }
  if(inDungeon){ processDungeonTurn(); checkFloorItemPickup(nx,ny); }
  if(!tutorialFlags.firstStep){tutorialFlags.firstStep=true;tutorialMsg='Goal: collect all 60 cards to win the Prize Pool! Dungeon entrance is EAST.';tutorialMsgTimer=300;}
  if(newTile===11&&!tutorialFlags.firstGrass){tutorialFlags.firstGrass=true;tutorialMsg='Walk through tall grass to find cards!';tutorialMsgTimer=180;}
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
          // Set sc='map' immediately so any Z presses during the fade don't re-trigger
          // the title screen new-game handler (which would restart the intro loop).
          sc='map';
          fadeOut(()=>{
            currentMap=0;inDungeon=false;currentFloor=0;
            pl[0].x=15;pl[0].y=13;pl[0].dir=0;
            pl[0].visualX=15*TW;pl[0].visualY=13*TH;
            fogRevealAll(0);fogSave();
            encounterCooldown=600;
            // Give 3 starter cards on first play
            if(pl[0].cd.filter(c=>c>0).length===0){
              const starterCards=[4,13,25]; // Strike, Guard, Dash
              starterCards.forEach((cid,i)=>{pl[0].cd[i]=cid;pl[0].vault.add(cid);});
              pl[0].cc=3;syncCardCount(0);
              lg.push('You received: '+starterCards.map(id=>CD[id-1].n).join(', ')+'!');
            }
            camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
            camTargetX=camX;camTargetY=camY;
            tileCacheDirty=true;edgeCacheDirty=true;fogCacheDirty=true;
            showBanner('はじまりの街','Your adventure begins here — safe zone');
            twSet('Welcome to はじまりのまち! Enter the dungeon to collect cards.');
            saveGame();
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
      stakeDeposited=true;
      lg.push('[ON-CHAIN] Stake deposited: '+STAKE_AMOUNT.toFixed(2)+' SOL (UI preview)');
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
  if(sc==='title'){
    if(hasSave()){
      if(e.code==='ArrowUp'){titleMenuIdx=Math.max(0,titleMenuIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){titleMenuIdx=Math.min(5,titleMenuIdx+1);sfxCursor();}
      if(e.code==='KeyZ'){
        if(titleMenuIdx===0){
          // CONTINUE
          sfxConfirm();
          if(walletConnected&&!stakeDeposited){stakeConfirmActive=true;window._stakeAction='continue';return;}
          fadeOut(()=>{
            if(loadGame()){
              sc='map';showBanner('TOWN - はじまりのまち',AREA_CARD_DESC[0]);
              fadeIn();twSet('Welcome back! You\'re in town — safe zone.');
            }else{
              sc='map';currentMap=0;showBanner('TOWN - はじまりのまち',AREA_CARD_DESC[0]);
              fogRevealAll(0);fogSave();
              fadeIn();twSet('Welcome to はじまりのまち! Enter the dungeon to collect cards.');
            }
          });
        }else if(titleMenuIdx===1){
          // NEW GAME
          sfxConfirm();
          if(walletConnected&&!stakeDeposited){stakeConfirmActive=true;window._stakeAction='new';return;}
          resetGameState(true);
          // Show intro tutorial ON title screen, then land in town when done
          fadeOut(()=>{
            // Stay on title screen during tutorial — map only shown after intro completes
            introActive=true;introPage=0;introFrame=fr;
            fadeIn();
          });
        }else if(titleMenuIdx===2){
          // CONNECT WALLET
          sfxSelect();
          if(walletConnected){
            disconnectPhantom().then(()=>{lg.push('Wallet disconnected.');});
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
        }else if(titleMenuIdx===3){
          // MULTIPLAYER
          sfxSelect();mp.mpScreen='select';mp.mpMenuIdx=0;
        }else if(titleMenuIdx===4){
          // CLEAR SAVE DATA
          sfxBack();
          clearSave();
          try{localStorage.removeItem('oxark_save_ver');}catch(e){}
          twSet('Save data cleared! Press NEW GAME to start fresh.');
          titleMenuIdx=1;
        }else if(titleMenuIdx===5){
          // CREDITS
          sfxSelect();creditsActive=true;creditsFrame=0;
        }
      }
    }else{
      if(e.code==='ArrowUp'){titleMenuIdx=Math.max(0,titleMenuIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){titleMenuIdx=Math.min(3,titleMenuIdx+1);sfxCursor();}
      if(e.code==='KeyZ'){
        if(titleMenuIdx===0){
          sfxConfirm();
          if(walletConnected&&!stakeDeposited){stakeConfirmActive=true;window._stakeAction='new';return;}
          // Show intro tutorial ON title screen, then land in town when done
          resetGameState(true);
          fadeOut(()=>{
            introActive=true;introPage=0;introFrame=fr;
            fadeIn();
          });
        }else if(titleMenuIdx===1){
          // CONNECT WALLET (no save)
          sfxSelect();
          if(walletConnected){
            disconnectPhantom().then(()=>{lg.push('Wallet disconnected.');});
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
        }else if(titleMenuIdx===2){
          // MULTIPLAYER (no save)
          sfxSelect();mp.mpScreen='select';mp.mpMenuIdx=0;
        }else if(titleMenuIdx===3){
          // CREDITS (no save)
          sfxSelect();creditsActive=true;creditsFrame=0;
        }
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
    if(battlePhase==='resolving'&&qteActive&&!qteKeyPressed&&e.code==='KeyZ'){
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
    if(battlePhase==='select'&&bpCardSelectActive){
      // Card selection for USE CARD
      const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
      if(e.code==='ArrowUp'){bpCardSelectIdx=Math.max(0,bpCardSelectIdx-1);sfxCursor();}
      if(e.code==='ArrowDown'){bpCardSelectIdx=Math.min(filled.length-1,bpCardSelectIdx+1);sfxCursor();}
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
            lg.push('DEFEATED! Lost '+CD[lostId-1].n+' to '+pl[winnerIdx].n+'.');
            twSet('Defeated! Lost '+CD[lostId-1].n+'...');
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
          [1,2].forEach(ri=>{
            const key=ri===1?'_rival1KO':'_rival2KO';
            if(!bpResolveQueue[key])return;
            bpResolveQueue[key]=false;
            // Transfer all KO'd rival cards to player
            for(let i=0;i<HAND_SIZE;i++){
              const cid=pl[ri].cd[i];
              if(cid>0){if(!addCardToPlayer(0,cid)){}; pl[ri].cd[i]=0;}
            }
            pl[ri].cc=0;
            lg.push(pl[ri].n+' KO\'d! All cards claimed!');
            twSet(pl[ri].n+' KO\'d!');
            bpHP[ri]=0;
          });
        }
        if(!bpRdIncremented){
          // v90: record this round's actions before incrementing rd
          {
            const evTexts=(bpResolveQueue||[]).map(e=>e.text||'').join(' ');
            const gotCard=evTexts.includes('obtained')||evTexts.includes('You stole')||evTexts.includes('Power steal')||evTexts.includes('Magic strike');
            const lostCard=evTexts.includes('stole your')||evTexts.includes('STOLE');
            battleRoundHistory.unshift({rd:rd,pa:bpAction,r1a:bpRivalActions[0],r2a:bpRivalActions[1],got:gotCard,lost:lostCard});
            if(battleRoundHistory.length>4)battleRoundHistory.pop();
          }
          bpRdIncremented=true;
          rd++;roundsThisRun++;
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
      const maxOnPage=Math.min(CRD_PER_PAGE,CD.length-crdPage*12)-1;
      if(crdCursor%CRD_COLS<CRD_COLS-1&&crdCursor<maxOnPage){crdCursor++;sfxCursor();}
      else{crdPage=Math.min(4,crdPage+1);crdCursor=0;sfxCursor();}
    }
    if(e.code==='ArrowLeft'){
      if(crdCursor%CRD_COLS>0){crdCursor--;sfxCursor();}
      else if(crdPage>0){crdPage--;crdCursor=CRD_COLS-1;sfxCursor();}
    }
    if(e.code==='ArrowUp'){
      if(crdCursor>=CRD_COLS){crdCursor-=CRD_COLS;sfxCursor();}
    }
    if(e.code==='ArrowDown'){
      const maxOnPage=Math.min(CRD_PER_PAGE,CD.length-crdPage*12)-1;
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
      // C — claim prize (wallet connected required)
      if(e.code==='KeyC'&&playerHasAllSixty()&&walletConnected&&!victoryClaimed){
        sfxConfirm();
        // Simulate claim: generate fake tx sig, log it
        const sig=generateFakeTxSig()+'...';
        victoryClaimedTx=sig;
        victoryClaimed=true;
        lg.push('[ON-CHAIN] Prize claimed: '+stakePotAmount.toFixed(2)+' SOL → TX: '+sig);
        screenShake(2,6);
        return;
      }
      // M — mint all collected cards as NFTs (real on-chain SPL tokens when wallet connected)
      if(e.code==='KeyM'&&playerHasAllSixty()&&!victoryMinted&&!victoryMinting){
        sfxSelect();
        victoryMinting=true;victoryMintProgress=0;
        const allCards=[...pl[0].vault];
        const gameId=Date.now()&0xffffffff; // deterministic per session
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
          if(walletConnected&&typeof onchainMintCard==='function'){
            sig=await onchainMintCard(gameId,cardId);
          }
          if(!sig){sig='sim:'+generateFakeTxSig();}
          lg.push('[NFT] '+cr.n+' ('+RARITY_LABEL[cr.r]+') TX:'+sig.slice(0,12)+'..');
          setTimeout(mintNext,walletConnected?1200:60);
        }
        mintNext();
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

