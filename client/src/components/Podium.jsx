// client/src/components/Podium.jsx
import React, { useState, useEffect, useRef } from "react";

// --- Instagram handle -> gerçek görsel URL ---
const igAvatar = (value) => {
  if (!value) return "";
  const v = String(value).trim();
  if (v.startsWith("http")) return v;
  const m = v.match(/(?:@|instagram\.com\/)([A-Za-z0-9_.]+)/i);
  if (m) return `https://unavatar.io/instagram/${m[1]}`;
  return v;
};

// --- Güvenli Avatar (fallback + no-referrer) ---
function Avatar({ src, alt = "", size = 64, className = "" }) {
  const [err, setErr] = useState(false);
  const finalSrc = err ? "" : igAvatar(src);

  const initials = (alt || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const baseStyle = { width: size, height: size };

  if (finalSrc) {
    return (
      <img
        src={finalSrc}
        alt={alt}
        width={size}
        height={size}
        style={baseStyle}
        className={"rounded-full object-cover " + className}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
      />
    );
  }

  // Fallback: baş harf
  return (
    <div
      aria-label={alt}
      style={baseStyle}
      className={
        "rounded-full flex items-center justify-center text-white font-semibold " +
        className
      }
    >
      <span style={{ fontSize: Math.max(12, Math.floor(size * 0.4)) }}>
        {initials}
      </span>
    </div>
  );
}

/* ---------------- YUMUŞAK salınımlı taç ---------------- */
function BouncyCrown({ size = 32, amplitude = 6, speed = 0.6, tilt = 5 }) {
  const ref = useRef(null);

  useEffect(() => {
    let rafId;
    let start;

    const loop = (ts) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000; // saniye
      const y = Math.sin(t * Math.PI * 2 * speed) * amplitude; // px
      const r = Math.sin(t * Math.PI * 2 * speed) * tilt; // deg
      if (ref.current) {
        ref.current.style.transform = `translateY(${y}px) rotate(${r}deg)`;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [amplitude, speed, tilt]);

  return (
    <span
      ref={ref}
      aria-hidden
      style={{
        display: "inline-block",
        willChange: "transform",
        transition: "transform 80ms linear",
        textShadow: "0 0 12px rgba(250,204,21,0.6)",
        fontSize: size,
        userSelect: "none",
        filter: "drop-shadow(0 4px 10px rgba(250,204,21,0.35))",
      }}
    >
      👑
    </span>
  );
}

/* ---------------- StarBurst: Yıldız patlaması (container-relative) ---------------- */
function StarBurst({ fireKey }) {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    if (!fireKey) return;
    const make = Array.from({ length: 28 }, (_, i) => ({
      id: `${fireKey}-${i}`,
      dx: (Math.random() - 0.5) * 140, // yatayda geniş saçılım
      dy: (Math.random() - 0.9) * 180, // yukarı ağırlıklı
      dur: 700 + Math.random() * 700, // 0.7s - 1.4s
      delay: Math.random() * 120, // 0 - 120ms
      size: 10 + Math.random() * 18, // 10 - 28px
      rot: (Math.random() - 0.5) * 180, // -90° ~ 90°
      op: 0.65 + Math.random() * 0.35, // 0.65 - 1
    }));
    setStars(make);
    const t = setTimeout(() => setStars([]), 1600);
    return () => clearTimeout(t);
  }, [fireKey]);

  return (
    <>
      <style>{`
        @keyframes star-pop {
          0% {
            transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% {
            transform:
              translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
              scale(1)
              rotate(var(--rot));
            opacity: 0;
          }
        }
        .star-particle {
          position: absolute;   /* container-relative */
          left: 50%;
          top: 50%;
          pointer-events: none;
          z-index: 40;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,.15));
        }
      `}</style>

      {stars.map((s) => (
        <svg
          key={s.id}
          className="star-particle"
          style={{
            width: s.size,
            height: s.size,
            opacity: s.op,
            ["--dx"]: `${s.dx}px`,
            ["--dy"]: `${s.dy}px`,
            ["--rot"]: `${s.rot}deg`,
            animation: `star-pop ${s.dur}ms cubic-bezier(.2,.8,.2,1) ${s.delay}ms forwards`,
          }}
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient id={`g-${s.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#g-${s.id})`}
            d="M12 2l2.95 6.02L22 9.27l-5 4.87L18.9 22 12 18.6 5.1 22 7 14.14 2 9.27l7.05-1.25z"
          />
        </svg>
      ))}
    </>
  );
}

/* ---------------- Podium ---------------- */
export default function Podium({ top3 = [] }) {
  const [first, second, third] = top3;

  // 1.'lik değişimini yakalayıp yıldız patlat
  const prevFirstId = useRef(null);
  const [fireKey, setFireKey] = useState("");

  useEffect(() => {
  if (first?.id && first.id !== prevFirstId.current) {
    prevFirstId.current = first.id;

    const fire = () => setFireKey(`fire-${first.id}-${Date.now()}`);
    fire();
    const t1 = setTimeout(fire, 500);
    const t2 = setTimeout(fire, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }
}, [first]);

  return (
    <div className="mt-6">
      <div className="flex items-end justify-center gap-4">
        {/* 2. — Gümüş taç + gümüş ring */}
        {second && (
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-6 z-20 pointer-events-none">
              <span
                className="text-2xl select-none"
                style={{
                  filter:
                    "grayscale(1) brightness(1.15) drop-shadow(0 2px 6px rgba(180,180,180,.6))",
                }}
              >
                👑
              </span>
            </div>

            <div className="relative z-10">
              <Avatar
                src={second.avatar}
                alt={second.name}
                size={64}
                className="ring-4 ring-gray-300"
              />
              <span
                className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full
                           text-[11px] font-extrabold flex items-center justify-center
                           bg-gradient-to-br from-brandPink to-brandPurple text-white
                           ring-2 ring-white"
              >
                2
              </span>
            </div>
            <div className="text-sm mt-1 font-semibold text-fuchsia-700 text-center max-w-[96px] truncate">
              {second.name}
            </div>
            <div className="text-[11px] text-fuchsia-500">{second.total}p</div>
          </div>
        )}

        {/* 1. — Altın taç + altın ring + zıplayan taç + yıldız patlaması */}
        {first && (
          <div className="flex flex-col items-center relative">
            {/* Zıplayan taç */}
            <div className="absolute -top-8 z-30 pointer-events-none">
              <BouncyCrown size={32} />
            </div>

            {/* Yıldız patlaması: tam 1.'nin üstünde */}
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
              style={{ width: 160, height: 120 }}
            >
              <StarBurst fireKey={fireKey} />
            </div>

            {/* Altın ışıltı */}
            <div className="relative z-10 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">
              <Avatar
                src={first.avatar}
                alt={first.name}
                size={96}
                className="ring-4 ring-yellow-300"
              />
              <span
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full
                           text-[12px] font-extrabold flex items-center justify-center
                           bg-gradient-to-br from-brandPink to-brandPurple text-white
                           ring-2 ring-white"
              >
                1
              </span>
            </div>
            <div className="text-base mt-1 font-extrabold text-fuchsia-900 text-center max-w-[116px] truncate">
              {first.name}
            </div>
            <div className="text-xs text-fuchsia-600">{first.total}p</div>
          </div>
        )}

        {/* 3. — Bronz taç + bronz ring */}
        {third && (
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-6 z-20 pointer-events-none">
              <span
                className="text-2xl select-none"
                style={{
                  filter:
                    "sepia(1) saturate(2.5) hue-rotate(330deg) brightness(0.95) drop-shadow(0 2px 6px rgba(160,90,30,.45))",
                }}
              >
                👑
              </span>
            </div>

            <div className="relative z-10">
              <Avatar
                src={third.avatar}
                alt={third.name}
                size={56}
                className="ring-4 ring-amber-500"
              />
              <span
                className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full
                           text-[11px] font-extrabold flex items-center justify-center
                           bg-gradient-to-br from-brandPink to-brandPurple text-white
                           ring-2 ring-white"
              >
                3
              </span>
            </div>
            <div className="text-sm mt-1 font-semibold text-fuchsia-700 text-center max-w-[90px] truncate">
              {third.name}
            </div>
            <div className="text-[11px] text-fuchsia-500">{third.total}p</div>
          </div>
        )}
      </div>
    </div>
  );
}