import type { ReactNode } from 'react';

import './AppShell.css';

interface AppShellProps {
  children: ReactNode;
}

/** Page chrome: top nav + footer wrapping page content (Explorer now, DrillDown later). */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__nav">
        <span className="app-shell__brand">CytoReason</span>
        <ul className="app-shell__links">
          <li>
            <a className="app-shell__link" href="#">
              Notebook documentation
            </a>
          </li>
          <li>
            <a className="app-shell__link" href="#">
              CytoPedia
            </a>
          </li>
          <li>
            <a className="app-shell__link" href="#">
              Support
            </a>
          </li>
          <li>
            <span className="app-shell__avatar" aria-label="User: YS">
              YS
            </span>
          </li>
        </ul>
      </header>

      <main className="app-shell__main">{children}</main>

      <footer className="app-shell__footer">
        <span>© 2026 CytoReason. All rights reserved.</span>
        <a className="app-shell__footer-link app-shell__footer-spacer" href="#">
          Privacy Policy
        </a>
        <a className="app-shell__footer-link" href="#">
          Terms of Use
        </a>
      </footer>
    </div>
  );
}
