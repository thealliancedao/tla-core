# New Here? — the onboarding kit (scripts, prompts, cut list)

> Companion to `new-here.html` (Rev 1.0, 2026-08-25). Everything a video, a flyer or a post says must be
> traceable to the facts in `ecosystem-knowledge/alliance-dao.md` — the numbers below are the ones the page
> pulls live; re-read them the day you record. **Never promise a yield.** The rewards are a governance grant
> that a future proposal could change; every episode ends with that line spoken plainly.

## The one-line pitch (say it exactly like this)
"The only NFT collection whose backing comes from a blockchain's own staking rewards — voted in by Terra
governance, paid every day, held as staked LUNA, and cash-out-able once by every holder."

## Facts the scripts lean on (sourced)
- Terra gov prop **#4801**, passed **2024-02-23**: Ally admitted to the Alliance module, reward weight
  **0.008**, take rate 0, pinned. (Community raised it from the 0.003 forum draft.)
- 10,000 NFTs, launched 2023-12-12; free claim to 2024-01-12 (1,191 claimed); phases 1b/2a/2b sold
  127 / 525 / 197+459+644 (=156,205 LUNA raised). The rest — ~5,800 — unminted, held by the DAO.
- Daily cycle ~00:50 UTC: claim LUNA → bond to ampLUNA → 90% to the holders' pool, 10% to the DAO wallet.
  Worked day 2026-04-25: 1,874 LUNA → 899 ampLUNA → 809 / 89.
- Backing per NFT = contract ampLUNA ÷ unbroken NFTs (today ≈ 95.4 ampLUNA ≈ 218 LUNA ≈ $10 — read live).
- Break once per NFT: share paid out, NFT kept, voting power kept; the daily claim does not shrink → "last NFT standing".
- Governance on DAODAO: 1 staked NFT = 1 vote. Council DAO for operations. Two max-duration TLA locks
  (ampLUNA + arbLUNA) = the DAO's voting power in the Terra Liquidity Alliance.
- Ten planets around the Phoenix Sun; grades 1–40; grade 40 = Phoenix Rising. Metadata spelling: Cristall.

## The video series — five episodes, 60–120 seconds each (vertical 9:16 for social, 16:9 master)

### Ep. 1 — "Backed by a blockchain" (the thesis)
**Hook (0–5s):** black screen, a single line of on-chain JSON scrolling: `alliance_claim_rewards`. VO: *"Every
morning at ten to one, this happens."*
**Body:** cut to the Phoenix Sun art blooming. VO: *"Most NFTs are a picture and a promise. This one is a
picture and a stake. In February 2024, Terra's governance voted — proposal 4801 — to pay this collection a
share of the chain's own staking rewards. Not a team. Not a treasury drip. The chain."* Show the vote result
card (yes %, date). Counter: **days backed** ticking from 0 to today's number.
**Turn:** *"Nine hundred and something days later, it has never missed a morning."* Show the backing-history
line rising.
**Close:** *"It can be changed by a future vote — we say that on every page. But it hasn't been. Come see the
numbers."* End card: thealliancedao.com/new-here.

### Ep. 2 — "One day in the life of the backing" (the mechanism)
Animated four-step diagram from the page: Claim → Bond to ampLUNA → 90% holders → 10% DAO, with the real
2026-04-25 amounts flying through (1,874 → 899 → 809 / 89). VO explains ampLUNA in one sentence: *"staked
LUNA you can still hold — it earns while it waits."* End with the formula card: backing per NFT = pool ÷
unbroken, and today's number.

### Ep. 3 — "Break glass" (the exit)
A single NFT on screen. VO: *"Any day you like, you can break it: take your share of the pool, once. You keep
the art, you keep your vote. And here's the part people miss —"* the pool splits among fewer tiles as others
break; the per-tile number rises. *"— the daily claim doesn't shrink. Last NFT standing."* Show the Ally page's
projection, labelled "projection from the recorded series, not a promise."

### Ep. 4 — "The Phoenix Sun" (the art and lore)
Pure cinema: fly-through of the ten planets from the lore page's map, each with its inhabitant silhouette and
signature weapon (Lusan Water Saber, Kitan Ice Bow, Sindarin Fire Staff, Cristallian Sword…). VO reads the
opening of the lore: *"Seven million years is enough time for a species to forget its origins…"* End on Phoenix
Rising, grade 40, the rarest object in the galaxy.

### Ep. 5 — "What the DAO does with it" (the mission)
The 10% arriving in the DAO wallet → the TLA positions → the two locks → votes pointing at pools → emissions
flowing back. VO: *"The DAO's cut doesn't sit. It works inside the Terra Liquidity Alliance, and it votes —
by rules we publish, that anyone can check."* Then the unminted: *"Fifty-eight hundred of these were never
sold. We hold them to build alliances — other collections, other chains — because every one we pair is a
new person using Terra."* Close on the site: *"Every number here links to the chain it came from."*

**Every episode's last line, spoken:** *"Rewards come from Terra governance and a future vote could change
them. Nothing here is a promise — it's a record."*

## Image / video prompt kit (Midjourney / Runway / Kling style; adapt syntax)
Palette and style anchors: deep space black (#0D0D0D), Terra cyan (#22d3ee), phoenix amber/orange (#f97316 →
#fbbf24), thin glowing orbital rings, the Alliance DAO "A" mark; art direction = painterly sci-fi, cinematic,
volumetric light, no text in-image (text is added in edit).

1. **Hero / thumbnail — the stake.** "A single glowing NFT card floating in deep space above a slow-turning
   planet, a thin beam of amber light rising from a blockchain lattice below and feeding into the card,
   cinematic, volumetric, painterly sci-fi, dark background, cyan and phoenix-orange accents, 16:9"
2. **The Phoenix Sun.** "A blazing phoenix-shaped sun at the centre of a ten-planet system, each planet distinct
   (water world, ice world, crystal world, fire world, grassland world, ore world, sand world, vine world,
   mountain world, volcanic world), thin luminous orbital rings, deep black space, epic scale, concept-art
   quality, 16:9"
3. **Per-planet cards (ten).** "Close orbit view of [Lusa — an ocean world with spiral cloud bands / Kita — a
   pale ice world / Cristall — a crystalline violet world / Sindari — a cracked volcanic world with fire veins /
   Pampas — a green grassland world / Minas — an ore-grey mined world / Ozara — a sand and bone desert world /
   Zando — a vine-wrapped jungle world / Crutha — a high-gravity mountain world / Gredica — a pink-lava
   world], a lone inhabitant silhouette on the surface holding [its signature weapon], cinematic lighting,
   1:1 and 9:16"
4. **The daily claim.** "A stream of small golden LUNA coins pouring into a crystal vault at dawn, the vault
   dividing the stream nine-tenths into a glowing pool and one-tenth into a smaller chamber, isometric,
   clean, dark UI aesthetic with cyan accents, 16:9"
5. **Break glass.** "An ornate NFT card cracking cleanly along a seam of light, a share of glowing ampLUNA
   flowing out to a hand while the card itself remains intact and luminous, dramatic, dark background, 9:16"
6. **The alliance.** "Two heraldic banners — a phoenix and a lion — meeting over a bridge of light between two
   planets, allied fleets in the background, hopeful, cinematic, 16:9" (Lion DAO / PixelLions material)
7. **Flyer (print / social).** "Poster layout with a central Phoenix Sun system illustration, generous dark
   negative space at the top and bottom for typography, subtle grid, cyan and amber accents, 4:5" — then set
   the headline in Outfit/Inter: *Backed by a blockchain. Since 2024-02-23.*

Video motion prompts: slow push-ins, orbital parallax, light streams; 24 fps; 4–6 s shots; avoid fast cuts in
the explainer episodes (the mechanism needs to breathe), save the energy for Ep. 4.

## Social cut list
- **YouTube:** the five episodes as a playlist + a 6-minute "full course" edit; description links new-here and Docs.
- **X / TG:** 30-second cuts — the days-backed counter (Ep. 1), the four-step diagram (Ep. 2), break glass (Ep. 3), one planet each week (Ep. 4), the unminted-for-alliances line (Ep. 5). Always the caveat line in the post.
- **Pinned post:** the one-line pitch + the live backing number + link to new-here.html.

## Rules
- Numbers on screen come from the site the day you record; say the date.
- Say "Cristall", not "Crystall". Say "treasury cut" for the NFT's 10%, never "take rate".
- No APY, no "guaranteed", no price predictions. "Backed" describes the mechanism, not a price floor.
