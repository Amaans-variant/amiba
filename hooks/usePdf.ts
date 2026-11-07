"use client";

import { useCallback, useRef, useState } from "react";
import type * as PDFJS from "pdfjs-dist";

interface PdfState {
  doc: PDFJS.PDFDocumentProxy | null;
  numPages: number;
  fullText: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: PdfState = { doc: null, numPages: 0, fullText: "", loading: false, error: null };

/**
 * Loads a PDF entirely client-side (no upload to a server needed), renders
 * pages to a canvas on demand, and extracts the full text so it can be
 * handed to the AI Assistant as context. pdfjs-dist is dynamically imported
 * inside the handlers below — it touches Worker/DOMMatrix, which don't exist
 * during Next's server render pass, so a static top-level import would break
 * the very first page load.
 */
export function usePdf() {
  const [state, setState] = useState<PdfState>(EMPTY_STATE);
  const pdfjsRef = useRef<typeof PDFJS | null>(null);

  const ensurePdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import("pdfjs-dist");
    // Resolve the worker from the installed package itself instead of a
    // hardcoded CDN + version string, so it can never drift out of sync with
    // the API side ("API version X does not match Worker version Y").
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  const loadFromFile = useCallback(
    async (file: File) => {
      setState({ ...EMPTY_STATE, loading: true });
      try {
        const pdfjs = await ensurePdfjs();
        const buffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buffer }).promise;

        let fullText = "";
        // 40 pages is generous for a syllabus or a PYQ paper and keeps
        // extraction (and the eventual Gemini prompt) from ballooning if
        // someone drops in an entire 400-page textbook.
        const pagesToExtract = Math.min(doc.numPages, 40);
        for (let i = 1; i <= pagesToExtract; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          fullText += `\n\n--- Page ${i} ---\n${pageText}`;
        }

        setState({ doc, numPages: doc.numPages, fullText: fullText.trim(), loading: false, error: null });
        return doc;
      } catch (err) {
        setState({
          ...EMPTY_STATE,
          error: err instanceof Error ? err.message : "Couldn't read that PDF.",
        });
        return null;
      }
    },
    [ensurePdfjs]
  );

  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      if (!state.doc) return;
      const page = await state.doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    },
    [state.doc]
  );

  const reset = useCallback(() => setState(EMPTY_STATE), []);

  return { ...state, loadFromFile, renderPage, reset };
}
