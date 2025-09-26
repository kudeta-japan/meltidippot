'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ===== 画像パス（必ず相対で） ===== */
const img = (file: string) => `img/bg/${file}`;

/* ===== types ===== */
type Item = {
  id: string;
  name: string;
  description: string;
  icon: string;   // ← 画像ファイル名のみ
  accent: string;
};
type Result = { id: string; name: string; icon: string };

/* ===== items (6種類) ===== */
const ITEMS: Item[] = [
  { id: 'veg',     name: '野菜盛り合わせ',   description: '色とりどりの野菜を軽くロースト。チーズとの相性ばつぐん。', icon: 'veg.png',      accent: '#5ed67d' },
  { id: 'pork',    name: 'ローストポーク',   description: 'しっとりジューシー、コクのあるチーズと好相性。',           icon: 'pork.png',     accent: '#ff7f7f' },
  { id: 'beef',    name: '牛コロカツ',       description: '食べごたえ満点のひとくちビーフカツ。',                         icon: 'beef.png',     accent: '#f76367' },
  { id: 'chicken', name: 'フライドチキン',   description: 'カリッと衣にチーズが絡んで止まらない！',                        icon: 'chicken.png',  accent: '#ff9e6e' },
  { id: 'baguette',name: 'ガーリックバゲット', description: '香ばしい香りでチーズがさらに主役に。',                       icon: 'baguette.png', accent: '#ffd166' },
  { id: 'shrimp',  name: '海老フリッター',   description: 'プリッと食感に濃厚チーズをダイブ。',                            icon: 'shrimp.png',   accent: '#ff9472' },
];

/* ===== geometry utils ===== */
const SEGMENT_ANGLE = 360 / ITEMS.length;
const toRadians = (deg: number) => (deg * Math.PI) / 180;
const clampAngle = (deg: number) => ((deg % 360) + 360) % 360;
function polarToCartesian(radius: number, angle: number) {
  const rad = toRadians(angle - 90);
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}
function describeArc(start: number, end: number, radius: number) {
  const s = polarToCartesian(radius, start);
  const e = polarToCartesian(radius, end);
  const large = end - start <= 180 ? '0' : '1';
  return `M 0 0 L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${radius} ${radius} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
}

/* ===== 効果音（そのまま） ===== */
function createAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    return new Ctor();
  } catch {
    return null;
  }
}

export default function MeltyDipRoulette() {
  /* === state & refs === */
  // 針の角度（度）。0度＝真上。時計回りに増える。
  const [pointer, setPointer] = useState(0);
  const pointerRef = useRef(0);

  const [mode, setMode] = useState<'idle' | 'spinning' | 'stopping'>('idle');
  const modeRef = useRef<'idle' | 'spinning' | 'stopping'>('idle');

  const velocityRef = useRef(0);         // 角速度（deg/s）
  const stopStartRef = useRef(0);
  const stopTargetRef = useRef(0);
  const stopStartTimeRef = useRef(0);
  const stopDurationRef = useRef(3.1);

  const [spinsLeft, setSpinsLeft] = useState(0);
  const spinsLeftRef = useRef(0);

  const [results, setResults] = useState<Result[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number>();

  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const autostopTimer = useRef<number>(); // 安全停止タイマー

  const ensureAudio = useCallback(() => {
    if (muted) return null;
    if (!audioRef.current) audioRef.current = createAudioContext();
    if (audioRef.current && audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => undefined);
    return audioRef.current;
  }, [muted]);

  const playResultChime = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    gain.connect(ctx.destination);
    [0, 0.12, 0.26].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime([523.25, 659.25, 783.99][i], now + offset);
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g).connect(gain);
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.start(now + offset);
      osc.stop(now + offset + 0.26);
    });
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  }, [ensureAudio]);

  const showToastMessage = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1400);
  }, []);

  /* === computed === */
  const activeIndex = useMemo(() => {
    const a = clampAngle(pointerRef.current);
    return Math.floor((a + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
  }, [pointer]);

  /* === sync refs === */
  useEffect(() => { pointerRef.current = pointer; }, [pointer]);
  useEffect(() => { spinsLeftRef.current = spinsLeft; }, [spinsLeft]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    document.body.classList.add('meltydip-body');
    return () => { document.body.classList.remove('meltydip-body'); };
  }, []);

  /* === controls === */
  const startSpin = () => {
    if (modeRef.current !== 'idle') return;

    // 残回数が0でも必ず1回は回せる
    if (spinsLeftRef.current <= 0) {
      setSpinsLeft(1);
      spinsLeftRef.current = 1;
      showToastMessage('お試しスピン 1回');
    }

    velocityRef.current = 20; // 初速
    modeRef.current = 'spinning';
    setMode('spinning');

    // 3秒経っても止めない場合は自動停止
    if (autostopTimer.current) window.clearTimeout(autostopTimer.current);
    autostopTimer.current = window.setTimeout(() => {
      if (modeRef.current === 'spinning') stopSpin();
    }, 3000);
  };

  const stopSpin = () => {
    if (modeRef.current !== 'spinning') return;
    const current = clampAngle(pointerRef.current);
    const idx = Math.floor((current + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
    const centerAngle = idx * SEGMENT_ANGLE;

    // 目標は「現在のエリアの中心 ± 少しのジッター」＋周回
    const jitterRange = SEGMENT_ANGLE / 2 - 6;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const targetAngle = clampAngle(centerAngle + jitter);

    let delta = targetAngle - current;
    if (delta <= 0) delta += 360;
    const laps = 4 + Math.floor(Math.random() * 3);

    stopStartRef.current = current;
    stopTargetRef.current = current + laps * 360 + delta;
    stopStartTimeRef.current = performance.now();
    stopDurationRef.current = 2.8 + Math.random() * 0.6;

    modeRef.current = 'stopping';
    setMode('stopping');

    if (autostopTimer.current) window.clearTimeout(autostopTimer.current);
  };

  const finishStop = useCallback(() => {
    modeRef.current = 'idle';
    setMode('idle');

    const finalAngle = clampAngle(stopTargetRef.current);
    const finalIdx = Math.floor((finalAngle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
    const item = ITEMS[finalIdx];

    playResultChime();
    showToastMessage(`${item.name}！`);
    setResults((prev) => [...prev, { id: item.id, name: item.name, icon: item.icon }]);

    const next = Math.max(0, spinsLeftRef.current - 1);
    spinsLeftRef.current = next;
    setSpinsLeft(next);
  }, [playResultChime, showToastMessage]);

  /* === RAF loop（針が回る） === */
  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (modeRef.current === 'spinning') {
        // 加速して上限へ
        velocityRef.current = Math.min(600, velocityRef.current + 900 * dt); // deg/s
        const next = pointerRef.current + velocityRef.current * dt;
        setPointer(next);
        pointerRef.current = next;
      } else if (modeRef.current === 'stopping') {
        const elapsed = (now - stopStartTimeRef.current) / 1000;
        const t = Math.min(1, elapsed / stopDurationRef.current);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const value = stopStartRef.current + (stopTargetRef.current - stopStartRef.current) * eased;
        setPointer(value);
        pointerRef.current = value;
        if (t >= 0.9999) finishStop(); // 確実にfinish
      }

      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [finishStop]);

  /* === unmount cleanup === */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (autostopTimer.current) window.clearTimeout(autostopTimer.current);
    };
  }, []);

  /* === UI helpers === */
  const ledBulbs = useMemo(() => {
    const total = 48;
    return Array.from({ length: total }, (_, i) => ({ index: i, angle: i * (360 / total) }));
  }, []);

  /* ===== render ===== */
  return (
    <main className="meltydip-app">
      <div className="backdrop">
        {/* 背景写真（相対パス！） */}
        <div className="bg-photo" style={{ backgroundImage: `url(${img('top.png')})` }} aria-hidden />
        <div className="blur" />
        <div className="hero-copy">
          <span className="eyebrow">Cheese Wonderland Special</span>
          <h1>Melty Dip Pot Roulette</h1>
          <p>とろけるチーズに合わせるトッピングをルーレットで決定。フェス仕様のステージで気分も最高潮！</p>
        </div>
      </div>

      <section className="stage">
        <div className="wheel-area">
          <div className={`wheel-wrapper ${mode}`}>
            <div className="led-ring">
              {ledBulbs.map((b) => (
                <span
                  key={b.index}
                  className={`led ${mode !== 'idle' ? 'spin' : ''}`}
                  style={{ transform: `rotate(${b.angle}deg) translate(var(--led-radius))`, animationDelay: `${b.index * -0.05}s` }}
                />
              ))}
            </div>

            {/* ルーレット盤は固定、針だけ回る */}
            <div className="wheel">
              <svg viewBox="-110 -110 220 220">
                <defs>
                  {ITEMS.map((item) => (
                    <linearGradient key={item.id} id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={item.accent} />
                      <stop offset="100%" stopColor="#1c1f3a" />
                    </linearGradient>
                  ))}
                </defs>
                {ITEMS.map((item, index) => {
                  const start = index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
                  const end = start + SEGMENT_ANGLE;
                  return (
                    <path
                      key={item.id}
                      d={describeArc(start, end, 104)}
                      fill={`url(#grad-${item.id})`}
                      stroke="#0a0b16"
                      strokeWidth="0.9"
                      className="segment"
                    />
                  );
                })}
              </svg>

              {/* ラベル */}
              <div className="labels">
                {ITEMS.map((item, index) => (
                  <div key={item.id} className="label" style={{ transform: `rotate(${index * SEGMENT_ANGLE}deg)` }}>
                    <div className="label-inner" style={{ transform: `rotate(${-index * SEGMENT_ANGLE}deg)` }}>
                      <img className="emoji-icon" src={img(item.icon)} alt={item.name} draggable={false} />
                      <span className="name">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 針（これが回る） */}
              <div className="pointer" style={{ transform: `rotate(${pointer}deg)` }}>
                <div className="pointer-inner" />
              </div>
            </div>
          </div>

          <div className="controls under-wheel">
            <button onClick={startSpin} disabled={mode !== 'idle'}>回す 🎡</button>
            <button onClick={stopSpin} disabled={mode !== 'spinning'}>止める ⏹</button>
            <div className="status">
              <span className="label">残り</span><strong>{spinsLeft > 0 ? spinsLeft : '--'} 回</strong>
              <span className="now">いま：{ITEMS[activeIndex]?.name ?? '—'}</span>
            </div>
          </div>
        </div>

        <aside className="side-panel">
          <div className="panel-card">
            <h2>トッピング一覧</h2>
            <ul className="item-list">
              {ITEMS.map((it) => (
                <li key={it.id}>
                  <span className="dot" style={{ background: it.accent }} />
                  <img className="inline-icon" src={img(it.icon)} alt="" />
                  <div><strong>{it.name}</strong><p>{it.description}</p></div>
                </li>
              ))}
            </ul>
          </div>

          {results.length > 0 && (
            <div className="panel-card">
              <h2>ヒット履歴</h2>
              <ul className="history">
                {results.slice().reverse().map((r, i) => (
                  <li key={`${r.id}-${i}`}>
                    <img className="history-icon" src={img(r.icon)} alt="" />{r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {toast && <div className="toast">{toast}</div>}

      {/* スタイル */}
      <style jsx global>{`
        body.meltydip-body {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,163,102,.16), transparent 50%),
            radial-gradient(circle at 80% 0%, rgba(255,230,140,.18), transparent 55%),
            linear-gradient(180deg, #070713, #0c0c1f);
        }
      `}</style>

      <style jsx>{`
        .meltydip-app{position:relative;min-height:100vh;overflow:hidden;color:#eef2ff}
        .backdrop{position:absolute;inset:0;pointer-events:none}
        .bg-photo{position:absolute;inset:0;background:center/cover no-repeat url(${img('top.png')});filter:brightness(.55)}
        .backdrop .blur{position:absolute;inset:-40px;background:
          radial-gradient(circle at 30% 20%, rgba(255,180,120,.22), transparent 50%),
          radial-gradient(circle at 90% 15%, rgba(255,90,130,.18), transparent 55%),
          radial-gradient(circle at 40% 80%, rgba(110,190,255,.16), transparent 60%);
          filter:blur(120px);opacity:.65}
        .hero-copy{position:absolute;top:clamp(48px,8vw,80px);left:clamp(40px,6vw,120px);max-width:min(420px,40vw)}
        .hero-copy .eyebrow{display:inline-flex;gap:.4rem;padding:.4rem .8rem;border-radius:999px;background:rgba(255,209,102,.16);color:#ffdd83;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem}
        .hero-copy h1{margin:.8rem 0 .4rem;font-size:clamp(32px,4vw,58px);letter-spacing:-.01em}
        .hero-copy p{margin:0;line-height:1.7;color:rgba(230,235,255,.85);font-size:.98rem}

        .stage{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,420px);gap:32px;padding:clamp(120px,16vw,160px) clamp(32px,6vw,60px) 60px}
        .wheel-area{display:grid;place-items:center}
        .wheel-wrapper{position:relative;width:min(620px,72vw);aspect-ratio:1/1;display:grid;place-items:center;--led-radius:calc(50% - clamp(20px,3vw,36px))}
        .led-ring{position:absolute;inset:0;display:grid;place-items:center}
        .led{position:absolute;width:clamp(10px,1.2vw,16px);aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle, rgba(255,230,160,.9), rgba(255,150,60,.3));box-shadow:0 0 12px rgba(255,180,80,.4);opacity:.65;transition:.2s}
        .led.spin{animation:ledPulse 1.4s linear infinite}

        .wheel{position:relative;width:100%;height:100%;border-radius:50%;backdrop-filter:blur(8px);background:rgba(14,18,40,.4);border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 80px rgba(0,0,0,.55)}
        .wheel svg{position:absolute;inset:clamp(26px,4vw,38px);width:calc(100% - clamp(52px,8vw,76px));height:calc(100% - clamp(52px,8vw,76px))}
        .segment{transition:filter .3s ease, opacity .3s ease}
        .labels{position:absolute;inset:clamp(26px,4vw,38px);display:grid;place-items:center;pointer-events:none}
        .label{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center}
        .label-inner{display:grid;place-items:center;transform-origin:center;translate:0 clamp(-44%,-16vw,-48%);text-align:center;gap:.3rem}
        .emoji-icon{width:clamp(28px,4vw,44px);height:auto;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
        .label .name{font-size:clamp(.68rem,1.6vw,.85rem);letter-spacing:.02em;background:rgba(10,12,24,.68);padding:.3rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.16)}

        /* 針 */
        .pointer{position:absolute;top:-18px;left:50%;transform-origin:50% calc(18px); /* 上端を原点に */ width:0;height:0}
        .pointer-inner{width:clamp(12px,1.6vw,18px);height:clamp(80px,14vw,120px);background:linear-gradient(180deg,#ffce6a,#ff6f91);clip-path:polygon(50% 0%,90% 52%,50% 100%,10% 52%);box-shadow:0 12px 40px rgba(255,110,130,.45);transform:translateX(-50%)}

        .controls.under-wheel{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;margin-top:14px}
        .controls.under-wheel button{appearance:none;border:none;border-radius:14px;padding:12px 14px;font-size:.95rem;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8b6e);color:#1d1d22;box-shadow:0 14px 36px rgba(0,0,0,.35);transition:.15s}
        .controls.under-wheel button:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;transform:none}
        .status{display:flex;gap:10px;align-items:center;justify-content:flex-end}
        .status .label{opacity:.75}

        .side-panel{display:flex;flex-direction:column;gap:18px}
        .panel-card{background:rgba(10,12,28,.72);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:20px;box-shadow:0 20px 46px rgba(0,0,0,.35);backdrop-filter:blur(14px)}
        .panel-card h2{margin:0 0 12px;font-size:1.1rem;letter-spacing:.04em;text-transform:uppercase}
        .item-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
        .item-list li{display:grid;grid-template-columns:12px 40px 1fr;gap:12px;align-items:center}
        .item-list .dot{width:12px;height:12px;border-radius:50%;box-shadow:0 0 12px rgba(255,200,120,.5)}
        .inline-icon{width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
        .item-list strong{display:block;font-size:.95rem}
        .item-list p{margin:.2rem 0 0;font-size:.85rem;opacity:.76}
        .history{margin:0;padding:0;list-style:none;display:grid;gap:6px;font-size:.9rem;max-height:180px;overflow-y:auto}
        .history li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}
        .history-icon{width:16px;height:16px;object-fit:contain;margin-right:6px}

        .toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(15,18,40,.92);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:12px 24px;font-weight:700;letter-spacing:.04em;z-index:50;box-shadow:0 16px 40px rgba(0,0,0,.5)}

        @keyframes ledPulse{0%,100%{opacity:.45;box-shadow:0 0 12px rgba(255,180,80,.35)}50%{opacity:.95;box-shadow:0 0 20px rgba(255,200,140,.85)}}
        @media (max-width:1100px){.stage{grid-template-columns:1fr;padding:clamp(120px,16vw,160px) clamp(20px,4vw,36px) 60px}}
        @media (max-width:720px){.hero-copy{left:20px;right:20px;max-width:none}.wheel-wrapper{width:min(86vw,420px)}.controls.under-wheel{grid-template-columns:repeat(2,minmax(0,1fr))}.panel-card{padding:16px}.item-list li{grid-template-columns:12px 40px 1fr}}
      `}</style>
    </main>
  );
}
