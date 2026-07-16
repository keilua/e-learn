import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins plain class names', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm');
  });

  it('drops falsy values', () => {
    expect(cn('p-2', false, null, undefined, 'text-sm')).toBe('p-2 text-sm');
  });

  it('lets a later conflicting Tailwind class win', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('applies conditional classes from an object', () => {
    expect(cn('base', { 'text-red-500': true, 'text-blue-500': false })).toBe('base text-red-500');
  });
});
