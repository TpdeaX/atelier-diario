const svgWrap = (inner: string, size = 20, cls = ''): string =>
  `<svg class="al-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const Icons = {
  home: (s = 20) =>
    svgWrap('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', s),
  grid: (s = 20) =>
    svgWrap('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>', s),
  book: (s = 20) =>
    svgWrap('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', s),
  pen: (s = 20) =>
    svgWrap('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>', s),
  spell: (s = 20) =>
    svgWrap('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>', s),
  bulb: (s = 20) =>
    svgWrap('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>', s),
  mic: (s = 20) =>
    svgWrap('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>', s),
  wind: (s = 20) =>
    svgWrap('<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>', s),
  sun: (s = 18) =>
    svgWrap('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>', s),
  moon: (s = 18) =>
    svgWrap('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', s),
  search: (s = 18) =>
    svgWrap('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', s),
  check: (s = 16) => svgWrap('<polyline points="20 6 9 17 4 12"/>', s),
  bookmark: (s = 16) => svgWrap('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', s),
  refresh: (s = 16) =>
    svgWrap('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', s),
  volume: (s = 18) =>
    svgWrap('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>', s),
  trash: (s = 16) =>
    svgWrap('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', s),
  undo: (s = 16) =>
    svgWrap('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>', s),
  heart: (s = 18) =>
    svgWrap('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', s),
  keyboard: (s = 20) =>
    svgWrap('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="9" x2="6.01" y2="9"/><line x1="10" y1="9" x2="10.01" y2="9"/><line x1="14" y1="9" x2="14.01" y2="9"/><line x1="18" y1="9" x2="18.01" y2="9"/><line x1="6" y1="13" x2="6.01" y2="13"/><line x1="10" y1="13" x2="10.01" y2="13"/><line x1="14" y1="13" x2="14.01" y2="13"/><line x1="18" y1="13" x2="18.01" y2="13"/><line x1="7" y1="16" x2="17" y2="16"/>', s),
  phone: (s = 16) =>
    svgWrap('<rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', s),
  monitor: (s = 16) =>
    svgWrap('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>', s),
  tablet: (s = 20) =>
    svgWrap('<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', s),
  highlighter: (s = 16) =>
    svgWrap('<path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>', s),
  square: (s = 16) => svgWrap('<rect x="4" y="4" width="16" height="16" rx="1"/>', s),
  circle: (s = 16) => svgWrap('<circle cx="12" cy="12" r="8"/>', s),
  arrowUpRight: (s = 16) =>
    svgWrap('<line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/>', s),
  typeText: (s = 16) =>
    svgWrap('<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', s),
  eraser: (s = 16) =>
    svgWrap('<path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l9.9-9.9c.6-.6 1.5-.6 2.1 0l5 5c.6.6.6 1.5 0 2.1L11 20"/>', s),
  cloud: (s = 16) =>
    svgWrap('<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>', s),
  download: (s = 16) =>
    svgWrap('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', s),
  upload: (s = 16) =>
    svgWrap('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>', s),
  plus: (s = 16) =>
    svgWrap('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', s),
  graduation: (s = 20) =>
    svgWrap('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>', s),
  gamepad: (s = 20) =>
    svgWrap('<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="4"/>', s),
  star: (s = 16) =>
    svgWrap('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', s),
  sliders: (s = 16) =>
    svgWrap('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>', s),
  edit: (s = 16) =>
    svgWrap('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>', s),
  arrowLeft: (s = 16) =>
    svgWrap('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>', s),
  arrowUp: (s = 14) =>
    svgWrap('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>', s),
  arrowDown: (s = 14) =>
    svgWrap('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>', s),
  eyeOff: (s = 15) =>
    svgWrap('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>', s),
  eye: (s = 15) =>
    svgWrap('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', s),
  link: (s = 18) =>
    svgWrap('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', s),
  chevronDown: (s = 15) =>
    svgWrap('<polyline points="6 9 12 15 18 9"/>', s),
  user: (s = 18) =>
    svgWrap('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s),
  palette: (s = 20) =>
    svgWrap('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>', s),
  heartPulse: (s = 20) =>
    svgWrap('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/><polyline points="3 12 8 12 10 9 13 15 15 12 18 12"/>', s),
  symmetry: (s = 16) =>
    svgWrap('<line x1="12" y1="2" x2="12" y2="22"/><path d="M8 6L3 12l5 6z"/><path d="M16 6l5 6-5 6z"/>', s),
  perspective: (s = 16) =>
    svgWrap('<line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="12" x2="3" y2="4"/><line x1="12" y1="12" x2="21" y2="4"/><line x1="12" y1="12" x2="3" y2="20"/><line x1="12" y1="12" x2="21" y2="20"/>', s),
  layers: (s = 16) =>
    svgWrap('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', s),
  scale: (s = 20) =>
    svgWrap('<line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7h14"/><path d="M6 7l-3 6a3 3 0 0 0 6 0l-3-6z"/><path d="M18 7l-3 6a3 3 0 0 0 6 0l-3-6z"/><line x1="8" y1="21" x2="16" y2="21"/>', s),
  feather: (s = 20) =>
    svgWrap('<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>', s),
  wallet: (s = 20) =>
    svgWrap('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>', s),
  activity: (s = 20) =>
    svgWrap('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', s),
  redo: (s = 16) =>
    svgWrap('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>', s),
  play: (s = 16) => svgWrap('<polygon points="6 4 20 12 6 20 6 4"/>', s),
  pause: (s = 16) =>
    svgWrap('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', s),
  skip: (s = 16) =>
    svgWrap('<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>', s),
  music: (s = 16) =>
    svgWrap('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', s),
  hand: (s = 16) =>
    svgWrap('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>', s),
  droplet: (s = 16) => svgWrap('<path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.3 0z"/>', s),
  tone: (s = 16) =>
    svgWrap('<path d="M2 12h3l3-8 4 16 3-8h7"/>', s),
  archive: (s = 20) =>
    svgWrap('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>', s),
  compass: (s = 20) =>
    svgWrap('<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>', s),
  briefcase: (s = 20) =>
    svgWrap('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', s),
  youtube: (s = 20) =>
    svgWrap('<rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 16 12 10 15 10 9"/>', s),
  camera: (s = 18) =>
    svgWrap('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', s),
  bell: (s = 16) =>
    svgWrap('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', s),
  shield: (s = 16) =>
    svgWrap('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', s),
  sparkles: (s = 18) =>
    svgWrap('<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>', s),
  copy: (s = 16) =>
    svgWrap('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', s),
  target: (s = 18) =>
    svgWrap('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>', s),
};
