import type { ReactNode } from "react";

export type IconName =
 | "card"
 | "qr"
 | "download"
 | "upload"
 | "copy"
 | "share"
 | "print"
 | "palette"
 | "shield"
 | "globe"
 | "check"
 | "alert"
 | "arrow-right"
 | "reset"
 | "close"
 | "chevron-right"
 | "file-text"
 | "lock"
 | "phone"
 | "mail"
 | "link"
 | "map-pin"
 | "calendar"
 | "user"
 | "spark";

/**
 * One icon family for the whole product: 24px grid, 2px stroke, rounded caps
 * and joins, geometric, never emoji. Inherits `currentColor`.
 *
 * The "Indigo Grid" system redraws every glyph at a heavier stroke with
 * rounder joins than the previous hairline set, so the icon language reads as
 * part of the new visual system rather than the old one.
 */
const PATHS: Record<IconName, ReactNode> = {
 card: (
 <>
 <rect x="3" y="5" width="18" height="14" rx="3" />
 <path d="M3,10.5h18" />
 <path d="M7,15h4" />
 </>
 ),
 qr: (
 <>
 <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="2" />
 <rect x="14" y="3.5" width="6.5" height="6.5" rx="2" />
 <rect x="3.5" y="14" width="6.5" height="6.5" rx="2" />
 <path d="M6.75,6.75h.01M17.25,6.75h.01M6.75,17.25h.01" />
 <path d="M14,14.5h2.5v2.5H14zM14,20.5h2.5M20.5,14v2.5M20.5,20.5h.01" />
 </>
 ),
 download: (
 <>
 <path d="M12,3.5v11.5" />
 <path d="M7.5,10.5L12,15l4.5,-4.5" />
 <path d="M4.5,19.5h15" />
 </>
 ),
 upload: (
 <>
 <path d="M12,19.5V8" />
 <path d="M7.5,12.5L12,8l4.5,4.5" />
 <path d="M4.5,4.5h15" />
 </>
 ),
 copy: (
 <>
 <rect x="9" y="9" width="11.5" height="11.5" rx="2.5" />
 <path d="M5.5,14.5H4.5a2.5,2.5,0,0,1,-2.5,-2.5V4.5a2.5,2.5,0,0,1,2.5,-2.5h7.5a2.5,2.5,0,0,1,2.5,2.5v1" />
 </>
 ),
 share: (
 <>
 <circle cx="17.5" cy="5" r="2.75" />
 <circle cx="6.5" cy="12" r="2.75" />
 <circle cx="17.5" cy="19" r="2.75" />
 <path d="M8.9,10.6L15.6,5.9M8.9,13.4L15.6,18.1" />
 </>
 ),
 print: (
 <>
 <path d="M6.5,9V3.5h11V9" />
 <path d="M6.5,17.5H4.5a2,2,0,0,1,-2,-2v-4.5a2,2,0,0,1,2,-2h15a2,2,0,0,1,2,2v4.5a2,2,0,0,1,-2,2h-2" />
 <rect x="6.5" y="13.5" width="11" height="7" rx="1.5" />
 </>
 ),
 palette: (
 <>
 <path d="M12,3.5a8.5,8.5,0,1,0,0,17h1.25a2.25,2.25,0,0,0,0,-4.5H12a1.75,1.75,0,0,1,0,-3.5h3.75a4.75,4.75,0,0,0,0,-9.5z" />
 <path d="M7.75,10.75h.01M10.25,7.75h.01M14.25,7.75h.01" />
 </>
 ),
 shield: (
 <>
 <path d="M12,21.5s7.5,-3.5,7.5,-9.5v-6l-7.5,-2.5l-7.5,2.5v6c0,6,7.5,9.5,7.5,9.5z" />
 <path d="M9,12l2,2l4,-4.5" />
 </>
 ),
 globe: (
 <>
 <circle cx="12" cy="12" r="8.5" />
 <path d="M3.5,12h17" />
 <path d="M12,3.5a13,13,0,0,1,0,17a13,13,0,0,1,0,-17" />
 </>
 ),
 check: <path d="M4.5,12.5l4.5,4.5L19.5,6.5" />,
 alert: (
 <>
 <path d="M10.7,4.6L2.9,17.9a2,2,0,0,0,1.7,3h14.8a2,2,0,0,0,1.7,-3L13.3,4.6a2,2,0,0,0,-3.6,0z" />
 <path d="M12,9.5v4M12,16.99h.01" />
 </>
 ),
 "arrow-right": (
 <>
 <path d="M4,12h15" />
 <path d="M13,6l6,6l-6,6" />
 </>
 ),
 reset: (
 <>
 <path d="M3.5,12a8.5,8.5,0,1,0,2.9,-6.4" />
 <path d="M3.5,4.5v4.5h4.5" />
 </>
 ),
 close: <path d="M6.5,6.5l11,11M17.5,6.5l-11,11" />,
 "chevron-right": <path d="M9.5,6l6,6l-6,6" />,
 "file-text": (
 <>
 <path d="M14,2.5H6.5a2,2,0,0,0,-2,2v15a2,2,0,0,0,2,2h11a2,2,0,0,0,2,-2V8z" />
 <path d="M14,2.5V8h5.5" />
 <path d="M8.5,13h7M8.5,16.5h4.5" />
 </>
 ),
 lock: (
 <>
 <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
 <path d="M8,10.5V7a4,4,0,0,1,8,0v3.5" />
 </>
 ),
 phone: (
 <>
 <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
 <path d="M11,18.5h2" />
 </>
 ),
 mail: (
 <>
 <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
 <path d="M3,7l9,6.5L21,7" />
 </>
 ),
 link: (
 <>
 <path d="M10.5,13.5a4.5,4.5,0,0,0,6.4,0l2.6,-2.6a4.5,4.5,0,0,0,-6.4,-6.4l-1,1" />
 <path d="M13.5,10.5a4.5,4.5,0,0,0,-6.4,0l-2.6,2.6a4.5,4.5,0,0,0,6.4,6.4l1,-1" />
 </>
 ),
 "map-pin": (
 <>
 <path d="M19.5,10c0,5.5,-7.5,11,-7.5,11S4.5,15.5,4.5,10a7.5,7.5,0,1,1,15,0z" />
 <circle cx="12" cy="10" r="2.75" />
 </>
 ),
 calendar: (
 <>
 <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
 <path d="M16,2.5v4M8,2.5v4M3.5,10h17" />
 </>
 ),
 user: (
 <>
 <circle cx="12" cy="8" r="3.75" />
 <path d="M4.5,20.5a7.5,7.5,0,0,1,15,0" />
 </>
 ),
 spark: <path d="M12,3l1.9,5.1L19,10l-5.1,1.9L12,17l-1.9,-5.1L5,10l5.1,-1.9z" />,
};

const VIEW_BOX = [0, 0, 24, 24].join(" ");

interface IconProps {
 name: IconName;
 className?: string;
 strokeWidth?: number;
}

export function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }: IconProps) {
 return (
 <svg
 viewBox={VIEW_BOX}
 fill="none"
 stroke="currentColor"
 strokeWidth={strokeWidth}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={className}
 aria-hidden="true"
 focusable="false"
 >
 {PATHS[name]}
 </svg>
 );
}
