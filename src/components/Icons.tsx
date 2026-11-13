import type { ReactNode } from "react";

const make = (paths: ReactNode) =>
  function Icon({ className = "i" }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        {paths}
      </svg>
    );
  };

export const IconLogout = make(<><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" /><path d="M15 16l4-4-4-4M19 12H9" /></>);
export const IconCopy = make(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h9" /></>);
export const IconEdit = make(<><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>);
export const IconTrash = make(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconUp = make(<path d="M6 15l6-6 6 6" />);
export const IconDown = make(<path d="M6 9l6 6 6-6" />);
export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);
export const IconLeft = make(<path d="M15 6l-6 6 6 6" />);
export const IconRight = make(<path d="M9 6l6 6-6 6" />);
export const IconTable = make(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M9 10v9" /></>);
export const IconList = make(<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />);
export const IconUserPlus = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /><path d="M19 3v4M17 5h4" /></>);
export const IconSun = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconMoon = make(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconHome = make(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>);
export const IconKey = make(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></>);
export const IconInfo = make(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>);
export const IconArrow = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconSignIn = make(<><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" /></>);

// The "B" monogram, shared by the logo tile, the link-preview card and
// apple-icon (src/app/icon.svg inlines the same path). Drawn as a path so it
// never depends on a font.
export const LOGO_B_PATH =
  "M6.5 4.5H12.6C15.2 4.5 16.7 5.9 16.7 8C16.7 9.4 16 10.5 14.8 11.2C16.4 11.7 17.6 13 17.6 14.9C17.6 17.7 15.6 19.5 12.6 19.5H6.5ZM9.5 7.2V10.4H12.2C13.2 10.4 13.8 9.8 13.8 8.8C13.8 7.8 13.2 7.2 12.2 7.2ZM9.5 12.8V16.8H12.5C13.8 16.8 14.6 16.1 14.6 14.8C14.6 13.5 13.8 12.8 12.5 12.8Z";

export function LogoMark() {
  return (
    <div className="logo" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={LOGO_B_PATH} fillRule="evenodd" />
      </svg>
    </div>
  );
}
