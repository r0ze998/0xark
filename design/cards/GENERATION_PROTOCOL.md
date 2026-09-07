# Individual artwork production protocol

Use the built-in imagegen tool and read its skill before first use. One call per
card. Do not make a contact sheet or duplicate a portrait as an individual card.
Do not use an API/CLI fallback without user consent. Parent owns integration.

The approved working style anchor (parent visually inspected) is:
`solana/client/public/img/cards/archive/010-sentinel.png`.
View it once using view_image. Read ART_DIRECTION.md and your JSON briefs. For a
legendary, also view the existing `public/img/cards/legendary/<faction>.jpg` and
use it as a principal identity reference. The Sentinel anchor is ONLY a rendering
style/material reference for all other cards, never their face or armor template.

Use this shared prompt, adding actual name, faction, rarity, subject_en and
background_en from the brief:

> Use case: stylized-concept. Create ONE finished individual collectible game
> illustration for 0xARK: The Drowned Archive. Standalone square full-bleed image,
> ideally 1024x1024, no card border or typography. Reference image 1 is a STYLE
> reference: match its richly drawn romantic dark-fantasy ink contours, sculpted
> forms, restrained painterly shading, beautifully drawn expressive faces and
> tactile weathered surfaces. Do NOT copy Sentinel's face, black hair, female
> identity, armor or shield unless this card's subject explicitly requests them.
> Every card has its own clear silhouette and focal object. For a second reference
> labeled LEGENDARY IDENTITY, preserve that character's principal face, hair and
> identifying equipment while composing a fresh scene.
>
> WORLD: a stormy ancient coastal fortress-library, the Drowned Archive.
> Green-black stone, old brass, seaworn cloth and metal, vellum, seafoam moonlight,
> muted ivory highlights. Original character illustration, NOT a photograph or 3D.
> Match the anchor's illustration language but keep the background quiet and lower
> contrast than the focal subject. The occupation and faction determine equipment.
> Use faction accents described in the brief; do not make every outfit purple.
>
> COMPOSITION: square image, main person or artifact large, compact bust/waist
> composition. Face and key tool/artifact grouped in central70% and upper two-thirds
> so a shallow landscape game-card crop remains recognizable at140px. Prioritize a
> strong readable silhouette, controlled light/dark masses, one clear story moment.
> Human subjects: correct anatomy, varied natural age and appearance specified by
> brief, with purposeful hands. Object cards: make the named object the main subject.
> No frame, title, writing, numbers, stats, logos, floating interface symbols,
> modern brands, neon, lens flare, excessive particles, duplicate people or flat
> cream studio background. No gore. No generic repeated character pose.

Append CARD IDENTITY and the exact subject/background/concept from your brief.
Include faction color/material explicitly in English. Do not invent gameplay
effects or paint an action icon. For merge cards include both inherited motifs.

For each generation, use functions.exec first-line directive yield_time_ms120000
and max_output_tokens1000; await imagegen, call generatedImage(result), then print
only result.output_hint. Save exact prompt and the tool-returned original path.
Never print result.image_url as text. Original files must remain untouched.

Copy each tool-provided PNG into
`solana/client/public/img/cards/archive/NNN-kebab-case-name.png` (3-digit actual ID).
Do not resize/crop, modify the master, edit any game source or commit/push. If a
generation fails, report it; never label an ungenerated card as complete.

Inspect every returned image visually. If output clearly violates identity,
anatomy, text-free art or has an illegible focal subject, correct with one targeted
imagegen edit and keep the passing output as the candidate. Preserve provenance.
Record per-card {id,name,file,source_path,prompt,reference_paths,visual_review,notes}
in `design/cards/production-<faction>.json`. Use visual_review='pass' only after
actually seeing the returned artwork. Keep progress messages to parent after each
2–3 cards, including any material issue. Return all10 card paths and any limitations.
