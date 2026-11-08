import './IurisMascot.css';

/** La stessa I nella barra laterale e nella guida; tutta la figura resta decorativa. */
export default function IurisMascot({ variant = 'small', active = true, greet = false }: {
  variant?: 'small' | 'guide' | 'working'; active?: boolean; greet?: boolean;
}) {
  return <span className={`iuris-mascot iuris-mascot--${variant}${greet ? ' iuris-mascot--greet' : ''}`} data-awake={active} aria-hidden="true">
    <svg viewBox="0 0 64 72" fill="none" focusable="false">
      <g className="iuris-mascot-entrance">
        <g className="iuris-mascot-body">
          <path fill="currentColor" d="M20 10c-2.5 0-2.5 3.5 0 3.5h3.5c3.5 0 4.5 2 4.5 5.5v34c0 3.5-1 5.5-4.5 5.5H20c-2.5 0-2.5 3.5 0 3.5h24c2.5 0 2.5-3.5 0-3.5h-3.5c-3.5 0-4.5-2-4.5-5.5V19c0-3.5 1-5.5 4.5-5.5H44c2.5 0 2.5-3.5 0-3.5H20Z" />
          <g className="iuris-mascot-gaze">
            <g className="iuris-mascot-eyes">
              <ellipse cx="29.4" cy="35.5" rx="1.7" ry="2.4" />
              <ellipse cx="34.6" cy="35.5" rx="1.7" ry="2.4" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  </span>;
}
