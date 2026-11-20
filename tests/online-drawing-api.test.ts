import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseClevelandSearchPayload,
  parseWikimediaSearchPayload,
  sanitizeApiImageUrl,
  sanitizeManualImageUrl,
  searchDrawingReferences,
  stripHtmlSafe,
} from '../src/services/OnlineApi.ts';

describe('OnlineApi drawing sanitizers (pure Node, sin DOM)', () => {
  it('stripHtmlSafe limpia HTML, entidades y espacios sin usar document/innerHTML', () => {
    assert.equal(typeof (globalThis as Record<string, unknown>).document, 'undefined');
    assert.equal(
      stripHtmlSafe('<b>Estudio</b> de &quot;Manos&quot; &amp; <i>gestos</i>&#39;s&nbsp;clave'),
      'Estudio de "Manos" & gestos\'s clave'
    );
    assert.equal(
      stripHtmlSafe('<a href="https://example.com" onclick="alert(1)">Leonardo &#65; &lt;test&gt;</a>'),
      'Leonardo A <test>'
    );
    assert.equal(stripHtmlSafe('<img src=x onerror=alert(1)>   '), '');
  });

  it('sanitizeApiImageUrl solo permite URLs https: validas', () => {
    assert.equal(
      sanitizeApiImageUrl('  https://upload.wikimedia.org/test.jpg  '),
      'https://upload.wikimedia.org/test.jpg'
    );
    assert.equal(sanitizeApiImageUrl('http://example.com/a.jpg'), '');
    assert.equal(sanitizeApiImageUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeApiImageUrl('file:///C:/secret.png'), '');
    assert.equal(sanitizeApiImageUrl('data:image/png;base64,AAAA'), '');
    assert.equal(sanitizeApiImageUrl('/relative/path.png'), '');
    assert.equal(sanitizeApiImageUrl(''), '');
  });

  it('sanitizeManualImageUrl permite https:, http:, blob: y data:image/* seguras; bloquea javascript:, file: y data:text/html', () => {
    assert.equal(sanitizeManualImageUrl('https://site.org/pic.png'), 'https://site.org/pic.png');
    assert.equal(sanitizeManualImageUrl('http://localhost:8080/ref.jpg'), 'http://localhost:8080/ref.jpg');
    assert.equal(sanitizeManualImageUrl('blob:https://app.local/1234-5678'), 'blob:https://app.local/1234-5678');
    assert.equal(
      sanitizeManualImageUrl('data:image/png;base64,iVBORw0KGgo='),
      'data:image/png;base64,iVBORw0KGgo='
    );
    assert.equal(
      sanitizeManualImageUrl('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E'),
      'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E'
    );
    assert.equal(sanitizeManualImageUrl('javascript:alert(document.cookie)'), '');
    assert.equal(sanitizeManualImageUrl('file:///etc/passwd'), '');
    assert.equal(sanitizeManualImageUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(sanitizeManualImageUrl('data:application/pdf;base64,JVBERi0='), '');
  });
});

describe('OnlineApi Wikimedia Commons parser', () => {
  it('ordena por page.index, filtra PDF/djvu/tiff sin thumburl y rechaza protocolos inseguros', () => {
    const payload = {
      query: {
        pages: {
          '20': {
            pageid: 20,
            index: 3,
            title: 'File:Segunda_valida.png',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/segunda.png',
                thumburl: 'https://upload.wikimedia.org/thumb/segunda.png',
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:Segunda_valida.png',
                mime: 'image/png',
                extmetadata: {
                  ObjectName: { value: '<span>Segunda lamina</span>' },
                  Artist: { value: '<a href="x">Autor Dos</a>' },
                  LicenseShortName: { value: 'CC BY-SA 4.0' },
                },
              },
            ],
          },
          '10': {
            pageid: 10,
            index: 1,
            title: 'File:Primera_tiff_con_thumb.tif',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/primera.tif',
                thumburl: 'https://upload.wikimedia.org/thumb/primera.jpg',
                descriptionurl: 'javascript:alert(1)',
                mime: 'image/tiff',
                extmetadata: {
                  ObjectName: { value: 'Primera TIFF con thumb' },
                  Artist: { value: '<b>Maestro Uno</b>' },
                  LicenseShortName: { value: 'Public domain' },
                },
              },
            ],
          },
          '30': {
            pageid: 30,
            index: 2,
            title: 'File:Descartar_pdf.pdf',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/doc.pdf',
                thumburl: 'https://upload.wikimedia.org/doc.jpg',
                mime: 'application/pdf',
              },
            ],
          },
          '40': {
            pageid: 40,
            index: 4,
            title: 'File:Descartar_djvu.djvu',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/libro.djvu',
                thumburl: 'https://upload.wikimedia.org/libro.jpg',
                mime: 'image/vnd.djvu',
              },
            ],
          },
          '50': {
            pageid: 50,
            index: 5,
            title: 'File:Descartar_tiff_sin_thumb.tif',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/sinthumb.tif',
                mime: 'image/tiff',
              },
            ],
          },
          '60': {
            pageid: 60,
            index: 6,
            title: 'File:Descartar_http_inseguro.jpg',
            imageinfo: [
              {
                url: 'http://upload.wikimedia.org/inseguro.jpg',
                thumburl: 'http://upload.wikimedia.org/inseguro-thumb.jpg',
                mime: 'image/jpeg',
              },
            ],
          },
        },
      },
    };

    const items = parseWikimediaSearchPayload(payload);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'Primera TIFF con thumb');
    assert.equal(items[0].artist, 'Maestro Uno');
    assert.equal(items[0].thumbUrl, 'https://upload.wikimedia.org/thumb/primera.jpg');
    assert.equal(items[0].pageUrl, '');
    assert.equal(items[1].title, 'Segunda lamina');
    assert.equal(items[1].artist, 'Autor Dos');
    assert.equal(items[1].license, 'CC BY-SA 4.0');
    assert.equal(items[1].pageUrl, 'https://commons.wikimedia.org/wiki/File:Segunda_valida.png');
  });
});

describe('OnlineApi Cleveland CC0 parser y searchDrawingReferences', () => {
  it('parseClevelandSearchPayload filtra sin web.url, asigna Artista anonimo y valida https', () => {
    const payload = {
      data: [
        {
          id: 101,
          title: '<i>Estudio</i> de cabeza',
          url: 'https://www.clevelandart.org/art/101',
          share_license_status: 'CC0',
          creators: [],
          images: {
            web: { url: 'https://openaccess-cdn.clevelandart.org/101_web.jpg' },
            print: { url: 'https://openaccess-cdn.clevelandart.org/101_print.jpg' },
          },
        },
        {
          id: 102,
          title: 'Sin web url',
          creators: [{ description: 'Alguien' }],
          images: {},
        },
        {
          id: 103,
          title: 'Protocolo prohibido',
          url: 'file:///etc/hosts',
          images: {
            web: { url: 'javascript:alert(1)' },
          },
        },
      ],
    };

    const items = parseClevelandSearchPayload(payload);
    assert.equal(items.length, 1);
    assert.equal(items[0].source, 'cleveland');
    assert.equal(items[0].title, 'Estudio de cabeza');
    assert.equal(items[0].artist, 'Artista anónimo');
    assert.equal(items[0].license, 'CC0');
    assert.equal(items[0].thumbUrl, 'https://openaccess-cdn.clevelandart.org/101_web.jpg');
    assert.equal(items[0].fullUrl, 'https://openaccess-cdn.clevelandart.org/101_print.jpg');
    assert.equal(items[0].pageUrl, 'https://www.clevelandart.org/art/101');
  });

  it('searchDrawingReferences consulta en paralelo y maneja fallos parciales con Promise.allSettled', async () => {
    const prevFetch = globalThis.fetch;
    const calledUrls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const u = String(input);
      calledUrls.push(u);
      if (u.includes('commons.wikimedia.org')) {
        return new Response('Server error', { status: 500 });
      }
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 77,
              title: 'Retrato en carboncillo',
              url: 'https://www.clevelandart.org/art/77',
              share_license_status: 'CC0',
              creators: [{ description: 'Autor Prueba' }],
              images: {
                web: { url: 'https://openaccess-cdn.clevelandart.org/77.jpg' },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    try {
      const empty = await searchDrawingReferences('   ', 'all');
      assert.deepEqual(empty, { items: [], errors: {} });

      const res = await searchDrawingReferences('portrait sketch', 'all');
      assert.equal(calledUrls.length, 2);
      assert.ok(calledUrls.some((u) => u.includes('commons.wikimedia.org') && u.includes('origin=*') && u.includes('iiurlwidth=960') && u.includes('gsrlimit=12')));
      assert.ok(calledUrls.some((u) => u.includes('openaccess-api.clevelandart.org') && u.includes('has_image=1') && u.includes('cc0=1') && u.includes('limit=12')));
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0].source, 'cleveland');
      assert.ok(res.errors.wikimedia && res.errors.wikimedia.length > 0);
      assert.equal(res.errors.cleveland, undefined);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
