/**
 * Design tokens extracted from docs/figma-design-spec.md.
 * Plain TS constants so any styling approach (CSS vars, inline) can consume them.
 */
export const tokens = {
  color: {
    bg: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F8F7F5',
    primary: '#5973D1',
    textPrimary: '#0A0A0A',
    textStrong: '#262626',
    textMuted: '#717182',
    footerText: '#364153',
    footerLink: '#6A7282',
    borderSubtle: 'rgba(0,0,0,0.1)',
    divider: 'rgba(198,198,198,0.5)',
    // marker palette
    markerTeal: '#2EC5D1',
    markerRed: '#D12429',
    markerOrange: '#FF8000',
    markerBlue: '#5973D1',
    markerCore: '#FF0000',
    markerHalo: 'rgba(255,0,0,0.27)',
  },
  font: {
    content: "'Inter', system-ui, sans-serif",
    chrome: "'SF Pro', system-ui, sans-serif",
  },
  radius: {
    card: '8.75px',
    pill: '6.75px',
  },
  shadow: {
    chrome: '0px 0px 8px 0px rgba(0,0,0,0.08)',
  },
} as const;
