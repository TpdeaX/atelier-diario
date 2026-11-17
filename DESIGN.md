---
name: Ecosistema Atelier
description: Directorio institucional luminoso y suite de estudio, universidad y entrenamiento con modo día/noche y emblemas geométricos en rombo.
colors:
  primary: "#166534"
  primary-night: "#34d399"
  calm-teal: "#0f766e"
  voice-violet: "#6d28d9"
  amber: "#b45309"
  danger: "#b91c1c"
  ground-day: "#f1f4f8"
  surface-day: "#ffffff"
  soft-day: "#e9eef5"
  ink-day: "#141c2b"
  ink-secondary-day: "#435066"
  ground-night: "#0b1016"
  surface-night: "#131a23"
  soft-night: "#1b2431"
  ink-night: "#eef2f7"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  reader:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.78rem"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-day}"
    rounded: "{rounded.sm}"
    padding: "8px 13px"
  directory-card:
    backgroundColor: "{colors.surface-day}"
    textColor: "{colors.ink-day}"
    rounded: "{rounded.lg}"
    padding: "22px 16px 18px"
---

# Design System: Ecosistema Atelier

## Overview

**Creative North Star: "El Directorio Institucional Luminoso"**

Ecosistema Atelier combina la claridad estructural de un portal universitario limpio (barra superior de identidad con perfil de usuario y grilla de accesos por módulo con emblemas geométricos en rombo) con herramientas operativas de lectura, cuaderno digital/PDF, voz y calma.

**Key Characteristics:**
- Superficies nítidas sobre fondo tintado neutro (`#f1f4f8` en día / `#0b1016` en noche) sin sombras bruscas ni decoración superflua.
- Emblemas romboidales de doble tono por disciplina que identifican visualmente cada módulo tanto en el Directorio como en su cabecera interna.
- Controles estándar accesibles con teclado, ratón, lápiz óptico y pantallas táctiles móviles.

## Colors

Una paleta institucional sobria donde el verde bosque (`primary`) dirige la acción principal y cada módulo posee su propio par cromático dentro del emblema romboidal.

### Primary
- **Verde Atelier** (`primary` / `primary-night`): Acciones primarias, pestañas activas y estados sincronizados.

### Secondary
- **Turquesa Calma** (`calm-teal`): Acceso global SOS Calma, ejercicios de respiración y estados de serenidad.
- **Violeta Estudio Vocal** (`voice-violet`): Afinador vocal y rutinas de canto.

### Neutral
- **Fondo Día / Superficie Día** (`ground-day`, `surface-day`, `soft-day`, `ink-day`, `ink-secondary-day`): Base luminosa de lectura y directorio.
- **Fondo Noche / Superficie Noche** (`ground-night`, `surface-night`, `soft-night`, `ink-night`): Alternativa nocturna de alto contraste suave.

## Typography

**Display Font:** `Bricolage Grotesque` (fallback `system-ui, sans-serif`)
**Body Font:** `Figtree` (fallback `system-ui, sans-serif`)
**Reader Font:** `Literata` (fallback `Georgia, serif`)
**Label/Mono Font:** `JetBrains Mono` (fallback `ui-monospace, monospace`)

**Character:** Titulares compactos con tracking negativo, cuerpo legible de interfaz en Figtree, lectura larga en Literata con medida máxima de 68ch, y cifras tabulares en JetBrains Mono.

## Layout

Contenedor centrado de hasta `1240px` con cabecera sticky, barra de sub-navegación con retorno rápido al Directorio dentro de los módulos, grilla adaptable (`minmax(198px, 1fr)` en escritorio y 2 columnas en móvil `<=640px`), y bloques de dos columnas que colapsan a una sola debajo de `960px`.

## Elevation & Depth

Capas definidas por bordes finos de `1px` y sombras ambientales suaves al reposo (`0 2px 10px rgba(15, 23, 42, 0.045)`) que se elevan únicamente al pasar el cursor (`0 10px 24px rgba(15, 23, 42, 0.09)`).

## Shapes

Radios consistentes de `8px` para botones e inputs, `12px–14px` para paneles y tarjetas del Directorio, y el rombo girado a `45deg` con bordes bicolores como firma geométrica de cada módulo.

## Components

### Directory Cards
- **Corner Style:** `14px`
- **Background:** `surface-day` / `surface-night`
- **Border:** `1px solid` sutil; elevación al hover con ligero escalado del rombo interior.

### Buttons
- **Shape:** `8px`
- **Primary:** `primary` con texto blanco en día y tinta oscura en noche.

## Do's and Don'ts

### Do:
- **Do** mantener el emblema romboidal con ícono SVG centrado sin rotar tanto en el Directorio como en la cabecera de cada módulo.
- **Do** persistir toda preferencia o modificación visual en `LifeStore` / `DirectoryStore` y sincronizar con Supabase.

### Don't:
- **Don't** introducir kickers o etiquetas decorativas encima de los títulos principales ni sombras duras sin desenfoque.
