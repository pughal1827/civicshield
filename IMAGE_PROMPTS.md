# Gemini Image Generation Prompts — CivicShield AI

---

## IMAGE 1: PROBLEM SLIDE

**Aspect Ratio:** 16:9 (1920×1080)
**Style:** Dark infographic illustration, editorial magazine style, flat design with subtle 3D depth
**Color Palette:** Deep charcoal (#1a1a2e) background, emergency red (#e74c3c), warning amber (#f39c12), muted gray (#7f8c8d), white text

---

### Prompt

```
A dark, dramatic 16:9 editorial infographic illustration in flat design style with subtle depth shadows. Deep charcoal (#1a1a2e) background filling the entire canvas.

LEFT THIRD — THE BROKEN SYSTEM (visual chaos):
A large, frustrated Indian citizen (middle-aged woman, simple sari, holding a smartphone) stands at the center-left, looking up with distress at a massive, chaotic bureaucratic machine above her. The machine is a tangled, broken contraption made of:
- Twisted, knotted red arrows going in wrong directions (representing misrouting)
- Stacked duplicate paper forms multiplying infinitely (representing duplicate reports)
- A giant clock with hands spinning wildly (representing delays)
- Dark smoke and static lines emanating from the machine
- Tiny, overwhelmed office workers drowning in paper stacks at the base of the machine
The citizen's face shows frustration and helplessness.

RIGHT TWO-THIRDS — THE SHOCKING STATISTICS (bold, large typography):
Against the dark background, display these statistics in EXTRA-LARGE, BOLD, HIGH-CONTRAST WHITE typography, arranged in a visual grid:

Top row (massive font, 120px+):
"60-70%" — with a small icon of a person at a desk surrounded by papers (officer time on triage)
"40-60%" — with an icon of duplicate report forms stacked (duplicate reports)
"20 DAYS" — with an icon of a slow clock (average resolution time)

Middle row (slightly smaller, 80px):
"2-3 DEATHS" — with a red alert icon (monsoon casualties from unreported hazards)
"₹1-3 Cr" — with a rupee icon (annual waste per city)

Bottom strip (60px, amber color):
"NO AI · NO ROUTING · NO ACCOUNTABILITY"

VISUAL TREATMENT:
- The statistics should float with subtle red/amber glow effects
- Thin connecting lines from the broken machine on the left point to the statistics on the right
- Small visual icons accompany each stat (not complex illustrations — simple flat icons)
- The overall mood is urgent, dark, slightly dystopian — like a public service announcement
- Professional, clean layout with ample negative space around the text
- No clutter, no small text, everything readable from 10 feet away
- The citizen figure on the left should be the emotional anchor — expressive face, relatable, human
```

---

## IMAGE 2: SOLUTION SLIDE

**Aspect Ratio:** 16:9 (1920×1080)
**Style:** Bright, modern tech infographic, clean and optimistic, isometric + flat design hybrid
**Color Palette:** Deep navy (#0a1628) background, vibrant teal (#00d4aa), electric blue (#4da8da), warm gold (#f4d03f), white text, green accents (#27ae60)

---

### Prompt

```
A bright, optimistic 16:9 tech infographic illustration in clean modern flat design with subtle isometric depth. Deep navy (#0a1628) background.

CENTER — THE CITIZEN (empowered, hopeful):
A diverse Indian citizen (young person, smartphone in hand, confident smile) stands at the bottom-center of the image, looking up with hope and empowerment. Rays of golden light emanate from their phone screen upward.

TOP-CENTER — THE 4-TIER AI PIPELINE (visual flow):
Four glowing, stacked AI processing nodes arranged vertically in the upper-center, connected by animated flowing data streams (thin luminous lines):

Node 1 (top, teal glow): A small camera icon with "YOLOv8" label — text "DETECTS" in small caps
Node 2 (gold glow): A brain icon with "CLIP" label — text "UNDERSTANDS" in small caps  
Node 3 (blue glow): A chart icon with "AI MODELS" label — text "CLASSIFIES" in small caps
Node 4 (green glow, brightest): A routing hub icon with arrows going to 4 department icons (road, water, electrical, sanitation) — text "ROUTES INSTANTLY" in small caps

Data streams flow from the citizen's phone → through all 4 AI nodes → down to 4 department icons on the sides.

LEFT SIDE — THE RESULTS (bright statistics, green/teal colors):
Large, bold, glowing statistics in vibrant teal and green:
"3 DAYS" — average resolution (with a fast-forward icon)
"95%" — SLA compliance (with a green checkmark)
"80%" — fewer duplicates (with a duplicate icon crossed out)
"4 HR" — critical hazard response (with a red alert → green checkmark)

RIGHT SIDE — THE IMPACT (human-centered):
A small, happy family standing outside their home with a clean street, covered manhole, working streetlight, and clear drain — showing the real-world outcome. Warm golden light surrounds them.

BOTTOM STRIP — KEY METRICS BAR:
A thin horizontal bar across the bottom with small text:
"4-TIER AI · AUTOMATIC ROUTING · REAL-TIME TRACKING · CITIZEN VERIFICATION · SLA COUNTDOWN"

VISUAL TREATMENT:
- Everything connected by thin, luminous data-flow lines (like circuit board traces)
- Glowing, neon-like accents on all AI nodes
- The 4-tier pipeline is the visual hero — make it the focal point
- Statistics use a modern sans-serif font, bold weight, with subtle glow/shadow for readability
- The overall mood is hopeful, futuristic but achievable, clean, professional
- No clutter, minimal text, everything readable from 10 feet away
- Color coding: teal=detection, gold=understanding, blue=classification, green=routing/resolution
```

---

## USAGE NOTES

| Parameter | Problem Slide | Solution Slide |
|-----------|-------------|----------------|
| Mood | Urgent, concerning, dark | Hopeful, empowered, bright |
| Dominant color | Red/Amber on dark | Teal/Green/Navy |
| Text amount | Minimal (5 stats + 1 tagline) | Minimal (4 node labels + 4 stats) |
| Visual weight | 60% imagery, 40% text | 50% imagery, 50% text |
| Human element | 1 frustrated citizen | 1 empowered citizen + 1 happy family |
| Readability target | Readable from 10 feet | Readable from 10 feet |
| Font style | Bold sans-serif, high contrast | Bold sans-serif, glowing |

---

## TIPS FOR BEST RESULTS

1. **Regenerate 3-4 times** and pick the best — AI image generation is non-deterministic
2. **If text renders poorly** (gibberish letters), add "text rendered correctly as [exact words]" or generate without text and add it in PowerPoint/Canva
3. **For the problem slide**, if the statistics are too small, ask for "hero statistics filling 40% of the image"
4. **For the solution slide**, if the pipeline nodes are unclear, ask for "isometric 3D blocks with clear labels"
5. **Always specify "no text artifacts, no distorted letters"** to avoid AI text generation issues
