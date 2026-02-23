import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'surtigo-theme';
  readonly mode = signal<ThemeMode>(this.loadSavedTheme());

  /** Resolved theme (what's actually applied) */
  readonly resolvedTheme = signal<'light' | 'dark'>(this.resolve(this.loadSavedTheme()));

  private mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  constructor() {
    // Listen to system theme changes
    this.mediaQuery?.addEventListener('change', () => {
      if (this.mode() === 'system') {
        this.applyTheme('system');
      }
    });

    // React to mode changes
    effect(() => {
      const m = this.mode();
      this.applyTheme(m);
    });
  }

  setTheme(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }

  cycleTheme(): void {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const current = order.indexOf(this.mode());
    const next = order[(current + 1) % order.length];
    this.setTheme(next);
  }

  private loadSavedTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'dark';
    return (localStorage.getItem(this.STORAGE_KEY) as ThemeMode) ?? 'dark';
  }

  private resolve(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return mode;
  }

  private applyTheme(mode: ThemeMode): void {
    const resolved = this.resolve(mode);
    this.resolvedTheme.set(resolved);

    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(resolved);
    html.style.colorScheme = resolved;

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? '#09090b' : '#f4f4f5');
    }
  }
}
