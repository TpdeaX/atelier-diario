# Atelier Diario · Lectura, Dibujo, Voz, Mente y Calma

Aplicación web progresiva (PWA) instalable en móvil y PC para el crecimiento diario sin ruido visual (con **Modo Día** y **Modo Noche** sincronizados con el ecosistema).

## Módulos
- **Biblioteca y Lector Online (`#reader`):** Wikisource (textos completos en español), Wikipedia y Open Library + diccionario al doble clic con Wikcionario.
- **Cuaderno y PDF (`#studio`):** anotaciones tipo tablet, pizarra vectorial y lectura/descarga de libros a PDF sincronizados con Supabase.
- **Taller de Caligrafía (`#calligraphy`):** lienzo de trazado con renglones guía e inclinación de 55°.
- **Taller de Dibujo Guiado (`#drawing`):** 20 láminas progresivas en 5 bloques (*Trazos y pulso*, *Perspectiva 3D*, *Luz y achurado*, *Proporción y figura*, *Composición y simetría*) más **Lienzo Libre** con soporte de presión de lápiz stylus, regla recta, simetría espejo/radial 4×, cuadrícula, 1 o 2 puntos de fuga arrastrables, deshacer/rehacer (30 pasos), evaluación de cobertura y descarga PNG.
- **Mecanografía (`#typing`):** práctica de velocidad y acentuación para PC y móvil.
- **Ortografía, Vocabulario y Criterio (`#language`, `#mindset`, `#vault`, `#focuslab`):** retos de ortografía con reglas explicadas, glosario personal, modelos mentales, baúl de guardados, oratoria, tabla de Schulte y evocación activa.
- **Estudio de Canto y Piano (`#singing`):** calentamiento guiado automático de 5 minutos, afinador con detector de vibrato, karaoke en vivo con **15 canciones** de dominio público (velocidad `0.75× / 1.0× / 1.15×`, acompañamiento de acordes y conteo `3·2·1`), reto de estabilidad de vocales (`A-E-I-O-U`), verificador de saltos cantados, entrenamiento de oído (`Básico 3` y `Completo 12 intervalos` + acordes `Mayor / Menor / 7ª`) y piano interactivo de 2 octavas `Do3–Do5`.
- **Centro de Calma y SOS Pánico (`#calm`, `#calm?sos=1`):** acceso directo desde cabecera (**`SOS Calma`**) a una vista despejada sin formularios con respiración guiada (`Exhalar largo 3-6`, `Suspiro fisiológico`, `Coherencia 5.5-5.5`, `4-7-8` y `Caja 4-4-4-4`), paisaje sonoro generativo en Web Audio (*Lluvia suave*, *Pulso 84→60 BPM*, *Tono cálido*), aterrizaje sensorial `5-4-3-2-1` tocable, relajación muscular progresiva guiada (PMR), tarjetas breves de anclaje y pestaña aparte de reencuadre tranquilo.
- **Puente con UNUmbral y OMNI ARENA:** lectura automática de `UmbralDB` y contadores reales de **OMNI ARENA** (`33 disciplinas · 15 academias`), con 10 hábitos diarios sincronizados en Supabase (`atelier_diario_profile_v1`).

## Desarrollo y pruebas
```bash
npm run dev          # Servidor Vite en puerto 5176
npx tsc --noEmit     # Verificación estricta de TypeScript
node --test tests/*.test.ts
npm run build        # Compilación de producción
```

## Créditos del ecosistema
Integrado con **UNUmbral** (proyecto original bajo licencia MIT de [@TeVerde29](https://github.com/TeVerde29/UNUmbral)).
