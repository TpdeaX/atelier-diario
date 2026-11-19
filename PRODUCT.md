# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Joseph Marquina (y uso personal en PC, laptop y móvil), usando un ecosistema integrado de aplicaciones web progresivas (PWA) alojadas en `https://tpdeax.github.io/`:
1. **Atelier Diario** (`/atelier-diario/`): centro de crecimiento diario con 10 hábitos: lectura, cuaderno/PDF, caligrafía, **taller de dibujo guiado (20 láminas + lienzo libre)**, mecanografía, léxico/ortografía, criterio, baúl de guardados, oratoria/enfoque, **estudio de canto ampliado (15 canciones y calentamiento 5 min)** y **centro de calma con modo SOS Pánico Ahora**.
2. **UNUmbral** (`/UNUmbral/`): organizador académico universitario offline-first (horario semanal 12h, cursos, notas vigesimales, asistencias, tareas y enfoque).
3. **OMNI ARENA** (`/omni-arena/`): entrenador cognitivo, musical y de reflejos 2D/3D con **33 disciplinas** (**15 academias** de música e IQ, 13 destreza 2D, 5 acción 3D), modo Gauntlet, prueba calibrada, dificultad progresiva y modo infinito.

## Product Purpose

Unificar las tres aplicaciones bajo un **Directorio del Ecosistema** como puerta de entrada principal (en español), con una identidad visual coherente y renovada en cada módulo/app, y **persistencia total en Supabase** (perfil, configuraciones, personalización del directorio, hábitos, rachas, marcadores, glosario, diario, cuadernos/PDFs, estado académico de UNUmbral y progreso/récords de OMNI ARENA) sincronizada entre dispositivos mediante un código de espacio compartido.

## Positioning

Un ecosistema personal todo-en-uno de productividad académica, bienestar y entrenamiento mental/técnico, con arquitectura local-first + sincronización en vivo vía Supabase usando el mismo código de espacio en los tres repositorios, sin fricción de cuentas complejas y mayormente en español.

## Operating Context

- Uso diario en escritorio y celular (incluyendo pantallas estrechas y táctiles).
- Los tres proyectos viven en el mismo origen en producción (`https://tpdeax.github.io/`) y en puertos locales en desarrollo (`5176` Atelier Diario, `5177` UNUmbral, `5175` OMNI ARENA).
- Inspiración estructural para el Directorio: portal institucional limpio con barra superior de identidad/usuario y grilla de accesos por módulo con emblemas geométricos en rombo diferenciados por color (como Intranet UNU Directorio), adaptado a modo día y noche.

## Capabilities and Constraints

- **Idioma:** Interfaz, etiquetas, modos, ayudas y mensajes mayormente en español en las tres apps.
- **Persistencia en Supabase:** Toda modificación y configuración debe poder guardarse y sincronizarse en Supabase por `space_code` (cuadernos/PDFs en `atelier_documents` + `atelier-pdfs`, y estado completo del ecosistema/apps en tabla unificada de estado/configuración en Supabase + Realtime).
- **Integridad funcional:** Conservar todas las capacidades existentes de Atelier Diario (incluyendo buscador de libros a PDF en Estudio, Taller de Dibujo Guiado `#drawing`, SOS Pánico `#calm?sos=1`, Canto con 15 canciones y calentamiento guiado de 5 min, Caligrafía, Tipeo, Lector, Baúl y Oratoria/Foco), todas las pruebas y flujo Capacitor/PWA de UNUmbral, y las 33 disciplinas 2D/3D de OMNI ARENA.
- **Identidad Git:** `TpdeaX <personaljosephunu@gmail.com>` en rama `main` para los repositorios personales.

## Product Principles

1. **Un solo espacio, tres mundos conectados:** Configurar Supabase y el perfil una vez refleja cambios en todo el ecosistema.
2. **Todo se guarda:** Preferencias de diseño, orden/fijados del directorio, progreso diario, configuraciones por módulo y datos académicos/entrenamiento persisten local y remotamente.
3. **Claridad en español:** Cada herramienta, botón, indicador y disciplina se expresa con naturalidad en español.
4. **Respeto por el entorno de uso:** Modo día y noche consistentes, usable con ratón, teclado, lápiz/stylus o pulgares en móvil.
