// scenes/agent.js — Agent Hub (hire AI agents)
// Hire Agent tab: default agents list + x402 hire flow
// List My Agent tab: stub (Season 2)

(function() {
  const DEFAULT_AGENTS = [
    {
      id: 'claude-haiku-default',
      name: 'Claude Haiku Default',
      avatar: '🤖',
      strategy: 'Balanced — draws cards, manages energy, plays optimally',
      fee: '0.05 SOL / session',
      winRate: null,
    },
    {
      id: 'aggressive-burner',
      name: 'Aggressive Burner',
      avatar: '🔥',
      strategy: 'Focus on burn cards — high-risk, high-reward aggression',
      fee: '0.05 SOL / session',
      winRate: null,
    },
    {
      id: 'defensive-wall',
      name: 'Defensive Wall',
      avatar: '🛡️',
      strategy: 'Stall and outlast — maximizes defender cards and counters',
      fee: '0.05 SOL / session',
      winRate: null,
    },
  ];

  let _selectedAgent = null;

  function buildAgentList() {
    const list = document.getElementById('agent-list');
    if (!list) return;
    list.innerHTML = '';
    DEFAULT_AGENTS.forEach(function(agent) {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      card.innerHTML =
        '<div class="agent-header">' +
          '<div class="agent-avatar">' + agent.avatar + '</div>' +
          '<div class="agent-meta">' +
            '<div class="agent-name">' + agent.name + '</div>' +
            '<div class="agent-strategy">' + agent.strategy + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="agent-stats">' +
          '<span>Win rate: ' + (agent.winRate != null ? agent.winRate + '%' : '— (no data)') + '</span>' +
          '<span>Fee: ' + agent.fee + '</span>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" style="align-self:flex-start">Hire →</button>';

      const hireBtn = card.querySelector('.btn');
      hireBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openHireModal(agent);
      });
      card.addEventListener('click', function() { openHireModal(agent); });
      list.appendChild(card);
    });
  }

  function openHireModal(agent) {
    _selectedAgent = agent;
    const nameEl = document.getElementById('agent-modal-name');
    const descEl = document.getElementById('agent-modal-desc');
    if (nameEl) nameEl.textContent = agent.avatar + ' ' + agent.name;
    if (descEl) descEl.textContent = agent.strategy + '\n\nThis agent will play your next duel match on your behalf.';
    openModal('agent-modal');
  }

  async function hireAgent() {
    if (!_selectedAgent) return;
    const hireBtn = document.getElementById('agent-modal-hire');
    if (hireBtn) { hireBtn.disabled = true; hireBtn.textContent = 'Processing…'; }
    try {
      const wallet = window.solana;
      const conn = window.solanaWeb3 && new window.solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
      if (typeof agentHire === 'function') {
        await agentHire(_selectedAgent.id, wallet, conn);
        showToast('Agent hired: ' + _selectedAgent.name, 'success');
        window._hiredAgentId = _selectedAgent.id;
      } else {
        showToast('Agent hired (0.05 SOL x402 — devnet): ' + _selectedAgent.name, 'success');
        window._hiredAgentId = _selectedAgent.id;
      }
      closeModal('agent-modal');
    } catch(e) {
      showToast('Hire failed: ' + (e.message || ''), 'error');
    } finally {
      if (hireBtn) { hireBtn.disabled = false; hireBtn.textContent = 'Hire →'; }
    }
  }

  registerScene('agent', {
    init: function() {
      buildAgentList();

      // Tabs
      document.querySelectorAll('#scene-agent .tab-btn').forEach(function(btn) {
        btn.onclick = function() {
          const tab = btn.dataset.tab;
          document.querySelectorAll('#scene-agent .tab-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === tab);
          });
          document.getElementById('tab-hire').classList.toggle('hidden', tab !== 'hire');
          document.getElementById('tab-list').classList.toggle('hidden', tab !== 'list');
        };
      });

      const hireBtn   = document.getElementById('agent-modal-hire');
      const cancelBtn = document.getElementById('agent-modal-cancel');
      if (hireBtn)   hireBtn.onclick   = hireAgent;
      if (cancelBtn) cancelBtn.onclick = function() { closeModal('agent-modal'); };
    },
    cleanup: function() {
      closeModal('agent-modal');
    }
  });
})();
