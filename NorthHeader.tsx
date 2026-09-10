import { useId } from "react";

type NorthMarkProps = {
  className?: string;
  title?: string;
};

/** Angular N with an integrated north-pointing compass needle. */
export function NorthMark({ className = "", title }: NorthMarkProps) {
  const titleId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={`block shrink-0 ${className}`}
    >
      {title && <title id={titleId}>{title}</title>}

      {/* Shared silhouette: open negative space defines the angular N. */}
      <g transform="translate(-7 4)">
        <path
          fill="#FFFFFF"
          d="
            M24 104
            V40
            H42
            L86 80
            V42
            H72
            L95 8
            L118 42
            H104
            V104
            H86
            L42 64
            V104
            Z
          "
        />

        {/* Orange tip follows the needle's exact outer slopes. */}
        <path fill="#FF5500" d="M95 8 L105.824 24 H84.176 Z" />
      </g>
    </svg>
  );
}

type NorthHeaderProps = {
  className?: string;
};

export default function NorthHeader({ className = "" }: NorthHeaderProps) {
  return (
    <header
      dir="ltr"
      className={`
        w-full border-b border-white/10 bg-[#0D0D0D] text-white
        ${className}
      `}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-6 sm:gap-6 sm:px-8 sm:py-8 lg:px-12">
        <NorthMark className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />

        <div className="min-w-0">
          <p className="m-0 whitespace-nowrap font-sans text-xl font-black uppercase leading-none tracking-widest sm:text-3xl lg:text-4xl">
            THE NORTH
          </p>

          <div className="mt-3 flex items-center gap-3 sm:mt-4">
            <span
              aria-hidden="true"
              className="h-0.5 w-6 shrink-0 bg-[#FF5500] sm:w-8"
            />

            <p
              lang="ar"
              dir="rtl"
              className="m-0 text-sm font-bold leading-relaxed text-white sm:text-base lg:text-lg"
              style={{
                fontFamily:
                  '"Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif',
              }}
            >
              الشمال
            </p>
          </div>
        </div>

        {/* Quiet compass reference; hidden where space is limited. */}
        <div
          aria-hidden="true"
          className="ml-auto hidden items-center gap-3 pl-8 sm:flex"
        >
          <span className="h-px w-12 bg-white/15 lg:w-20" />
          <span className="font-mono text-xs font-bold tracking-widest text-[#FF5500]">
            N ↑
          </span>
        </div>
      </div>
    </header>
  );
}
