// scenes/how-to-play.js — Static game rules (no wallet required)

(function() {
  registerScene('how_to_play', {
    init: function() {
      const loreBtn = document.getElementById('how-to-lore-btn');
      if (loreBtn) loreBtn.onclick = function() { enterScene('lore'); };
    }
  });
})();
