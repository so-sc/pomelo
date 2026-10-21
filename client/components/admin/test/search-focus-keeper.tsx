"use client";

import { useEffect, useRef } from "react";

/**
 * Preserves focus (and caret position) on the filter inputs across the
 * rerenders caused by URL-driven filtering.
 *
 * Every debounced filter change calls router.replace, which rerenders the
 * page. During that rerender something takes DOM focus - sometimes silently
 * (focused element removed/remounted: no events fire at all), sometimes
 * loudly (an explicit focus() elsewhere: fires blur + focusin).
 *
 * Theft vs. intent:
 * - pointerdown outside the filter inputs, or Tab = user leaving on purpose
 *   -> disarm, never restore.
 * - focusin on a filter input = arm it (click, Tab, or our own restore).
 * - focusin anywhere else WITHOUT a click/Tab right before = theft -> restore.
 * - DOM mutations while armed also schedule a restore (catches the silent
 *   removal case, which fires no events).
 *
 * Blur is deliberately NOT used as a disarm signal - theft fires blur too,
 * and that is exactly the bug where backspace lost focus but typing didn't.
 */

const TRACKED_IDS = ["result-search", "score-min", "score-max"] as const;
const INTENT_WINDOW_MS = 200;

export function SearchFocusKeeper() {
  const armedId = useRef<string | null>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  const lastPointerDown = useRef(0);
  const lastTab = useRef(0);
  const rafId = useRef<number | null>(null);
  const delayedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isTracked = (el: Element | null | undefined): el is HTMLInputElement =>
      !!el &&
      el instanceof HTMLInputElement &&
      TRACKED_IDS.includes(el.id as (typeof TRACKED_IDS)[number]);

    const saveCaret = () => {
      const el = document.activeElement;
      if (isTracked(el) && armedId.current === el.id) {
        caret.current = {
          start: el.selectionStart ?? el.value.length,
          end: el.selectionEnd ?? el.value.length,
        };
      }
    };

    const disarm = () => {
      armedId.current = null;
      caret.current = null;
    };

    const restore = () => {
      const id = armedId.current;
      if (!id) return;
      // Re-query by ID: if the input was remounted, this finds the NEW node.
      const el = document.getElementById(id);
      if (!isTracked(el)) return;
      if (document.activeElement === el) return;
      el.focus({ preventScroll: true });
      if (caret.current && el.value.length > 0) {
        const start = Math.min(caret.current.start, el.value.length);
        const end = Math.min(caret.current.end, el.value.length);
        try {
          el.setSelectionRange(start, end);
        } catch {
          // type=number inputs reject setSelectionRange in some browsers
        }
      }
    };

    const scheduleRestore = () => {
      restore();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(restore);
      if (delayedTimer.current) clearTimeout(delayedTimer.current);
      delayedTimer.current = setTimeout(restore, 50);
    };

    const onPointerDown = (e: PointerEvent) => {
      lastPointerDown.current = Date.now();
      const target = e.target as Element | null;
      // Clicking a filter input (or its spinner buttons) keeps us armed -
      // the focusin that follows re-arms anyway. Clicking anything else is
      // the user leaving on purpose.
      if (target && !isTracked(target)) disarm();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") lastTab.current = Date.now();
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (isTracked(target)) {
        armedId.current = target.id;
        saveCaret();
        return;
      }
      // Focus landed outside the filter inputs. If the user just clicked or
      // tabbed there, that is intentional. If not, something stole focus.
      const intentional =
        Date.now() - lastPointerDown.current < INTENT_WINDOW_MS ||
        Date.now() - lastTab.current < INTENT_WINDOW_MS;
      if (intentional) {
        disarm();
      } else if (armedId.current) {
        scheduleRestore();
      }
    };

    const onMutations = () => {
      if (!armedId.current) return;
      scheduleRestore();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("selectionchange", saveCaret);
    document.addEventListener("input", saveCaret, true);

    const observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("selectionchange", saveCaret);
      document.removeEventListener("input", saveCaret, true);
      observer.disconnect();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      if (delayedTimer.current) clearTimeout(delayedTimer.current);
    };
  }, []);

  return null;
}
