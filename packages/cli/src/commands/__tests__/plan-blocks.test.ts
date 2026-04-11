import { describe, expect, test } from 'bun:test';
import {
  parseBlock,
  parseBlocks,
  validateTime,
  timeToMinutes,
  inferBlockType,
} from '../plan.js';

// ── validateTime ──────────────────────────────────────

describe('validateTime', () => {
  test('accepts valid HH:MM times', () => {
    expect(validateTime('09:00')).toBe('09:00');
    expect(validateTime('15:30')).toBe('15:30');
    expect(validateTime('00:00')).toBe('00:00');
    expect(validateTime('23:59')).toBe('23:59');
  });

  test('zero-pads single-digit hours', () => {
    expect(validateTime('9:00')).toBe('09:00');
    expect(validateTime('0:05')).toBe('00:05');
  });

  test('rejects invalid hours', () => {
    expect(validateTime('24:00')).toBeNull();
    expect(validateTime('25:00')).toBeNull();
    expect(validateTime('99:00')).toBeNull();
  });

  test('rejects invalid minutes', () => {
    expect(validateTime('09:60')).toBeNull();
    expect(validateTime('09:99')).toBeNull();
    expect(validateTime('12:61')).toBeNull();
  });

  test('rejects malformed strings', () => {
    expect(validateTime('abc')).toBeNull();
    expect(validateTime('12')).toBeNull();
    expect(validateTime('12:0')).toBeNull();
    expect(validateTime(':30')).toBeNull();
    expect(validateTime('')).toBeNull();
  });
});

// ── timeToMinutes ─────────────────────────────────────

describe('timeToMinutes', () => {
  test('converts times to minutes since midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('01:30')).toBe(90);
    expect(timeToMinutes('15:20')).toBe(920);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

// ── inferBlockType ────────────────────────────────────

describe('inferBlockType', () => {
  test('detects lunch', () => {
    expect(inferBlockType('lunch')).toBe('lunch');
    expect(inferBlockType('Lunch with team')).toBe('lunch');
  });

  test('detects break', () => {
    expect(inferBlockType('coffee break')).toBe('break');
    expect(inferBlockType('Break time')).toBe('break');
  });

  test('detects wake', () => {
    expect(inferBlockType('wake up')).toBe('wake');
  });

  test('detects event', () => {
    expect(inferBlockType('team meeting')).toBe('event');
    expect(inferBlockType('call with client')).toBe('event');
    expect(inferBlockType('standup sync')).toBe('event');
  });

  test('defaults to other', () => {
    expect(inferBlockType('deep work session')).toBe('other');
    expect(inferBlockType('reply ecomflo')).toBe('other');
    expect(inferBlockType('clear full inbox')).toBe('other');
  });
});

// ── parseBlock ────────────────────────────────────────

describe('parseBlock', () => {
  test('parses a valid range block', () => {
    const result = parseBlock('15:20-15:45 reply ecomflo');
    expect(result).toEqual({
      block: { start: '15:20', end: '15:45', label: 'reply ecomflo', type: 'other' },
    });
  });

  test('parses a valid range block with single-digit hours', () => {
    const result = parseBlock('9:00-9:30 morning focus');
    expect(result).toEqual({
      block: { start: '09:00', end: '09:30', label: 'morning focus', type: 'other' },
    });
  });

  test('parses a single-time block (defaults to 15 min)', () => {
    const result = parseBlock('14:00 quick task');
    expect(result).toEqual({
      block: { start: '14:00', end: '14:15', label: 'quick task', type: 'other' },
    });
  });

  test('infers lunch type from label', () => {
    const result = parseBlock('12:00-13:00 lunch');
    expect(result).toEqual({
      block: { start: '12:00', end: '13:00', label: 'lunch', type: 'lunch' },
    });
  });

  test('infers event type from meeting keyword', () => {
    const result = parseBlock('10:00-11:00 team meeting');
    expect(result).toEqual({
      block: { start: '10:00', end: '11:00', label: 'team meeting', type: 'event' },
    });
  });

  test('rejects end time before start time', () => {
    const result = parseBlock('15:00-14:00 backwards');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('must be after start time');
    }
  });

  test('rejects equal start and end time', () => {
    const result = parseBlock('15:00-15:00 zero duration');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('must be after start time');
    }
  });

  test('rejects invalid start time', () => {
    const result = parseBlock('25:00-26:00 invalid');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid start time');
    }
  });

  test('rejects invalid end time', () => {
    const result = parseBlock('09:00-09:99 invalid');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid end time');
    }
  });

  test('rejects missing description in range format', () => {
    const result = parseBlock('09:00-10:00');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid block format');
    }
  });

  test('rejects completely invalid format', () => {
    const result = parseBlock('just some text');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid block format');
    }
  });

  test('rejects empty string', () => {
    const result = parseBlock('');
    expect('error' in result).toBe(true);
  });
});

// ── parseBlocks ───────────────────────────────────────

describe('parseBlocks', () => {
  test('parses multiple valid blocks', () => {
    const result = parseBlocks([
      '15:20-15:45 reply ecomflo',
      '15:45-16:30 clear full inbox',
      '16:30-17:15 lunch',
    ]);
    expect('blocks' in result).toBe(true);
    if ('blocks' in result) {
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0]).toEqual({ start: '15:20', end: '15:45', label: 'reply ecomflo', type: 'other' });
      expect(result.blocks[1]).toEqual({ start: '15:45', end: '16:30', label: 'clear full inbox', type: 'other' });
      expect(result.blocks[2]).toEqual({ start: '16:30', end: '17:15', label: 'lunch', type: 'lunch' });
    }
  });

  test('returns first error when one block is invalid', () => {
    const result = parseBlocks([
      '09:00-10:00 valid block',
      '25:00-26:00 invalid hours',
      '11:00-12:00 another valid',
    ]);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid start time');
    }
  });

  test('handles empty array', () => {
    const result = parseBlocks([]);
    expect(result).toEqual({ blocks: [] });
  });

  test('handles single block', () => {
    const result = parseBlocks(['08:00-09:00 morning focus']);
    expect('blocks' in result).toBe(true);
    if ('blocks' in result) {
      expect(result.blocks).toHaveLength(1);
    }
  });
});
