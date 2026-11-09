export function TripScene() {
  return (
    <svg className="trip-scene" viewBox="0 0 640 470" role="img" aria-labelledby="trip-scene-title">
      <title id="trip-scene-title">
        An original vector illustration of a museum, school bus and learners heading out together
      </title>
      <rect x="20" y="16" width="600" height="435" rx="150" fill="#e8eddb" />
      <circle cx="493" cy="100" r="55" fill="#f2d392" />
      <path d="M57 355Q280 288 588 355V435H57Z" fill="#c8d7af" />
      <g fill="none" stroke="#76936c" strokeWidth="3">
        <path d="M84 330V175m0 88q-45-10-40-48 38-7 40 48m0-25q43-8 40-48-40 0-40 48M553 342V207m0 75q-43-13-32-45 30 0 32 45m0-30q34-9 34-42-36-2-34 42" />
      </g>
      <g className="scene-museum">
        <path d="m185 167 123-73 126 73Z" fill="#b49eb9" />
        <path d="m210 162 98-55 100 55Z" fill="#d6c7d9" />
        <rect x="190" y="172" width="238" height="168" rx="5" fill="#f6f1de" />
        <path d="M182 169h256v16H182Z" fill="#d3bc9b" />
        <g fill="#d7c8ac">
          <path d="M205 192h22v123h-22zm53 0h22v123h-22zm79 0h22v123h-22zm51 0h22v123h-22z" />
        </g>
        <path d="M287 337v-95a22 22 0 0 1 44 0v95" fill="#264f43" />
        <path d="M180 325h260v16H180zm-10 17h280v14H170Z" fill="#c9b291" />
        <circle cx="308" cy="146" r="9" fill="#7f6b87" />
        <text
          x="309"
          y="211"
          textAnchor="middle"
          fill="#264f43"
          fontFamily="sans-serif"
          fontSize="10"
          letterSpacing="3"
        >
          DISCOVERY
        </text>
      </g>
      <g className="scene-bus">
        <rect x="65" y="303" width="223" height="88" rx="17" fill="#e5af50" />
        <rect x="78" y="312" width="140" height="38" rx="7" fill="#244d43" />
        <path d="M105 312v38m29-38v38m29-38v38m29-38v38" stroke="#e5af50" strokeWidth="5" />
        <path d="M229 315h34l13 35h-47Z" fill="#244d43" />
        <path d="M68 363h214" stroke="#b77f35" strokeWidth="4" />
        <circle cx="111" cy="389" r="21" fill="#214a40" />
        <circle cx="246" cy="389" r="21" fill="#214a40" />
        <circle cx="111" cy="389" r="9" fill="#d9dbbf" />
        <circle cx="246" cy="389" r="9" fill="#d9dbbf" />
        <rect x="71" y="359" width="13" height="7" rx="3" fill="#fff3cf" />
      </g>
      <g className="scene-learners">
        {[
          { x: 379, y: 326, c: '#6e7eab', skin: '#ba825b' },
          { x: 423, y: 340, c: '#b77658', skin: '#e0b995' },
          { x: 469, y: 326, c: '#87955d', skin: '#9d674b' },
        ].map(({ x, y, c, skin }) => (
          <g key={x}>
            <circle cx={x} cy={y - 23} r="13" fill={skin} />
            <path d={`M${x - 13} ${y - 28}q0-22 26-8v9q-16-8-26-1`} fill="#34453a" />
            <path d={`M${x - 16} ${y}q16-12 32 0l4 44h-40Z`} fill={c} />
            <path
              d={`M${x - 8} ${y + 44}v31m17-31v31`}
              stroke="#314f44"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={`M${x - 17} ${y + 8}l-12 25m46-25 10 22`}
              stroke={skin}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <rect x={x - 22} y={y + 2} width="12" height="29" rx="5" fill="#e2c37e" />
          </g>
        ))}
      </g>
      <path
        d="M322 415q30-12 42 0m145-3h26"
        stroke="#8ca47a"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
