// ═════════════════════════════════════════════════════════════════════════
// GENERATED FILE — DO NOT EDIT BY HAND
// Source:  design/DESIGN_TOKENS.json
// Regen:   `node build.js` (runs generateTokensModule() at top of build())
// Spec v:  1.0.0
// ═════════════════════════════════════════════════════════════════════════
window.TOKENS = {
  "color": {
    "palette": {
      "locked": {
        "ocean_shallow": "#4880c8",
        "ocean_deep": "#1c3868",
        "night_sky": "#0c1a38",
        "sand_beach": "#e8c878",
        "hull_wood": "#805028",
        "sail_cream": "#f8e8c0",
        "flag_red": "#c82828",
        "gold_accent": "#f0b828",
        "menu_blue": "#3858a0",
        "menu_border": "#ffd860",
        "text_dark": "#181028",
        "text_light": "#f8f8e8"
      },
      "npc_identity": {
        "vega_magenta": "#e040a0",
        "vega_deep": "#882060",
        "vega_pulse": "#ff70b0",
        "mira_amber": "#f0b828",
        "mira_deep": "#a07018",
        "mira_pulse": "#ffd860"
      },
      "derived_overworld": {
        "grass_mid": "#58c068",
        "grass_dark": "#287840",
        "grass_light": "#7ad078",
        "roof_red": "#d04030",
        "roof_shadow": "#902818",
        "roof_highlight": "#e86050",
        "wall_light": "#d8d0c0",
        "wall_shadow": "#a0a090",
        "path_tan": "#d8a868",
        "path_shadow": "#805028"
      },
      "derived_dungeon": {
        "dungeon_floor": "#c89060",
        "dungeon_wall": "#482818",
        "dungeon_fog": "#100818",
        "dungeon_quiet": "#0c0818",
        "rival_pulse": "#ff70b0"
      },
      "semantic": {
        "bg_default": "#1c3868",
        "bg_panel": "#3858a0",
        "bg_elev_cream": "#f8e8c0",
        "bg_elev_wood": "#805028",
        "bg_quiet": "#0c0818",
        "fg_primary": "#f8f8e8",
        "fg_on_cream": "#181028",
        "fg_muted": "#a8a8c0",
        "fg_hint": "#58587a",
        "border_primary": "#ffd860",
        "border_dark": "#181028",
        "accent": "#f0b828",
        "danger": "#c82828",
        "hp_full": "#58c068",
        "hp_low": "#c82828",
        "hp_you": "#58c068",
        "hp_vega": "#ff70b0",
        "hp_mira": "#f0b828",
        "paid_usdc": "#58c068",
        "paid_free": "#f0b828",
        "overlay_scrim": "rgba(0,0,0,0.6)"
      }
    }
  },
  "type": {
    "family": "VT323",
    "fallback": "monospace",
    "asset_path": "fonts/VT323-Regular.ttf",
    "license": "OFL 1.1",
    "sizes_px": {
      "xs": 8,
      "sm": 16,
      "md": 24,
      "lg": 32,
      "xl": 48,
      "xxl": 64
    },
    "weights": {
      "regular": 400
    },
    "letter_spacing": {
      "tight": 0.02,
      "default": 0.04,
      "wide": 0.08,
      "loose": 0.12,
      "loosest": 0.2
    },
    "line_height": {
      "tight": 1,
      "normal": 1.1,
      "loose": 1.2
    },
    "rules": [
      "Only sizes 8/16/24/32/48/64 px. No in-betweens.",
      "No anti-aliasing. PixiJS: set text.resolution = 1, roundPixels = true.",
      "All text snaps to integer pixel positions."
    ]
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 24,
    "6": 32,
    "7": 48,
    "8": 64,
    "rules": [
      "Use the 4/8/12/16/24/32 scale. Avoid odd values.",
      "Padding inside GBA dialog: 12px (spacing.3) vertical, 16px (spacing.4) horizontal.",
      "Gap between HUD items: 12px (spacing.3)."
    ]
  },
  "border": {
    "hairline": 1,
    "standard": 2,
    "double": 4,
    "thick": 6,
    "notes": [
      "GBA dialog = 2px text_dark outer + 2px menu_border inner (double = 4px total).",
      "Dungeon slab frame = 3px text_dark.",
      "HP bar = 1px text_dark outer + 1px inner highlight (rgba white 60%)."
    ]
  },
  "radii": {
    "none": 0,
    "rule": "Pixel art has square corners only. NEVER use non-zero radii except for tiny organic shapes like moon or gold padlock shackle."
  },
  "viewport": {
    "logical": {
      "width": 240,
      "height": 160
    },
    "render_scale": 2,
    "render": {
      "width": 480,
      "height": 320
    },
    "tile_sizes_px": {
      "overworld": 16,
      "dungeon": 24,
      "card_small": 32,
      "card_large": 48
    }
  },
  "z": {
    "bg_base": 0,
    "tilemap": 1,
    "path": 2,
    "decorations": 3,
    "buildings": 4,
    "fx_under": 5,
    "sprites": 6,
    "fx_over": 7,
    "hud": 10,
    "dialog": 11,
    "modal": 20,
    "banner": 25
  },
  "anim": {
    "cursor_blink": 500,
    "breathe": 3600,
    "sway": 3200,
    "shimmer": 2800,
    "vs_splash_hold": 800,
    "paywall_shatter": 600,
    "chest_crack": 500,
    "banner_slide_in": 300,
    "dialog_reveal": 200,
    "shake_hit": 200
  },
  "component": {
    "gba_dialog": {
      "fill_ref": "menu_blue",
      "border_outer": "text_dark",
      "border_inner": "menu_border",
      "border_w": 2,
      "padding": {
        "x": 16,
        "y": 12
      },
      "text_ref": "text_light",
      "text_size": 24
    },
    "location_banner": {
      "fill_ref": "menu_blue",
      "border_ref": "menu_border",
      "border_w": 2,
      "padding": {
        "x": 16,
        "y": 4
      },
      "text_ref": "menu_border",
      "text_size": 16
    },
    "hp_bar": {
      "height": 8,
      "pad": 1,
      "outline_ref": "text_dark",
      "highlight_rgba": "rgba(255,255,255,0.6)",
      "fills": {
        "you": "hp_you",
        "vega": "hp_vega",
        "mira": "hp_mira",
        "low": "hp_low"
      }
    },
    "menu_button": {
      "fill_ref": "sail_cream",
      "border_ref": "text_dark",
      "inner_accent": "menu_border",
      "sel_fill": "flag_red",
      "sel_text": "menu_border",
      "cursor_glyph": "►",
      "cursor_color": "menu_border",
      "padding": {
        "x": 12,
        "y": 4
      },
      "text_size": 16
    },
    "hpbox": {
      "fill_ref": "menu_blue",
      "border_ref": "menu_border",
      "border_w": 2,
      "padding": {
        "x": 8,
        "y": 4
      },
      "min_width": 140,
      "variants": {
        "you": {
          "fill": "ocean_deep",
          "border": "ocean_shallow",
          "nm": "ocean_shallow"
        },
        "vega": {
          "fill": "vega_deep",
          "border": "vega_pulse",
          "nm": "vega_pulse"
        },
        "mira": {
          "fill": "mira_deep",
          "border": "menu_border",
          "nm": "menu_border"
        }
      }
    },
    "card_frame": {
      "art_size": 32,
      "border_outer": "text_dark",
      "border_inner": "menu_border",
      "fill_ref": "sail_cream",
      "no_label_ref": "hull_wood",
      "nm_label_ref": "text_dark",
      "rarity_stripe_w": 4
    },
    "chest": {
      "body_ref": "hull_wood",
      "body_top": "#a07040",
      "body_bot": "#5c3818",
      "lock_ref": "menu_border",
      "border_ref": "text_dark",
      "size": {
        "w": 64,
        "h": 64
      }
    }
  }
};

// Runtime helpers (appended by build.js — not in JSON source).
// document.fonts.ready resolves once web fonts (VT323) are usable.
// B1 exposes the promise but does not gate rendering on it; callers opt in.
window.TOKENS.fontReady = (typeof document !== 'undefined' && document.fonts && document.fonts.ready)
  ? document.fonts.ready
  : Promise.resolve();

// resolveColor(key): walk semantic → locked → npc → derived groups, return hex.
// Literal hex strings ("#rrggbb") pass through. Returns null if not found.
window.TOKENS.resolveColor = function(key) {
  if (typeof key !== 'string') return null;
  if (key.charCodeAt(0) === 35 /* '#' */) return key;
  var p = window.TOKENS.color.palette;
  var groups = [p.semantic, p.locked, p.npc_identity, p.derived_overworld, p.derived_dungeon];
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (g && Object.prototype.hasOwnProperty.call(g, key)) return g[key];
  }
  return null;
};
