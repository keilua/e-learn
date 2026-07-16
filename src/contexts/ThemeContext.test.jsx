import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from '@/hooks/useTheme';

const Probe = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light when nothing is stored', () => {
    renderWithProvider();

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches to dark, applies the .dark class and persists the choice', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('toggle'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('e-learn-theme')).toBe('dark');
  });

  it('picks up a previously saved dark preference on mount', () => {
    window.localStorage.setItem('e-learn-theme', 'dark');
    renderWithProvider();

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles back to light and removes the .dark class', () => {
    window.localStorage.setItem('e-learn-theme', 'dark');
    renderWithProvider();

    fireEvent.click(screen.getByText('toggle'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('e-learn-theme')).toBe('light');
  });
});
