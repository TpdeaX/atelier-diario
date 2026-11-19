# Atelier Diario — Dibujo Guiado, SOS Pánico y Canto Ampliado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a `omni-life` (Atelier Diario) un modo inmediato **SOS Pánico** en [CalmView.ts](file:///C:/Users/Joseph/.gemini/antigravity/scratch/omni-life/src/views/CalmView.ts) con acceso directo desde cabecera, un nuevo **Taller de Dibujo Guiado** (`#drawing`), y ampliar **Canto** con calentamiento automático de 5 minutos, 15 canciones y acompañamiento armónico.

**Architecture:** Toda la lógica pura (plantillas de dibujo/perspectiva, canciones/rutinas/transposición de canto y normalización de perfil) vive en módulos TypeScript sin DOM para probarse con `node --test`. Las vistas heredan los tokens de `omni-life/DESIGN.md` (`al-panel`, `al-diamond-emblem`, `al-btn`, `data-theme="day|night"`), sin emojis en UI (solo SVG `stroke="currentColor"`), y todo progreso persiste en `LifeStore` (`atelier_diario_profile_v1` + Supabase).

**Tech Stack:** TypeScript 7, Vite 8, Web Audio API (`VoiceStudio.ts`), Canvas 2D + `PointerEvent.pressure`, Node 22 native test runner (`node --test`).

**Spec:** `C:\Users\Joseph\.gemini\antigravity\scratch\omni-arena\docs\superpowers\specs\2026-11-19-aprendizaje-total-ecosistema-design.md` (Secciones 1, 2, 4 Bloques D, E y F)

## Global Constraints

- Identidad Git personal obligatoria: `TpdeaX <personaljosephunu@gmail.com>` en rama `main` (sin `git push` salvo instrucción explícita).
- Cero emojis y cero glifos pictográficos en UI (`\p{Extended_Pictographic}` debe devolver vacío fuera de `SavedVaultBank.ts`); únicamente SVG de un trazo (`stroke="currentColor"`, `stroke-width="2"`, `fill="none"`).
- Todo botón visible incluye icono + etiqueta textual clara con verbo o sustantivo directo; ningún botón de cabecera queda solo con icono.
- `VoiceStudio.ts` es 100% autónomo dentro de `omni-life` (sin imports cruzados hacia `omni-arena`; sin MP3/WAV externos).
- Mantener compatibilidad hacia atrás con perfiles guardados en `localStorage['atelier_diario_profile_v1']` y Supabase `atelier_profile` (la clave `drawing` faltante debe hidratarse sin fallar).
- Puerto dev estricto `5176`; incrementar `CACHE_NAME` en `public/sw.js` de `atelier-diario-v6` a `atelier-diario-v7`.

## Review Focus

- **Perfil antiguo en Supabase o localStorage sin `drawing`:** al cargar un JSON de `atelier_diario_profile_v1` previo a esta actualización, `normalizeProfile` debe hidratar `todayHabits.drawing = false`, `stats.drawingSheets = 0` y `modulePrefs.drawing` completo sin lanzar `TypeError` ni perder racha.
- **Acceso directo `#calm?sos=1` desde Directorio o cabecera:** `main.ts` debe parsear `window.location.hash` con parámetros (`#calm?sos=1`) abriendo `CalmView` directo en `sos` sin caer en `home`, y al salir de `CalmView` debe detener osciladores/ruido ambiental y temporizadores (`unmount()`).
- **Dibujo táctil / stylus y deshacer-rehacer:** `DrawingView` debe capturar `PointerEvent` con `setPointerCapture`, usar `pressure` normalizada con fallback a velocidad cuando `pressure === 0 || 0.5` de ratón, y limpiar la pila de `redo` al trazar nuevo trazo tras un `Deshacer`.
- **Canto sin permiso de micrófono o en navegador sin `AudioContext` activo:** el calentamiento automático y el karaoke con acompañamiento deben seguir funcionando visualmente y reproduciendo la guía de piano aunque el usuario deniegue el micrófono, sin promesas rechazadas sin capturar.
- **Atajos de teclado en `SingingView` y `DrawingView`:** `Ctrl+Z`/`Ctrl+Y` o teclas del piano `Z–M`/`Q–I` jamás deben dispararse cuando el foco está en un `<input>`, `<textarea>` o `<select>`.

---

### Task 1: Contratos de Perfil, Hábito `drawing`, Iconos y Navegación (`types.ts`, `LifeStore.ts`, `DirectoryStore.ts`, `icons.ts`)

**Files:**
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\types.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\state\LifeStore.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\state\DirectoryStore.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\icons.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\services\UmbralBridge.ts`
- Test: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\atelier-core.test.ts` *(create)*

**Interfaces:**
- Produces:
  - `ModuleId` incluye `'drawing'`
  - `HabitKey` incluye `'drawing'`
  - `CalmPatternId = '478' | 'box' | 'sigh' | 'exhale36' | 'coherence'` (`modulePrefs.calm.patternId`)
  - `ModulePreferences.drawing`: `{ mode: 'lessons' | 'free'; lessonId: string; brushColor: string; brushSize: number; brushOpacity: number; symmetry: 'none' | 'vertical' | 'radial4'; grid: 'none' | 'grid' | 'perspective1' | 'perspective2'; showGuide: boolean }`
  - `LifeProfile.stats.drawingSheets: number`
  - `lifeStore.recordDrawingSheet(): void`
  - `normalizeProfile(raw)` exportada en `LifeStore.ts` para pruebas unitarias deterministas
  - `parseHashRoute(hash: string): { moduleId: ModuleId; sos: boolean }` en `src/types.ts`
  - `DEFAULT_ARENA_META` exportada en `src/services/UmbralBridge.ts`
  - `Icons.palette`, `Icons.heartPulse`, `Icons.symmetry`, `Icons.perspective`, `Icons.layers`, `Icons.redo`

- [ ] **Step 1: Write the failing test**

Create `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\atelier-core.test.ts` testing:
1. `normalizeProfile()` given a legacy object lacking `todayHabits.drawing`, `stats.drawingSheets`, and `modulePrefs.drawing` populates defaults without losing existing `dailyStreak` or `stats.calmSessions`.
2. `parseHashRoute('#calm?sos=1')` returns `{ moduleId: 'calm', sos: true }` and `parseHashRoute('#drawing')` returns `{ moduleId: 'drawing', sos: false }`, while unknown hashes fallback to `{ moduleId: 'home', sos: false }`.
3. `DEFAULT_ARENA_META` in `UmbralBridge.ts` equals `{ total: 33, academies: 15, dexterity2d: 13, action3d: 5 }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/atelier-core.test.ts`
Expected: FAIL (`normalizeProfile` / `parseHashRoute` / `drawing` not defined).

- [ ] **Step 3: Implement types, LifeStore migration, DirectoryStore order, Icons and UmbralBridge**

1. In `src/types.ts`: add `'drawing'` to `ModuleId` and `HabitKey`, define `CalmPatternId = '478' | 'box' | 'sigh' | 'exhale36' | 'coherence'` for `modulePrefs.calm.patternId`, add `DrawingSymmetry`, `DrawingGridMode`, `ModulePreferences['drawing']`, and `stats.drawingSheets: number`. Export `parseHashRoute(rawHash: string): { moduleId: ModuleId; sos: boolean }` handling `'#calm?sos=1'`, `'#sos'`, and valid `ModuleId` hashes.
2. In `src/state/LifeStore.ts`: export `normalizeProfile` (currently local function), default `drawing: false` in `emptyHabits()`, default `modulePrefs.drawing` (`mode: 'lessons'`, `lessonId: 'stroke-lines'`, `brushColor: '#1E293B'`, `brushSize: 4`, `brushOpacity: 1`, `symmetry: 'none'`, `grid: 'none'`, `showGuide: true`), default `stats.drawingSheets: 0`, and add `recordDrawingSheet()`.
3. In `src/state/DirectoryStore.ts`: insert `'mod-drawing'` into `DEFAULT_DIRECTORY_ORDER` immediately after `'mod-calligraphy'`.
4. In `src/icons.ts`: add single-stroke SVG icons `palette`, `heartPulse`, `symmetry`, `perspective`, `layers`, `redo`.
5. In `src/services/UmbralBridge.ts`: update `DEFAULT_ARENA_META` to `{ total: 33, academies: 15, dexterity2d: 13, action3d: 5 }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/atelier-core.test.ts`
Expected: PASS (all assertions green).

---

### Task 2: Audio Calmante Generativo + Modo SOS Pánico en `VoiceStudio.ts` y `CalmView.ts`

**Files:**
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\audio\VoiceStudio.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\views\CalmView.ts`
- Create: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\data\CalmBank.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\style.css` (añadir estilos `.al-sos-*`, `.al-ground-grid`, `.al-pmr-*` respetando `DESIGN.md`)
- Test: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\calm-sos.test.ts` *(create)*

**Interfaces:**
- Consumes: `lifeStore`, `Icons`, `VoiceStudioEngine`
- Produces:
  - En `VoiceStudio.ts`:
    - `startRainNoise(volume?: number): void` / `stopRainNoise(): void` (ruido marrón filtrado pasa-bajo 480 Hz en loop buffer sin archivos externos)
    - `startCalmPulse(startBpm?: number, endBpm?: number, durationSec?: number): void` / `stopCalmPulse(): void` (pulso cardíaco suave descendente 84→60 BPM en 180 s)
    - `startWarmDrone(freq?: number): void` / `stopWarmDrone(): void` (acorde cálido continuo muy suave en 174 Hz / 261 Hz)
    - `stopAllCalmAudio(): void` (corta lluvia, pulso y drone limpiamente)
  - En `CalmView.ts`:
    - `public enterSosMode(container?: HTMLElement): void`
    - `public unmount(): void` (detiene temporizadores de respiración, PMR y `voiceStudio.stopAllCalmAudio()`)

- [ ] **Step 1: Write the failing test**

Create `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\calm-sos.test.ts` extracting pure data/helpers (`BREATH_PATTERNS`, `PMR_STEPS`, `PANIC_TRUTH_CARDS`, `GROUNDING_GROUPS` 5-4-3-2-1, `computeDecayingPulseBpm(elapsedSec, startBpm, endBpm, durationSec)`) in `src/data/CalmBank.ts` *(create)* and asserting:
1. `BREATH_PATTERNS` includes `'478'`, `'box'`, `'sigh'`, `'exhale36'` (`Inhala 3s / Exhala 6s`), and `'coherence'` (`Inhala 5.5s / Exhala 5.5s`).
2. `GROUNDING_GROUPS` has counts `[5, 4, 3, 2, 1]` totaling 15 touchable checkboxes.
3. `PMR_STEPS` has at least 6 muscle groups each with `tenseSec` and `releaseSec` (`releaseSec > tenseSec`).
4. `computeDecayingPulseBpm(0, 84, 60, 180) === 84` and `computeDecayingPulseBpm(180, 84, 60, 180) === 60` and clamps monotonically.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/calm-sos.test.ts`
Expected: FAIL (`CalmBank.ts` does not exist).

- [ ] **Step 3: Implement `CalmBank.ts`, `VoiceStudio.ts` calm generators, and `CalmView.ts` SOS Pánico**

1. Create `src/data/CalmBank.ts` with `BREATH_PATTERNS`, `GROUNDING_GROUPS` (5 ves, 4 tocas, 3 oyes, 2 hueles, 1 saboreas/agua), `PMR_STEPS` (Manos, Hombros, Mandíbula, Frente, Abdomen, Piernas), `PANIC_TRUTH_CARDS`, and `computeDecayingPulseBpm`.
2. Update `src/audio/VoiceStudio.ts` adding procedural brown-noise rain buffer (`startRainNoise`/`stopRainNoise`), decaying soft pulse (`startCalmPulse`/`stopCalmPulse`), warm drone (`startWarmDrone`/`stopWarmDrone`), and `stopAllCalmAudio()`. Guard safely if `AudioContext` is unavailable.
3. Update `src/views/CalmView.ts`:
   - Two clear top tabs: **`SOS Pánico Ahora`** (default when opened via `#calm?sos=1` or `#sos`, or triggered by giant primary button `SOS Pánico Ahora`) and **`Calma y Reencuadre`** (keeps the 3-line reframe form & history for after crisis).
   - Inside SOS mode: calm reassurance banner (*"Estás a salvo..."*), huge breathing orb supporting `Exhalar Largo (3-6)`, `Suspiro fisiológico`, `Coherencia (5.5-5.5)`, `4-7-8` and `Caja`, 3 direct sound switches (`Lluvia suave`, `Pulso 84→60 BPM`, `Tono cálido`), interactive 5-4-3-2-1 touch checklist (no typing required, resets cleanly), guided PMR timer, and 1-card anchor carousel.
   - `unmount()` clears all intervals/timeouts and calls `voiceStudio.stopAllCalmAudio()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/calm-sos.test.ts`
Expected: PASS.

---

### Task 3: Taller de Dibujo Guiado (`DrawingBank.ts` + `DrawingView.ts`)

**Files:**
- Create: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\data\DrawingBank.ts`
- Create: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\views\DrawingView.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\style.css` (estilos `.al-drawing-*`, paleta, barras y controles limpios)
- Test: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\drawing-bank.test.ts` *(create)*

**Interfaces:**
- Consumes: `lifeStore`, `Icons`
- Produces:
  - `DrawingLesson` (`id`, `block`, `title`, `tip`, `guideSvgPaths`, `recommendedGrid`, `targetCheckpoints?: [number, number][]`)
  - `DRAWING_LESSONS` (20 láminas en 5 bloques: Trazos, Perspectiva 3D, Luz y Achurado, Proporciones/Figura, Composición y Simetría)
  - `evaluateDrawingCoverage(strokes, targetCheckpoints, canvasW, canvasH): { coveragePct: number; strokeCount: number }`
  - `mirrorStrokePoints(pts, symmetry, canvasW, canvasH): Point[][]`
  - `DrawingView` (`render(container)`, `unmount()`)

- [ ] **Step 1: Write the failing test**

Create `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\drawing-bank.test.ts` asserting:
1. `DRAWING_LESSONS.length === 20` and covers all 5 blocks (`'trazos'`, `'perspectiva'`, `'luz'`, `'proporcion'`, `'composicion'`), 4 lessons each.
2. `mirrorStrokePoints([{ x: 100, y: 120 }], 'vertical', 800, 500)` returns 2 mirrored strokes (`x = 100` and `x = 700`), and `'radial4'` returns 4 quadrant-mirrored strokes.
3. `evaluateDrawingCoverage` returns `0%` on empty strokes and `>= 80%` when stroke points pass near all target checkpoints.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/drawing-bank.test.ts`
Expected: FAIL (`DrawingBank.ts` not found).

- [ ] **Step 3: Implement `DrawingBank.ts` and `DrawingView.ts`**

1. Create `src/data/DrawingBank.ts` with the 20 progressive lessons (each containing normalized `[0..1]` SVG/canvas vector guide geometry: parallel lines, ellipses, S-curves, 1-point cube, 2-point building, cylinder, shaded sphere + hatch zones, front/profile Loomis head canon, mannequin gesture, hand blocks, still life, mandala), `mirrorStrokePoints`, and `evaluateDrawingCoverage`.
2. Create `src/views/DrawingView.ts`:
   - Top bar with two direct tabs: **`Lecciones Guiadas (20)`** and **`Lienzo Libre`**.
   - Lesson selector pills grouped by the 5 blocks + clear 1-line instruction banner.
   - Crisp toolbar with clear text labels: `Lápiz`, `Regla recta`, `Goma`, `Simetría` (`Ninguna / Espejo / Radial 4×`), `Guía` (`Sin guía / Cuadrícula / Fuga 1 pt / Fuga 2 pts`), `Plantilla fantasma`, color swatches (`Grafito`, `Azul boceto`, `Sepia`, `Tinta`, `Terracota`, `Verde`, `Violeta`, `Blanco borrador`), Grosor, Opacidad, `Deshacer` (Ctrl+Z), `Rehacer` (Ctrl+Y), `Limpiar`, `Evaluar y guardar` (`lifeStore.recordDrawingSheet()`), `Descargar PNG`.
   - Interactive vanishing points draggable directly on canvas when `perspective1` or `perspective2` is active; uses `PointerEvent.pressure` when stylus/pen is detected and falls back smoothly to speed-based width for mouse/touch.
   - `unmount()` detaches window keyboard shortcuts cleanly.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/drawing-bank.test.ts`
Expected: PASS.

---

### Task 4: Ampliación de Canto (`SingingBank.ts`, `VoiceStudio.ts`, `SingingView.ts`)

**Files:**
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\data\SingingBank.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\views\SingingView.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\style.css`
- Test: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\singing-bank.test.ts` *(create)*

**Interfaces:**
- Consumes: `voiceStudio`, `lifeStore`, `Icons`
- Produces:
  - `SINGING_SONGS` ampliado a **15 canciones** de dominio público con `chords?: { startBeat: number; midis: number[] }[]` opcional para acompañamiento armónico
  - `WARMUP_CHAIN_STEPS` (5 pasos encadenados que suman 300 s = 5 min: respiración 4-4-6, zumbido `Mmmm`, trino `Brrr`, sirena suave, escala 5 notas)
  - `EAR_INTERVALS_FULL` (12 intervalos cromáticos para nivel avanzado además de los 3 básicos)
  - En `SingingView.ts`:
    - Calentamiento automático de 5 min con botón `Iniciar calentamiento (5 min)` y avance guiado con tono de referencia
    - Selector de velocidad en Karaoke (`0.75×`, `1.0×`, `1.15×`), toggle `Acompañamiento de acordes` y conteo visual `3 · 2 · 1 · ¡Canta!`
    - Reto de **Estabilidad de vocales (A-E-I-O-U)** y **Verificador de saltos cantados** con el micrófono en vivo
    - Selector en pestaña Oído: `Básico (3)` vs `Completo (12)` y acordes `Mayor / Menor / Séptima`

- [ ] **Step 1: Write the failing test**

Create `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\tests\singing-bank.test.ts` asserting:
1. `SINGING_SONGS.length === 15`, every song has unique `id`, positive `bpm`, and `notes.length >= 8` with valid MIDI `36..84` and non-empty `lyric`.
2. `WARMUP_CHAIN_STEPS` sums to `300` seconds across 5 steps.
3. `EAR_INTERVALS_FULL.length === 12` covering semitones `1..12` uniquely.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/singing-bank.test.ts`
Expected: FAIL (`SINGING_SONGS.length === 5`, `WARMUP_CHAIN_STEPS` / `EAR_INTERVALS_FULL` undefined).

- [ ] **Step 3: Implement `SingingBank.ts` and `SingingView.ts` upgrades**

1. Expand `src/data/SingingBank.ts` with 10 additional varied public-domain songs (15 total), optional `chords` progressions per song, `WARMUP_CHAIN_STEPS` (5 steps = 300s), `VOWEL_DRILLS`, and `EAR_INTERVALS_FULL` (1..12 semitones).
2. Update `src/views/SingingView.ts`:
   - Add 5-minute guided auto-warmup runner inside *Rutinas* tab (`Iniciar calentamiento 5 min` / `Pausar` / `Saltar paso`) playing guide notes and showing live pitch needle.
   - Add Karaoke tempo buttons (`0.75×`, `1.0×`, `1.15×`), `Acompañamiento de acordes` checkbox triggering soft `voiceStudio.playChord(...)` on beat boundaries, and `3 · 2 · 1` countdown lead-in.
   - Add sung interval jump verifier (`Saltos cantados`: plays base → target note and checks mic matches both within ±50 cents) + vowel resonance check (`A-E-I-O-U`).
   - Upgrade Ear tab with `Básico / Completo (12 intervalos)` toggle and `Séptima` chord option.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life && node --test tests/singing-bank.test.ts`
Expected: PASS.

---

### Task 5: Integración en `main.ts`, `HomeView.ts`, `public/sw.js` y Documentación (`omni-life`)

**Files:**
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\main.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\views\HomeView.ts`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\style.css`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\public\sw.js`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\PRODUCT.md`
- Modify: `C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\README.md`

**Interfaces:**
- Consumes: `DrawingView`, `CalmView.enterSosMode`, `SINGING_SONGS`, `parseHashRoute`
- Produces:
  - En `main.ts`: botón destacado **`SOS Calma`** en `.al-topbar-actions` (navega directo a `#calm?sos=1` y abre `calmView.enterSosMode()`), ruta `'drawing'` en `NAV_ITEMS` y `VALID_ROUTES`, `drawingView.unmount()` al salir.
  - En `HomeView.ts`: tarjeta `mod-drawing` (**Taller de Dibujo**), chip de hábito diario `Dibujo guiado` (`10` hábitos totales), subtítulo de `mod-singing` actualizado con `${SINGING_SONGS.length} canciones` y contadores reales.
  - En `public/sw.js`: `CACHE_NAME = 'atelier-diario-v7'`.

- [ ] **Step 1: Integrate `DrawingView`, `SOS Calma` header button, `HomeView` tiles, and `sw.js v7`**

Update `main.ts`, `HomeView.ts`, `style.css` (for `.al-sos-pill-btn` high-clarity teal button in topbar), `public/sw.js`, `PRODUCT.md`, and `README.md`.

- [ ] **Step 2: Run full typecheck, unit tests, emoji check, and production build**

Run:
```powershell
cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life
npx tsc --noEmit
node --test tests/*.test.ts
npm run build
```
Expected: `tsc` exits 0, all tests pass, `vite build` succeeds, zero `\p{Extended_Pictographic}` matches in `src/` (excluding `SavedVaultBank.ts`).

- [ ] **Step 3: Commit `omni-life` changes**

Ensure git identity is `TpdeaX <personaljosephunu@gmail.com>` on `main` (do not push).
```powershell
cd C:\Users\Joseph\.gemini\antigravity\scratch\omni-life
git -c user.name="TpdeaX" -c user.email="personaljosephunu@gmail.com" add -A
git -c user.name="TpdeaX" -c user.email="personaljosephunu@gmail.com" commit -m "feat: taller de dibujo guiado, modo SOS panico y canto ampliado"
```
