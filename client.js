/* Corpora Editor — edit and preview text-encoded files (and preview PDFs and
 * images) in the chat session.
 *
 * A "Corpora" conversation view (top bar) that edits the file selected in the
 * panel's built-in file tree. Two modes — Edit and Preview — switch through a
 * toggle, and a file-type label shows the detected renderer. File types are a
 * small extensible registry so JSON, XML, CSV etc. can be added later without
 * touching the editor shell. Binary types (PDF, images) set `binary: true`: the
 * view renders them from the raw bytes (a Blob URL — an <iframe> for PDF, an
 * <img> for images) and disables Edit/Save.
 *
 * Reads go through the `workspaceFiles` Remote namespace; saves go through the
 * terminal controller (the only client-accessible write path). Nothing here
 * imports a Harness Client package as a module.
 */

window.__ModuleLoader__.load({
  id: '@local/corpora-editor',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'corpora-editor';
    const PANEL_ID = 'corpora';

    const CSS = [
      // ---- View shell ----
      '.ce-view{display:flex;flex-direction:column;box-sizing:border-box;flex:1;min-height:0;background:var(--dsw-alias-bg-base);}',
      '.ce-empty{max-width:640px;margin:32px auto 0;text-align:center;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);}',
      '.ce-status{max-width:640px;margin:32px auto 0;text-align:center;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);}',
      '.ce-status-error{color:var(--dsw-alias-state-error-primary);}',
      // ---- Header ----
      '.ce-header{display:flex;align-items:center;gap:10px;flex:none;box-sizing:border-box;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.ce-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary);}',
      '.ce-controls{display:flex;align-items:center;gap:8px;flex:none;}',
      '.ce-mode-toggle{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);overflow:hidden;}',
      '.ce-mode-btn{border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px;padding:2px 10px;cursor:pointer;}',
      '.ce-mode-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}',
      '.ce-mode-btn:disabled{opacity:0.5;cursor:default;}',
      '.ce-mode-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}',
      '.ce-type-label{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px;padding:2px 8px;white-space:nowrap;}',
      '.ce-save{border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;padding:2px 12px;cursor:pointer;}',
      '.ce-save:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}',
      '.ce-save:disabled{opacity:0.5;cursor:default;}',
      '.ce-save-error{flex:none;box-sizing:border-box;padding:6px 12px;font-size:12px;line-height:16px;color:var(--dsw-alias-state-error-primary);border-bottom:1px solid var(--dsw-alias-border-l1);}',
      // ---- Editor ----
      '.ce-editor{flex:1;min-height:0;box-sizing:border-box;width:100%;padding:12px 16px;border:none;outline:none;resize:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:13px;line-height:20px;}',
      // ---- Preview ----
      '.ce-preview{flex:1;min-height:0;box-sizing:border-box;overflow:auto;padding:16px 20px;}',
      '.ce-doc{max-width:760px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);overflow-wrap:break-word;word-break:break-word;}',
      '.ce-doc p{margin:0 0 12px;}',
      '.ce-doc h1,.ce-doc h2,.ce-doc h3,.ce-doc h4,.ce-doc h5,.ce-doc h6{margin:20px 0 8px;font-weight:600;line-height:1.3;color:var(--dsw-alias-label-primary);}',
      '.ce-doc h1:first-child,.ce-doc h2:first-child,.ce-doc h3:first-child,.ce-doc h4:first-child,.ce-doc h5:first-child,.ce-doc h6:first-child{margin-top:0;}',
      '.ce-doc h1{font-size:24px;}',
      '.ce-doc h2{font-size:20px;}',
      '.ce-doc h3{font-size:17px;}',
      '.ce-doc h4{font-size:15px;}',
      '.ce-doc h5{font-size:14px;}',
      '.ce-doc h6{font-size:13px;color:var(--dsw-alias-label-secondary);}',
      '.ce-doc ul,.ce-doc ol{margin:0 0 12px;padding-left:22px;}',
      '.ce-doc li{margin:3px 0;}',
      '.ce-doc blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);}',
      '.ce-doc hr{margin:16px 0;border:none;border-top:1px solid var(--dsw-alias-border-l1);}',
      '.ce-doc strong{font-weight:600;}',
      '.ce-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:0.9em;background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-sm);padding:1px 4px;}',
      '.ce-pre{margin:0 0 12px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);overflow:auto;}',
      '.ce-pre code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12px;}',
      '.ce-link{color:var(--dsw-alias-brand-primary);text-decoration:none;}',
      '.ce-link:hover{text-decoration:underline;}',
      '.ce-img{max-width:100%;border-radius:var(--dsw-radius-sm);}',
      '.ce-plain{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:13px;line-height:20px;white-space:pre-wrap;word-break:break-word;}',
      // ---- Syntax highlighting ----
      '.ce-code-view{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:13px;line-height:20px;white-space:pre;overflow:auto;margin:0;}',
      '.ce-syn-string{color:var(--dsw-alias-state-success-primary);}',
      '.ce-syn-number{color:var(--dsw-alias-brand-primary);}',
      '.ce-syn-keyword{color:var(--dsw-alias-state-warn-primary);}',
      '.ce-syn-punct{color:var(--dsw-alias-label-tertiary);}',
      '.ce-syn-tag{color:var(--dsw-alias-brand-primary);}',
      '.ce-syn-attr{color:var(--dsw-alias-state-warn-primary);}',
      '.ce-syn-comment{color:var(--dsw-alias-label-tertiary);font-style:italic;}',
      '.ce-syn-error{color:var(--dsw-alias-state-error-primary);}',
      // ---- CSV table ----
      '.ce-table-wrap{overflow:auto;padding:4px 0;}',
      '.ce-table{border-collapse:collapse;font-size:13px;line-height:20px;}',
      '.ce-table th,.ce-table td{border:1px solid var(--dsw-alias-border-l1);padding:3px 10px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;}',
      '.ce-table th{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600;position:sticky;top:0;}',
      '.ce-table tbody tr:nth-child(even){background:var(--dsw-alias-bg-layer-1);}',
      '.ce-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover);}',
      // ---- Binary preview (PDF + images) ----
      '.ce-pdf-view{flex:1;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);}',
      '.ce-pdf{flex:1;min-height:0;width:100%;border:none;display:block;background:#fff;}',
      '.ce-image-view{flex:1;min-height:0;box-sizing:border-box;overflow:auto;padding:16px;background:var(--dsw-alias-bg-layer-1);}',
      '.ce-image{max-width:100%;height:auto;display:block;margin:0 auto;border-radius:var(--dsw-radius-sm);}',
      // ---- Editor + file-tree layout ----
      '.ce-main{display:flex;flex:1;min-height:0;}',
      '.ce-content{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;}',
      '.ce-sidebar{flex:none;width:250px;min-width:180px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--dsw-alias-border-l1);font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);}',
      '.ce-tree-row{display:flex;align-items:center;gap:6px;box-sizing:border-box;width:100%;padding:2px 6px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}',
      '.ce-tree-row:hover{background:var(--dsw-alias-interactive-bg-hover);}',
      '.ce-tree-selected{background:var(--dsw-alias-interactive-bg-hover);}',
      '.ce-tree-caret{flex:none;width:12px;color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;}',
      '.ce-tree-note{padding:2px 6px;color:var(--dsw-alias-label-tertiary);}',
      '.ce-fs{flex:1;display:flex;flex-direction:column;min-height:0;}',
      '.ce-fs-toolbar{flex:none;display:flex;align-items:center;gap:4px;padding:4px 6px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.ce-fs-btn{flex:none;width:24px;height:24px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1;cursor:pointer;}',
      '.ce-fs-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}',
      '.ce-fs-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);}',
      '.ce-fs-list{flex:1;min-height:0;overflow:auto;padding:4px 6px;}',
    ].join('\n');

    // ---- Small pure helpers ----
    function shellQuote(value) {
      return "'" + String(value).replace(/'/g, "'\\''") + "'";
    }
    function basename(path) {
      const parts = String(path).split('/');
      return parts[parts.length - 1] || path;
    }
    function genId() {
      return 'ce-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    function utf8Bytes(text) {
      return new TextEncoder().encode(text);
    }
    function bytesToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }
    /** Parse a `dsh-resource://file/…` address into a workspace-relative path. */
    function parseFileAddress(address) {
      if (typeof address !== 'string') return null;
      const sessionPrefix = 'dsh-resource://file/session/';
      if (address.startsWith(sessionPrefix)) {
        const rest = address.slice(sessionPrefix.length);
        const slash = rest.indexOf('/');
        if (slash < 0) return null;
        let path;
        try { path = decodeURIComponent(rest.slice(slash + 1)); } catch { path = rest.slice(slash + 1); }
        return { scope: 'session', sessionId: rest.slice(0, slash), path };
      }
      const absolutePrefix = 'dsh-resource://file/absolute/';
      if (address.startsWith(absolutePrefix)) {
        let path;
        try { path = decodeURIComponent(address.slice(absolutePrefix.length)); } catch { path = address.slice(absolutePrefix.length); }
        return { scope: 'absolute', path };
      }
      return null;
    }

    // ---- Markdown renderer (Preview renderer for the "Markdown" file type) ----
    function safeUrl(url) {
      if (/^(https?:|mailto:)/i.test(url)) return url;
      if (url.startsWith('#')) return url;
      if (url.startsWith('/') && !url.startsWith('//')) return url;
      return null;
    }

    function renderInline(text) {
      const nodes = [];
      let i = 0;
      while (i < text.length) {
        const rest = text.slice(i);
        let consumed = false;

        const code = /^`([^`\n]+)`/.exec(rest);
        if (code) {
          nodes.push(h('code', { className: 'ce-code' }, code[1]));
          i += code[0].length;
          consumed = true;
        }

        if (!consumed) {
          const image = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/.exec(rest);
          if (image) {
            const url = safeUrl(image[2]);
            if (url !== null) nodes.push(h('img', { className: 'ce-img', src: url, alt: image[1] || '' }));
            else if (image[1] !== '') nodes.push(image[1]);
            i += image[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const link = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/.exec(rest);
          if (link) {
            const url = safeUrl(link[2]);
            if (url !== null) nodes.push(h('a', { className: 'ce-link', href: url, target: '_blank', rel: 'noopener noreferrer' }, ...renderInline(link[1])));
            else nodes.push(...renderInline(link[1]));
            i += link[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const bold = /^\*\*([^*]+)\*\*/.exec(rest);
          if (bold) {
            nodes.push(h('strong', null, ...renderInline(bold[1])));
            i += bold[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const boldAlt = /^__([^_]+)__/.exec(rest);
          if (boldAlt) {
            nodes.push(h('strong', null, ...renderInline(boldAlt[1])));
            i += boldAlt[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const strike = /^~~([^~]+)~~/.exec(rest);
          if (strike) {
            nodes.push(h('del', null, ...renderInline(strike[1])));
            i += strike[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const italic = /^\*([^*]+)\*/.exec(rest);
          if (italic) {
            nodes.push(h('em', null, ...renderInline(italic[1])));
            i += italic[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          const italicAlt = /^_([^_]+)_/.exec(rest);
          if (italicAlt) {
            nodes.push(h('em', null, ...renderInline(italicAlt[1])));
            i += italicAlt[0].length;
            consumed = true;
          }
        }

        if (!consumed) {
          nodes.push(rest[0]);
          i += 1;
        }
      }
      return nodes;
    }

    function isBlockStart(line) {
      if (/^\s{0,3}(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~)/.test(line)) return true;
      return /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line);
    }

    function renderBlocks(src) {
      const lines = src.replace(/\r\n?/g, '\n').split('\n');
      const blocks = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') { i += 1; continue; }

        const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
        if (fence) {
          const marker = fence[1][0];
          const len = fence[1].length;
          const codeLines = [];
          i += 1;
          while (i < lines.length) {
            if (new RegExp('^\\s{0,3}' + marker + '{' + len + ',}\\s*$').test(lines[i])) { i += 1; break; }
            codeLines.push(lines[i]);
            i += 1;
          }
          blocks.push({ type: 'code', text: codeLines.join('\n') });
          continue;
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i += 1; continue; }

        if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ type: 'hr' }); i += 1; continue; }

        if (/^\s{0,3}>/.test(line)) {
          const quoteLines = [];
          while (i < lines.length && /^\s{0,3}>/.test(lines[i])) { quoteLines.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i += 1; }
          blocks.push({ type: 'quote', text: quoteLines.join(' ') });
          continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
          const items = [];
          while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i += 1; }
          blocks.push({ type: 'ul', items });
          continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = [];
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i += 1; }
          blocks.push({ type: 'ol', items });
          continue;
        }

        const paraLines = [];
        while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) { paraLines.push(lines[i]); i += 1; }
        blocks.push({ type: 'p', text: paraLines.join(' ') });
      }
      return blocks;
    }

    function renderBlock(block, idx) {
      switch (block.type) {
        case 'p': return h('p', { key: idx }, ...renderInline(block.text));
        case 'heading': {
          const level = Math.min(6, Math.max(1, block.level));
          return h('h' + level, { key: idx }, ...renderInline(block.text));
        }
        case 'code': return h('pre', { className: 'ce-pre', key: idx }, h('code', null, block.text));
        case 'hr': return h('hr', { key: idx });
        case 'quote': return h('blockquote', { key: idx }, ...renderInline(block.text));
        case 'ul': return h('ul', { key: idx }, block.items.map((item, j) => h('li', { key: j }, ...renderInline(item))));
        case 'ol': return h('ol', { key: idx }, block.items.map((item, j) => h('li', { key: j }, ...renderInline(item))));
        default: return null;
      }
    }

    function renderMarkdown(text) {
      return renderBlocks(text).map((block, idx) => renderBlock(block, idx));
    }

    // ---- Syntax-highlighting tokenizer ----
    // Sticky regexes match exactly at the current offset, so alternations and
    // zero-width lookaheads work without per-char string slicing.
    function tokenize(source, rules) {
      const out = [];
      let i = 0;
      let plain = '';
      const flush = () => { if (plain !== '') { out.push(plain); plain = ''; } };
      while (i < source.length) {
        let matchedLen = -1;
        let matchedClass = null;
        for (const rule of rules) {
          rule.re.lastIndex = i;
          const m = rule.re.exec(source);
          if (m !== null && m[0].length > 0) {
            matchedLen = m[0].length;
            matchedClass = rule.className;
            break;
          }
        }
        if (matchedLen > 0) {
          flush();
          out.push(h('span', { className: matchedClass }, source.slice(i, i + matchedLen)));
          i += matchedLen;
        } else {
          plain += source[i];
          i += 1;
        }
      }
      flush();
      return out;
    }

    const JSON_RULES = [
      { re: /"(?:\\.|[^"\\])*"/y, className: 'ce-syn-string' },
      { re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, className: 'ce-syn-number' },
      { re: /\b(?:true|false|null)\b/y, className: 'ce-syn-keyword' },
      { re: /[{}\[\],:]/y, className: 'ce-syn-punct' },
    ];

    const XML_RULES = [
      { re: /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>/y, className: 'ce-syn-comment' },
      { re: /<\/?[A-Za-z_][\w:.-]*|\/?>/y, className: 'ce-syn-tag' },
      { re: /"[^"]*"/y, className: 'ce-syn-string' },
      { re: /[\w:.-]+(?=\s*=)/y, className: 'ce-syn-attr' },
    ];

    function renderJSON(text) {
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { return h('div', { className: 'ce-syn-error' }, 'Invalid JSON'); }
      return h('pre', { className: 'ce-code-view' }, tokenize(JSON.stringify(parsed, null, 2), JSON_RULES));
    }

    function renderXML(text) {
      return h('pre', { className: 'ce-code-view' }, tokenize(text, XML_RULES));
    }

    function parseCSV(text) {
      const rows = [];
      let row = [];
      let field = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 1; }
            else inQuotes = false;
          } else {
            field += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(field); field = '';
        } else if (ch === '\n') {
          row.push(field); rows.push(row); row = []; field = '';
        } else if (ch !== '\r') {
          field += ch;
        }
      }
      if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
      return rows.filter((r) => r.some((cell) => cell !== ''));
    }

    function renderCSV(text) {
      const rows = parseCSV(text);
      if (rows.length === 0) return h('div', { className: 'ce-status' }, 'Empty CSV');
      const header = rows[0];
      const body = rows.slice(1);
      return h('div', { className: 'ce-table-wrap' },
        h('table', { className: 'ce-table' },
          h('thead', null,
            h('tr', null, header.map((cell, j) => h('th', { key: j }, cell)))),
          h('tbody', null,
            body.map((row, i) => h('tr', { key: i },
              row.map((cell, j) => h('td', { key: j }, cell)))))));
    }

    // ---- File-type registry (extensible; add more entries before the catch-all) ----
    const FILE_TYPES = [
      {
        id: 'markdown',
        label: 'Markdown',
        match: (name) => /\.(md|markdown|mdown|mkd)$/i.test(name),
        render: (text) => renderMarkdown(text),
      },
      {
        id: 'json',
        label: 'JSON',
        match: (name) => /\.(json|jsonc|geojson)$/i.test(name),
        render: (text) => renderJSON(text),
      },
      {
        id: 'csv',
        label: 'CSV',
        match: (name) => /\.csv$/i.test(name),
        render: (text) => renderCSV(text),
      },
      {
        id: 'xml',
        label: 'XML',
        match: (name) => /\.(xml|svg|xsd|xsl|rss|atom)$/i.test(name),
        render: (text) => renderXML(text),
      },
      {
        id: 'pdf',
        label: 'PDF',
        match: (name) => /\.pdf$/i.test(name),
        // Binary file: no text renderer. The view renders it via a Blob URL in
        // an <iframe> (the browser's built-in viewer) and disables Edit/Save.
        binary: true,
        kind: 'pdf',
      },
      {
        id: 'image',
        label: 'Image',
        // Raster formats only; SVG stays in the XML text entry (it is editable
        // text-encoded XML).
        match: (name) => /\.(png|jpe?g|gif|webp|bmp|ico|avif)$/i.test(name),
        binary: true,
        kind: 'image',
      },
      {
        id: 'text',
        label: 'Plain text',
        match: () => true,
        render: (text) => h('pre', { className: 'ce-plain' }, text),
      },
    ];

    function fileTypeFor(id) {
      return FILE_TYPES.find((ft) => ft.id === id) ?? FILE_TYPES[0];
    }
    function detectFileType(name) {
      return FILE_TYPES.find((ft) => ft.match(name)) ?? FILE_TYPES[FILE_TYPES.length - 1];
    }

    // ---- MIME type for a binary preview ----
    const IMAGE_MIMES = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
    };

    function binaryMimeFor(type, name) {
      if (type == null || type.binary !== true) return null;
      if (type.kind === 'pdf') return 'application/pdf';
      if (type.kind === 'image') {
        const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
        return (m != null && IMAGE_MIMES[m[1].toLowerCase()]) || 'application/octet-stream';
      }
      return 'application/octet-stream';
    }

    // ---- Module-level services set in apply ----
    let remote = null;
    let sidebarRight = null;

    // ---- The on-screen Session (the Files tab's owning session) ----
    function useCurrentSession() {
      return React.useSyncExternalStore(
        (listener) => (sidebarRight == null ? (() => {}) : sidebarRight.mounted.subscribe(listener)),
        () => (sidebarRight == null ? undefined : sidebarRight.mounted.getSnapshot()),
      );
    }

    // ---- Persistent terminal shell (directory listing via ls) ----
    let shellSession = null;
    let shellHandle = null;
    let shellIterator = null;
    let shellInfoId = null;
    let shellSeq = 0;
    let shellQueue = Promise.resolve();

    function readOutput(iterator, marker, timeoutMs) {
      return new Promise((resolve, reject) => {
        let buffer = '';
        let settled = false;
        let timer;
        const settle = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
        timer = setTimeout(() => { settle(reject, new Error('shell timed out')); }, timeoutMs);
        (async () => {
          try {
            for (;;) {
              const { value, done } = await iterator.next();
              if (done) { settle(resolve, buffer); return; }
              if (settled) return;
              if (value != null && value.type === 'output' && typeof value.data === 'string') {
                buffer += value.data;
                if (buffer.indexOf(marker) >= 0) { settle(resolve, buffer); return; }
              }
            }
          } catch (error) { settle(reject, error); }
        })();
      });
    }

    async function ensureShell(sessionId) {
      if (shellIterator != null && shellSession === sessionId) return shellIterator;
      await closeShell();
      const created = await remote.terminal.create(sessionId, { id: 'ce-shell-' + genId(), cols: 120, rows: 30 }, undefined);
      if (!created.ok) throw new Error((created.error && created.error.message) || 'could not start shell');
      if (created.value.state !== 'running') throw new Error(created.value.error || 'shell failed to start');
      shellSession = sessionId;
      shellInfoId = created.value.id;
      shellHandle = remote.terminal.attach(sessionId, created.value.id, undefined);
      shellIterator = shellHandle[Symbol.asyncIterator](); // single consumer, created once
      shellSeq = 0; // restart write sequence for this attachment
      return shellIterator;
    }

    async function closeShell() {
      if (shellHandle == null) return;
      try { await remote.terminal.close(shellSession, shellInfoId); } catch { /* noop */ }
      if (typeof shellHandle.dispose === 'function') { try { shellHandle.dispose(); } catch { /* noop */ } }
      shellHandle = null; shellIterator = null; shellSession = null; shellInfoId = null;
    }

    function runShell(sessionId, command) {
      const run = shellQueue.then(async () => {
        const iterator = await ensureShell(sessionId);
        // Start/end markers are split across two printfs so the shell's input
        // echo (if any) never contains the full marker contiguously.
        const s = 'S' + Math.random().toString(36).slice(2);
        const e = 'E' + Math.random().toString(36).slice(2);
        const hs = Math.ceil(s.length / 2);
        const he = Math.ceil(e.length / 2);
        const full = 'printf "' + s.slice(0, hs) + '" ; printf "' + s.slice(hs) + '" ; '
          + command + ' ; printf "' + e.slice(0, he) + '" ; printf "' + e.slice(he) + '"\n';
        shellHandle.send({ type: 'write', sequence: ++shellSeq, data: full });
        const output = await readOutput(iterator, e, 15000);
        const si = output.indexOf(s);
        const ei = output.indexOf(e, si >= 0 ? si : 0);
        if (si < 0 || ei < 0) return '';
        return output.slice(si + s.length, ei);
      });
      shellQueue = run.catch(() => {});
      return run;
    }

    function joinAbs(dir, name) {
      return dir.endsWith('/') ? dir + name : dir + '/' + name;
    }
    function parentDir(path) {
      const trimmed = String(path).replace(/\/+$/, '');
      const idx = trimmed.lastIndexOf('/');
      return idx <= 0 ? '/' : trimmed.slice(0, idx);
    }

    // ---- Persistent "last working directory" (survives view re-entry) ----
    const CWD_STORAGE_KEY = 'corpora-editor.lastCwd';

    function readLastCwd() {
      try {
        const value = window.localStorage.getItem(CWD_STORAGE_KEY);
        return (typeof value === 'string' && value.length > 0) ? value : null;
      } catch { return null; }
    }
    function writeLastCwd(path) {
      try {
        if (typeof path === 'string' && path.length > 0) window.localStorage.setItem(CWD_STORAGE_KEY, path);
      } catch { /* storage unavailable or full — persistence is best-effort */ }
    }

    // ---- File explorer (right bar of the Corpora panel) ----
    function FileTree(props) {
      const { sessionId, t, selectedPath, onSelect } = props;
      const [cwd, setCwd] = React.useState(null);
      const [homePath, setHomePath] = React.useState(null);
      const [entries, setEntries] = React.useState({ status: 'loading', dirs: [], files: [] });
      const mounted = React.useRef(true);
      // True while `cwd` was restored from storage and not yet confirmed by a
      // successful `ls`; used to fall back to home if that path no longer exists.
      const restoredRef = React.useRef(false);

      React.useEffect(() => {
        mounted.current = true;
        (async () => {
          if (sessionId == null || remote == null) return;
          try {
            const home = (await runShell(sessionId, 'echo "$HOME"')).trim();
            if (!mounted.current) return;
            const homeDir = home || '/';
            const saved = readLastCwd();
            setHomePath(homeDir);
            restoredRef.current = saved != null;
            setCwd(saved != null ? saved : homeDir);
          } catch (error) {
            if (mounted.current) setEntries({ status: 'error', dirs: [], files: [], message: (error && error.message) || String(error) });
          }
        })();
        return () => {
          mounted.current = false;
          void closeShell();
        };
      }, [sessionId]);

      // Persist the current directory so the next time the Corpora view opens it
      // resumes here instead of the session home.
      React.useEffect(() => {
        if (cwd != null) writeLastCwd(cwd);
      }, [cwd]);

      React.useEffect(() => {
        if (cwd == null || sessionId == null || remote == null) return;
        let cancelled = false;
        setEntries({ status: 'loading', dirs: [], files: [] });
        runShell(sessionId, 'ls -1p --color=never -- ' + shellQuote(cwd))
          .then((out) => {
            if (cancelled) return;
            restoredRef.current = false;
            const dirs = [];
            const files = [];
            for (const raw of out.split('\n')) {
              const line = raw.trim();
              if (line === '' || line === '.' || line === '..') continue;
              if (line.endsWith('/')) {
                const name = line.slice(0, -1);
                if (name !== '') dirs.push({ name, path: joinAbs(cwd, name) });
              } else {
                files.push({ name: line, path: joinAbs(cwd, line) });
              }
            }
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
            setEntries({ status: 'ready', dirs, files });
          })
          .catch((error) => {
            if (cancelled) return;
            // A remembered directory may have been deleted or made unreadable
            // since last time; recover to the session home instead of sticking
            // on an error.
            if (restoredRef.current && homePath != null && cwd !== homePath) {
              restoredRef.current = false;
              setCwd(homePath);
            } else {
              setEntries({ status: 'error', dirs: [], files: [], message: (error && error.message) || String(error) });
            }
          });
        return () => { cancelled = true; };
      }, [cwd, sessionId]);

      const goUp = () => { if (cwd != null) setCwd(parentDir(cwd)); };
      const goHome = () => { if (homePath != null) setCwd(homePath); };

      return h('div', { className: 'ce-fs' },
        h('div', { className: 'ce-fs-toolbar' },
          h('button', { type: 'button', className: 'ce-fs-btn', onClick: goUp, title: 'Up', 'aria-label': 'Up' }, '↑'),
          h('button', { type: 'button', className: 'ce-fs-btn', onClick: goHome, title: 'Home', 'aria-label': 'Home' }, '⌂'),
          h('span', { className: 'ce-fs-path', title: cwd ?? '' }, cwd ?? '')),
        h('div', { className: 'ce-fs-list' },
          entries.status === 'loading'
            ? h('div', { className: 'ce-tree-note' }, '…')
            : entries.status === 'error'
              ? h('div', { className: 'ce-tree-note' }, t('view.dirError') + (entries.message != null ? ': ' + entries.message : ''))
              : h('div', null,
                  entries.dirs.map((d) => h('button', {
                    type: 'button', key: d.path, className: 'ce-tree-row',
                    onClick: () => { setCwd(d.path); },
                  },
                  h('span', { className: 'ce-tree-caret', 'aria-hidden': true }, '▸'),
                  h('span', null, d.name))),
                  entries.files.map((f) => h('button', {
                    type: 'button', key: f.path,
                    className: 'ce-tree-row' + (selectedPath === f.path ? ' ce-tree-selected' : ''),
                    onClick: () => { onSelect(f.path); },
                  },
                  h('span', { className: 'ce-tree-caret', 'aria-hidden': true }, ' '),
                  h('span', null, f.name))),
                  entries.dirs.length === 0 && entries.files.length === 0
                    ? h('div', { className: 'ce-tree-note' }, t('view.emptyDir'))
                    : null)));
    }

    // ---- Read one file's bytes; returns { status, text, data, absolutePath } ----
    // `text` is the UTF-8 decode (used by text renderers); `data` is the raw
    // byte buffer (used by binary renderers such as the PDF preview).
    function useFileText(sessionId, path) {
      const [state, setState] = React.useState({ status: 'idle', text: '', data: null, absolutePath: null });
      React.useEffect(() => {
        if (path == null || remote == null) {
          setState({ status: 'idle', text: '', data: null, absolutePath: null });
          return undefined;
        }
        let cancelled = false;
        const controller = new AbortController();
        setState({ status: 'loading', text: '', data: null, absolutePath: null });
        remote.workspaceFiles.readBytes(sessionId, path, {}, controller.signal)
          .then((result) => {
            if (cancelled) return;
            if (!result.ok) { setState({ status: 'error', text: '', data: null, absolutePath: null }); return; }
            const data = result.value.data;
            let text = '';
            try { text = new TextDecoder('utf-8', { fatal: false }).decode(data); }
            catch { setState({ status: 'error', text: '', data: null, absolutePath: null }); return; }
            setState({ status: 'ready', text, data, absolutePath: result.value.absolutePath });
          })
          .catch(() => { if (!cancelled) setState({ status: 'error', text: '', data: null, absolutePath: null }); });
        return () => { cancelled = true; controller.abort(); };
      }, [sessionId, path]);
      return state;
    }

    // ---- Blob URL for binary previews (PDF and images) ----
    function useObjectUrl(data, mime) {
      const [url, setUrl] = React.useState(null);
      React.useEffect(() => {
        if (data == null || mime == null) {
          setUrl(null);
          return undefined;
        }
        let objectUrl = null;
        try {
          objectUrl = URL.createObjectURL(new Blob([data], { type: mime }));
        } catch {
          setUrl(null);
          return undefined;
        }
        setUrl(objectUrl);
        return () => { URL.revokeObjectURL(objectUrl); };
      }, [data, mime]);
      return url;
    }

    // ---- Save via the terminal controller (client-accessible write) ----
    /** Accumulate terminal output until `prefix` appears; resolve to the trailing exit code. */
    function waitForStatus(handle, prefix, timeoutMs) {
      return new Promise((resolve, reject) => {
        const iterator = handle[Symbol.asyncIterator]();
        let buffer = '';
        let settled = false;
        let timer;
        const settle = (fn, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn(value);
        };
        timer = setTimeout(() => {
          settle(reject, new Error('save timed out'));
          try { iterator.return && iterator.return(); } catch { /* noop */ }
        }, timeoutMs);
        (async () => {
          try {
            for (;;) {
              const { value, done } = await iterator.next();
              if (done) { settle(resolve, ''); return; }
              if (settled) return;
              if (value != null && value.type === 'output' && typeof value.data === 'string') {
                buffer += value.data;
                const idx = buffer.indexOf(prefix);
                if (idx >= 0) {
                  const match = buffer.slice(idx + prefix.length).match(/^\d+/);
                  settle(resolve, match == null ? '' : match[0]);
                  return;
                }
              }
            }
          } catch (error) {
            settle(reject, error);
          }
        })();
      });
    }

    async function saveFile(sessionId, absolutePath, content) {
      if (remote == null) throw new Error('remote unavailable');
      const created = await remote.terminal.create(sessionId, { id: genId(), cols: 120, rows: 30 }, undefined);
      if (!created.ok) throw new Error((created.error && created.error.message) || 'could not start terminal');
      const info = created.value;
      let handle;
      try {
        handle = remote.terminal.attach(sessionId, info.id, undefined);
        const b64 = bytesToBase64(utf8Bytes(content));
        // PTY canonical mode truncates a single input line near 4096 bytes, so
        // chunk the base64 and join the chunks inside the shell; `base64 -d`
        // ignores the embedded newlines. The sentinel carries the write's exit
        // status so a failed write is reported, not silently accepted.
        let command;
        if (b64 === '') {
          command = ': > ' + shellQuote(absolutePath) + '; printf "CE_SAVE_STATUS_%s" "$?"\n';
        } else {
          const chunks = [];
          for (let i = 0; i < b64.length; i += 3800) chunks.push(b64.slice(i, i + 3800));
          const emit = chunks.map((chunk) => "printf '%s\\n' " + shellQuote(chunk)).join('; ');
          command = '{ ' + emit + '; } | base64 -d > ' + shellQuote(absolutePath)
            + '; printf "CE_SAVE_STATUS_%s" "$?"\n';
        }
        handle.send({ type: 'write', sequence: 1, data: command });
        const code = await waitForStatus(handle, 'CE_SAVE_STATUS_', 30000);
        if (code !== '0') throw new Error('save failed (exit status ' + (code || 'unknown') + ')');
      } finally {
        try { await remote.terminal.close(sessionId, info.id); } catch { /* terminal already gone */ }
        if (handle != null && typeof handle.dispose === 'function') { try { handle.dispose(); } catch { /* noop */ } }
      }
    }

    // ---- Sidebar panel icon ----
    function CorporaPanelIcon({ size }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 36 36', 'aria-hidden': true },
        h('path', { d: 'M9 5 h11 l7 7 v19 a2 2 0 0 1 -2 2 H9 a2 2 0 0 1 -2 -2 V7 a2 2 0 0 1 2 -2 z', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round' }),
        h('path', { d: 'M20 5 v7 h7', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round' }),
        h('path', { d: 'M11.5 19 h9 M11.5 23 h6', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
      );
    }

    // ---- The Corpora editor panel ----
    function CorporaPage(props) {
      const { t, useSessions } = props;
      const mountedSession = useCurrentSession();
      const fallbackSession = typeof useSessions === 'function'
        ? useSessions((s) => (s != null && s.ids != null && s.ids.length > 0 ? s.ids[0] : undefined))
        : undefined;
      const sessionId = mountedSession ?? fallbackSession;
      const [selectedPath, setSelectedPath] = React.useState(null);
      const fileText = useFileText(sessionId, selectedPath);
      const [draft, setDraft] = React.useState(null);
      const [savedText, setSavedText] = React.useState(null);
      const [mode, setMode] = React.useState('preview');
      const [typeId, setTypeId] = React.useState('markdown');
      const [saving, setSaving] = React.useState(false);
      const [saveError, setSaveError] = React.useState(null);
      const fileKeyRef = React.useRef(null);

      const selectedName = selectedPath == null ? null : basename(selectedPath);
      const detectedType = selectedName == null ? null : detectFileType(selectedName);
      const isBinary = detectedType != null && detectedType.binary === true;
      const binaryKind = isBinary ? detectedType.kind : null;
      const binaryMime = binaryMimeFor(detectedType, selectedName);
      const objectUrl = useObjectUrl(fileText.data, binaryMime);

      React.useEffect(() => {
        fileKeyRef.current = fileText.status === 'ready' ? fileText.absolutePath : null;
        if (selectedPath != null && fileText.status === 'ready') {
          const type = detectFileType(selectedName);
          setTypeId(type.id);
          if (type.binary === true) {
            // Binary files (PDF, images) are preview-only: no editable draft
            // and the mode is forced back to Preview.
            setDraft(null);
            setSavedText(null);
            setMode('preview');
          } else {
            setDraft(fileText.text);
            setSavedText(fileText.text);
          }
        } else {
          setDraft(null);
          setSavedText(null);
        }
        setSaveError(null);
      }, [fileText.status, fileText.text, fileText.absolutePath, selectedPath]);

      const dirty = draft !== null && draft !== savedText;

      const onSave = () => {
        if (!dirty || saving) return;
        const targetPath = fileText.absolutePath;
        const content = draft;
        setSaving(true);
        setSaveError(null);
        saveFile(sessionId, targetPath, content)
          .then(() => { if (fileKeyRef.current === targetPath) setSavedText(content); })
          .catch((error) => { if (fileKeyRef.current === targetPath) setSaveError((error && error.message) || String(error)); })
          .finally(() => { setSaving(false); });
      };

      const fileType = fileTypeFor(typeId);

      let body;
      if (selectedPath == null) {
        body = h('div', { className: 'ce-empty' }, t('view.empty'));
      } else if (fileText.status === 'loading') {
        body = h('div', { className: 'ce-status' }, t('view.loading'));
      } else if (fileText.status === 'error') {
        body = h('div', { className: 'ce-status ce-status-error' }, t('view.error'));
      } else if (isBinary) {
        if (objectUrl == null) {
          body = h('div', { className: 'ce-status' }, t('view.loading'));
        } else if (binaryKind === 'image') {
          body = h('div', { className: 'ce-image-view' },
            h('img', { className: 'ce-image', src: objectUrl, alt: selectedName, title: selectedName }));
        } else {
          body = h('div', { className: 'ce-pdf-view' },
            h('iframe', { className: 'ce-pdf', src: objectUrl, title: selectedName, 'aria-label': selectedName }));
        }
      } else if (mode === 'edit') {
        body = h('textarea', {
          className: 'ce-editor', value: draft ?? '', spellCheck: false,
          onChange: (event) => { setDraft(event.target.value); },
        });
      } else {
        let previewNodes;
        try {
          previewNodes = fileType.render(draft ?? '');
        } catch (_error) {
          previewNodes = h('div', { className: 'ce-status ce-status-error' }, t('view.error'));
        }
        body = h('div', { className: 'ce-preview' },
          h('article', { className: 'ce-doc' }, previewNodes));
      }

      return h('div', { className: 'ce-view', 'data-corpora-editor': '' },
        h('style', null, CSS),
        h('div', { className: 'ce-header' },
          h('div', { className: 'ce-title' }, selectedName == null ? t('view.title') : selectedName),
          h('div', { className: 'ce-controls' },
            h('div', { className: 'ce-mode-toggle', role: 'tablist' },
              h('button', { type: 'button', role: 'tab', disabled: isBinary, title: isBinary ? t('mode.editDisabled') : undefined, 'aria-selected': mode === 'edit', className: 'ce-mode-btn' + (mode === 'edit' ? ' ce-mode-active' : ''), onClick: () => { setMode('edit'); } }, t('mode.edit')),
              h('button', { type: 'button', role: 'tab', 'aria-selected': mode === 'preview', className: 'ce-mode-btn' + (mode === 'preview' ? ' ce-mode-active' : ''), onClick: () => { setMode('preview'); } }, t('mode.preview'))),
            h('span', { className: 'ce-type-label', title: fileType.label }, fileType.label),
            h('button', { type: 'button', className: 'ce-save', disabled: isBinary || !dirty || saving, onClick: onSave }, saving ? t('save.saving') : t('save.label')))),
        saveError == null ? null : h('div', { className: 'ce-save-error' }, saveError),
        h('div', { className: 'ce-main' },
          h('div', { className: 'ce-content' }, body),
          h('div', { className: 'ce-sidebar' },
            h(FileTree, { sessionId, t, selectedPath, onSelect: setSelectedPath }))));
    }

    // Error boundary: a render/effect error must not blank the whole view.
    class CorporaBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      render() {
        if (this.state.error != null) {
          const message = this.state.error && this.state.error.message
            ? this.state.error.message
            : String(this.state.error);
          return h('div', { className: 'ce-view', 'data-corpora-editor': '' },
            h('style', null, CSS),
            h('div', { className: 'ce-status ce-status-error' }, 'Corpora Editor error: ' + message));
        }
        return h(CorporaPage, this.props);
      }
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.workspaceFiles', 'remote.terminal', 'sidebarRight'],
      apply(ctx) {
        remote = ctx.remote;
        sidebarRight = ctx.sidebarRight;
        const t = ctx.locale.bind(NS);

        ctx.effect(() => ctx.locale.register(NS, {
          en: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': 'Select a file in the tree on the right.',
            'view.loading': 'Loading…',
            'view.error': 'Could not read this file.',
            'view.dirError': 'Could not list this folder.',
            'view.emptyDir': 'No files here.',
            'view.truncated': 'Some entries are hidden.',
            'mode.edit': 'Edit',
            'mode.preview': 'Preview',
            'mode.editDisabled': 'This file is preview-only.',
            'type.label': 'File type',
            'save.label': 'Save',
            'save.saving': 'Saving…',
          },
          es: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': 'Selecciona un archivo en el árbol de la derecha.',
            'view.loading': 'Cargando…',
            'view.error': 'No se pudo leer este archivo.',
            'view.dirError': 'No se pudo listar esta carpeta.',
            'view.emptyDir': 'No hay archivos aquí.',
            'view.truncated': 'Algunas entradas están ocultas.',
            'mode.edit': 'Editar',
            'mode.preview': 'Vista previa',
            'mode.editDisabled': 'Este archivo es de solo vista previa.',
            'type.label': 'Tipo de archivo',
            'save.label': 'Guardar',
            'save.saving': 'Guardando…',
          },
          zh: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': '在右侧的文件树中选择一个文件。',
            'view.loading': '加载中…',
            'view.error': '无法读取此文件。',
            'view.dirError': '无法列出此文件夹。',
            'view.emptyDir': '此处没有文件。',
            'view.truncated': '部分条目已隐藏。',
            'mode.edit': '编辑',
            'mode.preview': '预览',
            'mode.editDisabled': '此文件仅支持预览。',
            'type.label': '文件类型',
            'save.label': '保存',
            'save.saving': '保存中…',
          },
          ja: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': '右側のファイルツリーでファイルを選択してください。',
            'view.loading': '読み込み中…',
            'view.error': 'このファイルを読み込めませんでした。',
            'view.dirError': 'このフォルダーを一覧表示できませんでした。',
            'view.emptyDir': 'ここにファイルはありません。',
            'view.truncated': '一部のエントリは非表示です。',
            'mode.edit': '編集',
            'mode.preview': 'プレビュー',
            'mode.editDisabled': 'このファイルはプレビューのみです。',
            'type.label': 'ファイルの種類',
            'save.label': '保存',
            'save.saving': '保存中…',
          },
          fr: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': "Sélectionnez un fichier dans l'arborescence à droite.",
            'view.loading': 'Chargement…',
            'view.error': 'Impossible de lire ce fichier.',
            'view.dirError': 'Impossible de lister ce dossier.',
            'view.emptyDir': 'Aucun fichier ici.',
            'view.truncated': 'Certaines entrées sont masquées.',
            'mode.edit': 'Modifier',
            'mode.preview': 'Aperçu',
            'mode.editDisabled': 'Ce fichier est en lecture seule.',
            'type.label': 'Type de fichier',
            'save.label': 'Enregistrer',
            'save.saving': 'Enregistrement…',
          },
          de: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': 'Wählen Sie rechts im Dateibaum eine Datei aus.',
            'view.loading': 'Wird geladen…',
            'view.error': 'Diese Datei konnte nicht gelesen werden.',
            'view.dirError': 'Dieser Ordner konnte nicht aufgelistet werden.',
            'view.emptyDir': 'Keine Dateien hier.',
            'view.truncated': 'Einige Einträge sind ausgeblendet.',
            'mode.edit': 'Bearbeiten',
            'mode.preview': 'Vorschau',
            'mode.editDisabled': 'Diese Datei ist nur zur Vorschau verfügbar.',
            'type.label': 'Dateityp',
            'save.label': 'Speichern',
            'save.saving': 'Wird gespeichert…',
          },
          ru: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': 'Выберите файл в дереве справа.',
            'view.loading': 'Загрузка…',
            'view.error': 'Не удалось прочитать этот файл.',
            'view.dirError': 'Не удалось показать содержимое этой папки.',
            'view.emptyDir': 'Здесь нет файлов.',
            'view.truncated': 'Некоторые записи скрыты.',
            'mode.edit': 'Правка',
            'mode.preview': 'Предпросмотр',
            'mode.editDisabled': 'Этот файл доступен только для просмотра.',
            'type.label': 'Тип файла',
            'save.label': 'Сохранить',
            'save.saving': 'Сохранение…',
          },
          pt: {
            'view.label': 'Corpora',
            'view.title': 'Corpora',
            'view.empty': 'Selecione um arquivo na árvore à direita.',
            'view.loading': 'Carregando…',
            'view.error': 'Não foi possível ler este arquivo.',
            'view.dirError': 'Não foi possível listar esta pasta.',
            'view.emptyDir': 'Nenhum arquivo aqui.',
            'view.truncated': 'Algumas entradas estão ocultas.',
            'mode.edit': 'Editar',
            'mode.preview': 'Pré-visualizar',
            'mode.editDisabled': 'Este arquivo é somente visualização.',
            'type.label': 'Tipo de arquivo',
            'save.label': 'Salvar',
            'save.saving': 'Salvando…',
          },
        }), 'corpora-editor: dictionaries');

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 5, label: () => t('view.label'), locale: NS,
        }, CorporaPanelIcon));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL_ID, locale: NS,
        }, CorporaBoundary));
      },
    };
  },
});
