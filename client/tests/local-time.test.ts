import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { LocalTime } from '../components/ui/local-time';

test('timestamps have stable server markup until the browser can apply its locale', () => {
  const html = renderToString(createElement(LocalTime, { iso: '2026-10-15T09:00:00.000Z' }));
  assert.equal(html, '<time dateTime="2026-10-15T09:00:00.000Z">…</time>');
});

test('invalid timestamps retain the supplied fallback', () => {
  assert.equal(renderToString(createElement(LocalTime, { iso: '', fallback: 'Not submitted' })), 'Not submitted');
});
