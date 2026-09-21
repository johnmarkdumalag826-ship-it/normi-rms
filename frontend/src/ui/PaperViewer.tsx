import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Highlighter } from 'lucide-react';
import type { CommentAnchor } from '../types';
import { Alert } from './Alert';
import { Button, IconButton } from './Button';

/** A highlighted part of the paper that already has a comment. */
export interface PaperHighlight {
  id: string;
  anchor: CommentAnchor;
  /** Comments that were fixed are shown in green. */
  resolved?: boolean;
}

interface PaperViewerProps {
  /** A short private link to the file (see `useFileLink`). */
  url: string;
  /** Used to tell PDF from Word files, and for screen readers. */
  fileName: string;
  highlights?: PaperHighlight[];
  /** The text that is selected right now and is waiting for a comment (shown in blue). */
  pending?: CommentAnchor | null;
  /** Adding this turns on "select text to comment". Leave it out for a read-only view. */
  onSelect?: (anchor: CommentAnchor) => void;
  onHighlightClick?: (id: string) => void;
  /** Scrolls to a highlight and makes it stand out. Change `n` to jump to the same one again. */
  focus?: { id: string; n: number } | null;
}

type PaneProps = Omit<PaperViewerProps, 'fileName'>;

const ZOOM_STEPS = { min: 50, max: 250, step: 25 };

const collapsed = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 600);

function Toolbar({ children, zoom, setZoom }: { children?: React.ReactNode; zoom: number; setZoom: (z: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">
        <IconButton icon={ZoomOut} variant="secondary" label="Make the page smaller" onClick={() => setZoom(Math.max(ZOOM_STEPS.min, zoom - ZOOM_STEPS.step))} />
        <span className="min-w-12 text-center text-sm font-semibold text-slate-800">{zoom}%</span>
        <IconButton icon={ZoomIn} variant="secondary" label="Make the page bigger" onClick={() => setZoom(Math.min(ZOOM_STEPS.max, zoom + ZOOM_STEPS.step))} />
      </div>
    </div>
  );
}

function Hint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-slate-700">
      <Highlighter className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      Select some text with your mouse to highlight it and write a comment about it.
    </p>
  );
}

/* ================================================================ PDF */

function PdfPane({ url, highlights = [], pending, onSelect, onHighlightClick, focus }: PaneProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const pdfjsRef = useRef<any>(null);
  const scrollToY = useRef<number | null>(null);
  const drawQueue = useRef<Promise<void>>(Promise.resolve());

  const [doc, setDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [width, setWidth] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Scroll the reading area so a spot on the page (0 = top, 1 = bottom) is near the top of the view
  const scrollToFraction = (fraction: number) => {
    const box = boxRef.current;
    const pageEl = pageRef.current;
    if (!box || !pageEl) return;
    const offset = pageEl.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: Math.max(offset + fraction * pageEl.offsetHeight - 90, 0), behavior: 'smooth' });
  };

  // Load the file
  useEffect(() => {
    let cancelled = false;
    let loading: any;
    setStatus('loading');
    setDoc(null);
    setPage(1);
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        pdfjsRef.current = pdfjs;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = new Uint8Array(await response.arrayBuffer());
        loading = pdfjs.getDocument({ data, standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/` });
        const loaded = await loading.promise;
        if (cancelled) return;
        setDoc(loaded);
        setPageCount(loaded.numPages);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      loading?.destroy?.();
    };
  }, [url]);

  // How wide is the reading area?
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Draw the page, and the invisible text on top of it (so text can be selected)
  useEffect(() => {
    if (!doc || !canvasRef.current || !textRef.current || width === 0) return;
    let cancelled = false;
    let renderTask: any;
    let textLayer: any;
    const job = async () => {
      if (cancelled) return;
      const pdfPage = await doc.getPage(page);
      if (cancelled || !canvasRef.current || !textRef.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = Math.max((width - 24) / base.width, 0.1) * (zoom / 100);
      const cssViewport = pdfPage.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      const pixelViewport = pdfPage.getViewport({ scale: scale * ratio });

      const canvas = canvasRef.current;
      canvas.width = pixelViewport.width;
      canvas.height = pixelViewport.height;
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;
      setSize({ w: cssViewport.width, h: cssViewport.height });

      renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport: pixelViewport });
      try {
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') console.error('Could not draw the page', err);
        return; // a newer draw replaced this one
      }
      if (cancelled || !textRef.current) return;

      const layer = textRef.current;
      layer.replaceChildren();
      layer.style.setProperty('--total-scale-factor', String(scale));
      layer.style.width = `${cssViewport.width}px`;
      layer.style.height = `${cssViewport.height}px`;
      try {
        textLayer = new pdfjsRef.current.TextLayer({
          textContentSource: pdfPage.streamTextContent(),
          container: layer,
          viewport: cssViewport,
        });
        await textLayer.render();
      } catch (err) {
        console.error('Could not prepare the text of the page', err); // the page still shows; only selecting text is unavailable
      }

      if (!cancelled && scrollToY.current !== null) {
        scrollToFraction(scrollToY.current);
        scrollToY.current = null;
      }
    };
    // One canvas can only be drawn on once at a time, so a new draw waits for the one before it to finish or stop.
    drawQueue.current = drawQueue.current.then(job).catch(() => {});
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
      textLayer?.cancel?.();
    };
  }, [doc, page, zoom, width]);

  // Jump to a highlight
  useEffect(() => {
    if (!focus) return;
    const target = highlights.find(h => h.id === focus.id)?.anchor;
    if (target?.kind !== 'pdf') return;
    scrollToY.current = target.rects[0]?.y ?? 0;
    if (target.page !== page) {
      setPage(target.page);
    } else if (size.h) {
      scrollToFraction(scrollToY.current);
      scrollToY.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n]);

  const goTo = (n: number) => setPage(Math.min(Math.max(n, 1), pageCount || 1));

  // The person finished selecting text: remember where it is on the page
  const handleMouseUp = () => {
    if (!onSelect || !pageRef.current || !textRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    if (!textRef.current.contains(selection.anchorNode) || !textRef.current.contains(selection.focusNode)) return;
    const quote = collapsed(selection.toString());
    if (!quote) return;

    const box = pageRef.current.getBoundingClientRect();
    const seen = new Set<string>();
    const rects = Array.from(selection.getRangeAt(0).getClientRects())
      .filter(r => r.width > 1 && r.height > 1 && r.height < box.height * 0.2)
      .map(r => ({
        x: +((r.left - box.left) / box.width).toFixed(4),
        y: +((r.top - box.top) / box.height).toFixed(4),
        w: +(r.width / box.width).toFixed(4),
        h: +(r.height / box.height).toFixed(4),
      }))
      .filter(r => {
        const key = `${Math.round(r.x * 500)}:${Math.round(r.y * 500)}:${Math.round(r.w * 500)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
    if (rects.length === 0) return;

    onSelect({ kind: 'pdf', page, rects, quote });
    selection.removeAllRanges();
  };

  // Clicking a highlighted spot selects its comment
  const handleClick = (e: React.MouseEvent) => {
    if (!onHighlightClick || !pageRef.current) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const box = pageRef.current.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    const hit = [...highlights].reverse().find(h =>
      h.anchor.kind === 'pdf' && h.anchor.page === page &&
      h.anchor.rects.some(r => fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h));
    if (hit) onHighlightClick(hit.id);
  };

  if (status === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        We could not open this paper. Please check your internet connection and try again.
      </div>
    );
  }

  const shown = highlights.filter(h => h.anchor.kind === 'pdf' && h.anchor.page === page);
  const pendingHere = pending?.kind === 'pdf' && pending.page === page ? pending : null;
  const box = (rects: { x: number; y: number; w: number; h: number }[], cls: string, key: string) =>
    rects.map((r, i) => (
      <div
        key={`${key}-${i}`}
        className={cls}
        style={{ position: 'absolute', left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, mixBlendMode: 'multiply' }}
      />
    ));

  return (
    <div className="space-y-3">
      <Toolbar zoom={zoom} setZoom={setZoom}>
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => goTo(page - 1)}>Previous Page</Button>
        <span className="min-w-24 text-center text-sm font-semibold text-slate-800" aria-live="polite">
          {status === 'ready' ? `Page ${page} of ${pageCount}` : 'Loading…'}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
          Next Page
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Toolbar>
      <Hint show={!!onSelect} />

      <div
        ref={boxRef}
        onMouseUp={handleMouseUp}
        className="h-[65vh] min-h-[360px] overflow-auto rounded-lg border border-slate-300 bg-slate-200 p-3"
      >
        {status === 'loading' && <p className="p-6 text-center text-sm text-slate-700" role="status">Opening the paper…</p>}
        <div
          ref={pageRef}
          onClick={handleClick}
          className="relative mx-auto bg-white shadow"
          style={{ width: size.w || undefined, height: size.h || undefined, display: status === 'ready' ? 'block' : 'none' }}
        >
          <canvas ref={canvasRef} draggable={false} className="block" />
          {/* Highlights sit between the page picture and the (invisible) selectable text */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {shown.map(h => box(
              h.anchor.kind === 'pdf' ? h.anchor.rects : [],
              focus?.id === h.id ? 'bg-orange-300/80 outline outline-2 outline-orange-600' : h.resolved ? 'bg-green-300/60' : 'bg-yellow-300/70',
              h.id,
            ))}
            {pendingHere && box(pendingHere.rects, 'bg-blue-300/70 outline outline-2 outline-blue-600', 'pending')}
          </div>
          <div ref={textRef} className="pdf-text-layer textLayer" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================ Word (.docx) */

const textNodesOf = (root: HTMLElement): Text[] => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
};

const clearMarks = (root: HTMLElement) => {
  root.querySelectorAll('mark[data-hl]').forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  root.normalize();
};

// Wrap the characters from `start` to `end` (counted over all the text of the document) in a <mark>
const wrapRange = (root: HTMLElement, id: string, start: number, end: number, className: string) => {
  let position = 0;
  for (const node of textNodesOf(root)) {
    const length = node.data.length;
    const from = Math.max(start, position);
    const to = Math.min(end, position + length);
    if (from < to) {
      const range = document.createRange();
      range.setStart(node, from - position);
      range.setEnd(node, to - position);
      const mark = document.createElement('mark');
      mark.dataset.hl = id;
      mark.className = className;
      try { range.surroundContents(mark); } catch { /* skip a piece that cannot be wrapped */ }
    }
    position += length;
    if (position >= end) break;
  }
};

const offsetInside = (root: HTMLElement, node: Node, offset: number) => {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
};

function DocxPane({ url, highlights = [], pending, onSelect, onHighlightClick, focus }: PaneProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = useState(100);

  // Turn the Word file into a page we can show
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const { renderAsync } = await import('docx-preview');
        if (cancelled || !bodyRef.current || !styleRef.current) return;
        bodyRef.current.replaceChildren();
        styleRef.current.replaceChildren();
        await renderAsync(blob, bodyRef.current, styleRef.current, {
          className: 'docx',
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
          breakPages: true,
        });
        if (cancelled) return;
        // Start with the page fitting the reading area
        const pageWidth = bodyRef.current.querySelector<HTMLElement>('section.docx')?.offsetWidth ?? 0;
        const boxWidth = boxRef.current?.clientWidth ?? 0;
        if (pageWidth && boxWidth) {
          const fit = Math.floor(((boxWidth - 24) / (pageWidth + 60)) * 20) * 5;
          setZoom(Math.min(100, Math.max(ZOOM_STEPS.min, fit)));
        }
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Paint the highlights
  useEffect(() => {
    const root = bodyRef.current;
    if (status !== 'ready' || !root) return;
    clearMarks(root);
    const items = highlights
      .filter(h => h.anchor.kind === 'docx')
      .map(h => ({ h, a: h.anchor as Extract<CommentAnchor, { kind: 'docx' }> }))
      .sort((x, y) => x.a.start - y.a.start);
    for (const { h, a } of items) {
      const cls = focus?.id === h.id ? 'paper-mark paper-mark-active' : h.resolved ? 'paper-mark paper-mark-done' : 'paper-mark';
      wrapRange(root, h.id, a.start, a.end, cls);
    }
    if (pending?.kind === 'docx') wrapRange(root, 'pending', pending.start, pending.end, 'paper-mark paper-mark-pending');
  }, [status, highlights, pending, focus?.id]);

  // Jump to a highlight
  useEffect(() => {
    if (!focus || status !== 'ready') return;
    bodyRef.current?.querySelector(`mark[data-hl="${CSS.escape(focus.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n, status]);

  const handleMouseUp = () => {
    const root = bodyRef.current;
    if (!onSelect || !root) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const quote = collapsed(selection.toString());
    if (!quote) return;
    const start = offsetInside(root, range.startContainer, range.startOffset);
    const end = offsetInside(root, range.endContainer, range.endOffset);
    if (end <= start) return;
    onSelect({ kind: 'docx', start, end, quote });
    selection.removeAllRanges();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!onHighlightClick) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('mark[data-hl]')?.dataset.hl;
    if (id && id !== 'pending') onHighlightClick(id);
  };

  if (status === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        We could not show this Word document. You can still use “Download File” to read it.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Toolbar zoom={zoom} setZoom={setZoom}>
        <span className="text-sm font-semibold text-slate-800" aria-live="polite">
          {status === 'ready' ? 'Word document' : 'Loading…'}
        </span>
      </Toolbar>
      <Hint show={!!onSelect} />

      <div
        ref={boxRef}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="h-[65vh] min-h-[360px] overflow-auto rounded-lg border border-slate-300 bg-slate-200"
      >
        {status === 'loading' && <p className="p-6 text-center text-sm text-slate-700" role="status">Opening the paper…</p>}
        <div ref={styleRef} />
        <div ref={bodyRef} style={{ zoom: zoom / 100 }} />
      </div>
    </div>
  );
}

/* ================================================================ Public */

/**
 * Shows a paper (PDF or Word) and lets people highlight text and comment on it.
 * Add `onSelect` to allow highlighting; without it the paper is only shown (with existing highlights).
 */
export function PaperViewer({ fileName, ...pane }: PaperViewerProps) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return <PdfPane {...pane} />;
  if (lower.endsWith('.docx')) return <DocxPane {...pane} />;
  return (
    <Alert tone="info" title="This file cannot be shown on this page">
      Only PDF and Word (.docx) files can be shown here. Use “Download File” to read this one.
    </Alert>
  );
}
