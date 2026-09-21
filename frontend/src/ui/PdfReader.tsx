import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, IconButton } from './Button';

interface PdfReaderProps {
  /** The address of the PDF file. */
  url: string;
  /** A short description for screen readers, e.g. the paper's title. */
  title: string;
}

/**
 * A read-only PDF reader. It draws the pages itself, so there is no download, print, edit or
 * "summarize" button (unlike the browser's built-in PDF viewer). Use it for people who may only read a paper.
 *
 * Note: this is a convenience for honest readers. Anything shown on a screen can still be
 * copied by a determined person, so keep the files themselves protected on the server too.
 */
export function PdfReader({ url, title }: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drawQueue = useRef<Promise<void>>(Promise.resolve());
  // The PDF document object from the library (kept loosely typed on purpose).
  const [doc, setDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [width, setWidth] = useState(0);

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

  // Keep track of how wide the reading area is
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Draw the current page
  useEffect(() => {
    if (!doc || !canvasRef.current || width === 0) return;
    let cancelled = false;
    let renderTask: any;
    const job = async () => {
      if (cancelled) return;
      const pdfPage = await doc.getPage(page);
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const base = pdfPage.getViewport({ scale: 1 });
      const fit = (width - 24) / base.width;
      const scale = Math.max(fit, 0.1) * (zoom / 100);
      const ratio = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: scale * ratio });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport });
      try {
        await renderTask.promise;
      } catch {
        // A newer draw replaced this one. Nothing to do.
      }
    };
    // One canvas can only be drawn on once at a time, so a new draw waits for the one before it to finish or stop.
    drawQueue.current = drawQueue.current.then(job).catch(() => {});
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [doc, page, zoom, width]);

  const goTo = (n: number) => setPage(Math.min(Math.max(n, 1), pageCount || 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(page + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(page - 1); }
  };

  if (status === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        We could not open this paper. Please check your internet connection and try again.
      </div>
    );
  }

  return (
    <div className="no-print space-y-3" aria-label={`Paper: ${title}`}>
      {/* Our own controls: only reading, nothing else */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => goTo(page - 1)}>
            Previous Page
          </Button>
          <span className="min-w-24 text-center text-sm font-semibold text-slate-800" aria-live="polite">
            {status === 'ready' ? `Page ${page} of ${pageCount}` : 'Loading…'}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
            Next Page
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <IconButton icon={ZoomOut} variant="secondary" label="Make the page smaller" onClick={() => setZoom(z => Math.max(50, z - 25))} />
          <span className="min-w-12 text-center text-sm font-semibold text-slate-800">{zoom}%</span>
          <IconButton icon={ZoomIn} variant="secondary" label="Make the page bigger" onClick={() => setZoom(z => Math.min(250, z + 25))} />
        </div>
      </div>

      <div
        ref={boxRef}
        tabIndex={0}
        role="document"
        aria-label={`Pages of ${title}. Use the left and right arrow keys to change page.`}
        onKeyDown={onKeyDown}
        onContextMenu={e => e.preventDefault()}
        className="h-[65vh] min-h-[360px] select-none overflow-auto rounded-lg border border-slate-300 bg-slate-200 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
      >
        {status === 'loading' && <p className="p-6 text-center text-sm text-slate-700" role="status">Opening the paper…</p>}
        <canvas
          ref={canvasRef}
          draggable={false}
          className="mx-auto block bg-white shadow"
          style={{ display: status === 'ready' ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
