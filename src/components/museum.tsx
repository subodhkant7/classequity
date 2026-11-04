export default function Museum({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      fill="none"
      role="img"
      aria-label="Illustration of a science museum surrounded by trees"
    >
      <defs>
        <linearGradient id="sky" x1="300" x2="300" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d0e7e1" />
          <stop offset="1" stopColor="#f5ecd7" />
        </linearGradient>
        <linearGradient
          id="glass"
          x1="290"
          y1="130"
          x2="420"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#507c78" />
          <stop offset="1" stopColor="#143d38" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" rx="24" fill="url(#sky)" />
      <circle cx="468" cy="84" r="42" fill="#fff5d2" />
      <path d="M0 275Q100 230 210 265T600 248V400H0Z" fill="#a4b8a2" />
      <path d="M35 400L252 270H419L560 400" fill="#dedac3" />
      <path d="M130 173L315 82L500 173Z" fill="#eef0df" />
      <path d="M136 177L315 99L493 177" stroke="#8d9c8a" strokeWidth="8" />
      <path d="M150 179H480V298H150Z" fill="#e8e5d0" />
      <path d="M183 190H449V292H183Z" fill="url(#glass)" />
      {[190, 238, 286, 334, 382, 430].map((x) => (
        <path key={x} d={`M${x} 187V293`} stroke="#d3d5c3" strokeWidth="9" />
      ))}
      <path d="M178 231H451" stroke="#bdcbb9" strokeWidth="5" />
      <path d="M142 176H490V189H142Z" fill="#f6f3df" />
      <path d="M135 293H494V305H135Z" fill="#b6b5a1" />
      <path d="M125 306H505V316H125Z" fill="#dbd8bf" />
      <path d="M115 318H516V328H115Z" fill="#eee8d1" />
      <path d="M294 258H339V300H294Z" fill="#1b3b35" />
      <path d="M316 259V301" stroke="#c1d0b5" strokeWidth="3" />
      <circle cx="315" cy="149" r="17" stroke="#718b7d" strokeWidth="3" />
      <path d="M300 149H330M315 134V164" stroke="#718b7d" strokeWidth="2" />
      <path d="M79 221V336M542 215V322" stroke="#756f53" strokeWidth="8" />
      <ellipse cx="78" cy="209" rx="41" ry="66" fill="#5d826a" />
      <ellipse cx="543" cy="194" rx="42" ry="72" fill="#678973" />
      <ellipse cx="32" cy="282" rx="51" ry="38" fill="#77987b" />
      <ellipse cx="576" cy="290" rx="48" ry="39" fill="#4b765c" />
      <path d="M0 371Q125 328 204 371M456 373Q535 336 600 361" stroke="#8d9c7c" strokeWidth="32" />
      <circle cx="221" cy="335" r="7" fill="#775d44" />
      <path
        d="M220 344V365M214 351L227 351M220 365L212 377M220 365L229 377"
        stroke="#b87348"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="364" cy="341" r="7" fill="#584b40" />
      <path
        d="M364 350V371M357 357L373 357M364 371L357 382M364 371L371 382"
        stroke="#476781"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="393" cy="333" r="7" fill="#816a47" />
      <path
        d="M393 342V362M385 348L401 348M393 362L386 374M393 362L400 374"
        stroke="#af9c65"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
