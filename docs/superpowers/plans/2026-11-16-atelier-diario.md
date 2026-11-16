# Atelier Diario (`omni-life`) Implementation Plan

> **For agentic workers:** Clean modular implementation using Vite + TypeScript + Web Audio API + live CORS-verified Spanish public APIs (Wikisource, Wikcionario, Wikipedia, Open Library).

**Goal:** Build a calm, daylight+night companion web app for reading books online, practicing calligraphy, sharpening Spanish spelling & vocabulary, learning practical mental models, training singing pitch via live microphone, and managing anxiety/positive mindset.

**Architecture:** Zero-dependency browser app with `LifeStore` (`localStorage`) state, `OnlineApi` service layer for live Spanish dictionary/library/knowledge fetching, `VoiceStudio` Web Audio synth + YIN pitch autocorrelation engine, and 7 cohesive view modules under a persistent navigation rail + global SOS Calm shortcut.

**Tech Stack:** Vite, TypeScript, HTML5 Canvas 2D (calligraphy + pitch visualizer), Web Audio API (piano synth + mic pitch detection), Google Fonts (`Bricolage Grotesque`, `Figtree`, `Literata`, `JetBrains Mono`).
