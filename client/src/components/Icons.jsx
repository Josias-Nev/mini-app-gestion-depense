/** Icônes SVG inline (trait fin, héritent de currentColor). */

function I({ children, size = 20, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </I>
);

export const IconList = (p) => (
  <I {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </I>
);

export const IconTag = (p) => (
  <I {...p}>
    <path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </I>
);

export const IconWallet = (p) => (
  <I {...p}>
    <path d="M20 7H5a2 2 0 0 1-2-2 2 2 0 0 1 2-2h13v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" />
    <circle cx="16.5" cy="14" r="1.2" />
  </I>
);

export const IconChart = (p) => (
  <I {...p}>
    <line x1="3" y1="21" x2="21" y2="21" />
    <rect x="5" y="12" width="4" height="9" rx="1" />
    <rect x="11" y="6" width="4" height="15" rx="1" />
    <rect x="17" y="15" width="4" height="6" rx="1" />
  </I>
);

export const IconUser = (p) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </I>
);

export const IconLogout = (p) => (
  <I {...p}>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </I>
);

export const IconPlus = (p) => (
  <I {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </I>
);

export const IconSearch = (p) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </I>
);

export const IconEdit = (p) => (
  <I {...p} size={16}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </I>
);

export const IconTrash = (p) => (
  <I {...p} size={16}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </I>
);

export const IconClose = (p) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);

export const IconArrowUp = (p) => (
  <I {...p}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </I>
);

export const IconArrowDown = (p) => (
  <I {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </I>
);

export const IconChevronLeft = (p) => (
  <I {...p} size={16}>
    <polyline points="15 18 9 12 15 6" />
  </I>
);

export const IconChevronRight = (p) => (
  <I {...p} size={16}>
    <polyline points="9 18 15 12 9 6" />
  </I>
);

export const IconCalendar = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);

export const IconSun = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
    <line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
    <line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
  </I>
);

export const IconMoon = (p) => (
  <I {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
  </I>
);

export const IconRepeat = (p) => (
  <I {...p}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </I>
);

export const IconDownload = (p) => (
  <I {...p} size={16}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </I>
);

export const IconPause = (p) => (
  <I {...p} size={16}>
    <line x1="9" y1="5" x2="9" y2="19" />
    <line x1="15" y1="5" x2="15" y2="19" />
  </I>
);

export const IconPlay = (p) => (
  <I {...p} size={16}>
    <polygon points="6 3 20 12 6 21 6 3" />
  </I>
);

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#lg-logo)" />
      <path
        d="M20 40c0-8.8 5.4-16 12-16s12 7.2 12 16"
        fill="none"
        stroke="#022c22"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="40" r="5.5" fill="#022c22" />
      <circle cx="27" cy="17" r="4" fill="#022c22" />
      <circle cx="37" cy="17" r="4" fill="#022c22" />
    </svg>
  );
}
