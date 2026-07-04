/**
 * Agent-facing Ontime guidance documents.
 *
 * These markdown resources teach agents rundown craft (ontime://style-guide)
 * and Ontime's view ecosystem (ontime://views) so they can produce tidy,
 * easy-to-read rundowns and recommend the right Ontime feature at the right time.
 *
 * Keep each document concise (under ~5 KB) so it stays context-friendly.
 */

// The palette mirrors the editor colour picker swatches in
// apps/client/src/common/components/input/colour-input/SwatchSelect.tsx — keep in sync.
export const ONTIME_STYLE_GUIDE_MARKDOWN = `# Ontime rundown style guide

How to build rundowns that are tidy, scannable, and pleasant to operate. Read this before creating or restyling a rundown, and prefer these conventions unless the user states their own.

## Structure: groups, milestones, delays

- Group events into blocks that match the show's segments (e.g. "Opening", "Keynotes", "Afternoon panels"). A rundown with 10+ ungrouped events is a wall of text — propose groups.
- Set \`targetDuration\` on groups so operators can track time-to-block-completion.
- Use \`milestone\` for non-timed markers (doors open, broadcast start, VIP arrival) instead of zero-duration events.
- Use \`delay\` entries only to model schedule drift; they are not padding between events.

## Colour convention

Pick ONE convention per project and apply it consistently:
- **By segment type** (most common): one colour for keynotes, one for panels, one for breaks, etc.
- **By department/stage**: useful for multi-track or multi-room shows.

Rules of thumb:
- Colour the group and leave children uncoloured — children are visually associated with their group. Colour individual events only when they need to stand out from their block.
- Reserve the red family for items needing attention (live broadcast, strict curfew). Use greys for breaks and housekeeping.
- Prefer the standard Ontime palette below — these match the swatches in the editor's colour picker, so anything the agent sets looks native in the UI:

| Colour | Hex | Suggested use |
| --- | --- | --- |
| Orange | \`#FFAB33\` | energetic segments, entertainment |
| Green | \`#339E4E\` | ready/confirmed segments, arrivals |
| Blue | \`#3E75E8\` | talks, presentations, panels |
| Red | \`#ED3333\` | live/broadcast, strict deadlines |
| Violet | \`#8064E1\` | special segments, VIP, awards |
| Grey | \`#9d9d9d\` | breaks, changeovers, housekeeping |

Lighter variants for secondary emphasis: \`#FFCC78\` orange, \`#77C785\` green, \`#779BE7\` blue, \`#FF7878\` red, \`#A790F5\` violet, \`#ececec\` light grey.

## Cues and titles

- Cues are short labels following ONE consistent convention per rundown: numeric (\`1, 2, 3…\`, or \`10, 20, 30…\` to leave room for insertions), semantic (\`Preset\`, \`Key 1\`, \`Lunch\`), or a deliberate mix. Match the convention already used in the rundown; if none is established, ask the user.
- Cues are also **automation handles**: external systems (Companion, OSC/HTTP API) can load or start an event by its cue name. Keep cues unique within the rundown and stable — warn the user before renaming cues on an existing show, and avoid duplicating a cue when inserting entries.
- Title = what happens on stage, ideally under ~50 characters. Who/where/technical data belongs in custom fields, not in the title.
- \`note\` is for free-text human context (reminders, warnings, links) — not for structured data.

## Custom fields vs notes

- Structured per-department data (camera, graphics, audio, speaker name, location) belongs in **custom fields** — one field per department or discipline, coloured to match that department. This is what powers the cuesheet and operator views.
- Before creating a field, always list existing fields and reuse them; never create near-duplicates (\`Cam\`, \`camera\`, \`Cameras\`).
- If you see structured data repeated in titles or notes ("CAM 2", "GFX: lower third"), propose moving it into a custom field.

## Timing hygiene

- Use \`linkStart\` on events inside a block so schedule edits propagate; manage only the anchor start time and durations.
- Use \`flag\` sparingly — it marks critical operational moments and loses meaning when overused.
- Set \`timeWarning\`/\`timeDanger\` proportional to the segment length (e.g. 5 min/1 min for an hour talk; less for short items).

After tidying a rundown, read \`ontime://views\` and suggest views that put the new structure to work (e.g. an operator view per department field).
`;

export const ONTIME_VIEWS_MARKDOWN = `# Ontime views and sharing guide

Ontime renders the rundown into role-specific views, each a URL on the Ontime server (\`http://<host>:<port>/<view>\`). Recommend the right view when the user mentions a role, device, or sharing need. The agent cannot create views or presets — recommend them with exact URLs and point to the editor settings.

## Views

| View | Path | For | Recommend when |
| --- | --- | --- | --- |
| Timer | \`/timer\` | speakers/presenters on stage | "the speaker needs to see their time" |
| Backstage | \`/backstage\` | crew following the schedule + notes | "crew wants to see what's next" |
| Operator | \`/op\` | department operators on phone/tablet | a per-department custom field exists |
| Cuesheet | \`/cuesheet\` | cross-department table editing | teams edit their own columns during the show |
| Timeline | \`/timeline\` | producers, overview of the whole show | "big picture" progress tracking |
| Countdown | \`/countdown\` | anyone waiting on specific events | following selected events or a group |
| Studio clock | \`/studio\` | broadcast-style studio clock | on-air environments |
| Project info | \`/info\` | general event/project information | sharing logistics with a wide audience |

Most views are configurable with URL parameters (the editor and cuesheet are configured in-app). Use the view's settings panel (cog icon) to explore options; parameters encode into the URL for sharing.

### Operator view parameters (most useful for custom fields)

- \`main\` / \`secondary-src\`: the two text lines per event — \`title\`, \`note\`, or \`custom-<fieldKey>\` (e.g. \`custom-Camera\`).
- \`subscribe=<fieldKey>\`: highlight a custom field (repeatable).
- \`shouldEdit=true\`: allow editing the highlighted field by long-press.
- \`hidePast=true\`, \`showStart=true\`: trim and annotate the list.

Example — a camera operator following their own column:
\`http://<host>:<port>/op?main=title&secondary-src=custom-Camera&subscribe=Camera&hidePast=true\`

After creating a department custom field, offer a link like this for that department.

## URL presets

URL presets bundle a configured view under a short memorable alias (e.g. \`http://<host>:<port>/camera-op\`), optionally shown in the navigation menu. They are managed in **Editor → Settings → URL presets**. When you recommend a configured view, spell out the target view and full query string and suggest the user saves it as a preset there — the agent cannot create presets itself.

Docs: https://docs.getontime.no/features/url-presets/

## Custom views

For bespoke branding or layouts beyond the built-in options, users can build their own HTML/CSS/JS views: any file placed in Ontime's \`external\` folder is served at \`http://<host>:<port>/external/…\` and can use Ontime's APIs for live data. Recommend when the user asks for a look the built-in view parameters cannot achieve (sponsor branding, unusual layouts, LED wall graphics).

Docs: https://docs.getontime.no/features/custom-views/
`;
