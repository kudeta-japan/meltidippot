'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ===== types ===== */
type FaceExpression = 'smile' | 'cheer' | 'surprised' | 'wink' | 'tongue' | 'havefun';
type Item = { id: string; name: string; description: string; emoji: string; accent: string; face: FaceExpression };
type Result = { id: string; name: string; emoji: string };

/* ===== items (6種類) ===== */
const ITEMS: Item[] = [
  { id: 'veg',    name: '野菜盛り合わせ',   description: '色とりどりの野菜を軽くロースト。チーズとの相性ばつぐん。', emoji: '🥦', accent: '#5ed67d', face: 'cheer' },
  { id: 'pork',   name: 'ローストポーク',   description: 'しっとりジューシー、コクのあるチーズと好相性。',           emoji: '🍖', accent: '#ff7f7f', face: 'smile' },
  { id: 'beef',   name: '牛コロカツ',       description: '食べごたえ満点のひとくちビーフカツ。',                         emoji: '🥩', accent: '#f76367', face: 'smile' },
  { id: 'chick',  name: 'フライドチキン',   description: 'カリッと衣にチーズが絡んで止まらない！',                        emoji: '🍗', accent: '#ff9e6e', face: 'wink' },
  { id: 'bagu',   name: 'ガーリックバゲット', description: '香ばしい香りでチーズがさらに主役に。',                       emoji: '🥖', accent: '#ffd166', face: 'tongue' },
  { id: 'shrimp', name: '海老フリッター',   description: 'プリッと食感に濃厚チーズをダイブ。',                            emoji: '🍤', accent: '#ff9472', face: 'havefun' },
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

/* ===== 顔アイコン（そのまま） ===== */
const FaceArt = ({ expression }: { expression: FaceExpression }) => {
  const mouth: Record<FaceExpression, string> = {
    smile: 'M110 180 C160 220 220 220 270 180',
    cheer: 'M112 188 C180 250 220 250 268 188',
    surprised: 'M190 182 C170 182 155 198 155 218 C155 242 172 262 196 262 C220 262 236 244 236 218 C236 198 222 182 200 182 Z',
    wink: 'M115 198 C155 234 235 234 275 198',
    tongue: 'M120 188 C170 232 230 232 280 188 L276 220 C248 260 208 272 180 240 Z',
    havefun: 'M115 188 C160 238 240 238 285 188',
  };
  const brow: Record<FaceExpression, { left: string; right: string }> = {
    smile: { left: 'rotate(-6 140 120)', right: 'rotate(6 240 120)' },
    cheer: { left: 'rotate(-12 140 110)', right: 'rotate(12 240 110)' },
    surprised: { left: 'translate(-4 -4)', right: 'translate(4 -4)' },
    wink: { left: 'rotate(-12 140 110)', right: 'scale(1 .35) translate(0 140)' },
    tongue: { left: 'rotate(-10 140 120)', right: 'rotate(10 240 120)' },
    havefun: { left: 'rotate(-16 140 110)', right: 'rotate(16 240 110)' },
  }[expression];
  const highlight = expression === 'havefun' ? '#fff4c1' : '#ffe7d1';
  return (
    <svg viewBox="0 0 360 360" className="face-art" role="img" aria-hidden>
      <defs>
        <radialGradient id={`faceGradient-${expression}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff1c6" />
          <stop offset="100%" stopColor="#f3c669" />
        </radialGradient>
      </defs>
      <circle cx="180" cy="180" r="170" fill={`url(#faceGradient-${expression})`} stroke="#b88429" strokeWidth="8" />
      <ellipse cx="120" cy="150" rx="28" ry="36" fill="#fff" />
      <ellipse cx="240" cy="150" rx="28" ry="36" fill="#fff" />
      <circle cx="120" cy="152" r="12" fill="#3d2a18" />
      <path d={mouth} stroke="#3d2a18" strokeWidth="10" strokeLinecap="round" fill={expression === 'surprised' ? '#ff7770' : 'none'} />
      <path d="M130 112 Q140 96 170 108" stroke="#3d2a18" strokeWidth="10" strokeLinecap="round" fill="none" transform={brow.left} />
      <path d="M210 108 Q240 96 250 114" stroke="#3d2a18" strokeWidth="10" strokeLinecap="round" fill="none" transform={brow.right} />
      <rect x="165" y="180" width="30" height="46" rx="14" fill="#ff4757" stroke="#862133" strokeWidth="4" />
      <circle cx="180" cy="212" r="58" fill="#ff6542" stroke="#9f2c26" strokeWidth="8" />
      <path d="M160 236 Q180 244 200 236" stroke="#ffd5d0" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M64 200 Q84 240 120 256" stroke="#b88429" strokeWidth="20" strokeLinecap="round" fill="none" />
      <path d="M296 200 Q276 240 240 256" stroke="#b88429" strokeWidth="20" strokeLinecap="round" fill="none" />
      <circle cx="120" cy="150" r="48" fill="none" stroke={highlight} strokeWidth="4" opacity="0.3" />
      <circle cx="240" cy="150" r="48" fill="none" stroke={highlight} strokeWidth="4" opacity="0.3" />
    </svg>
  );
};

/* ===== Congrats card ===== */
const CongratsCard = () => (
  <div className="congrats-card">
    <div className="spark" />
    <div className="spark big" />
    <div className="badge">CONGRATS!</div>
    <p>メルティディップポットのミッション達成！</p>
  </div>
);

/* ===== audio helpers ===== */
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
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const [mode, setMode] = useState<'idle' | 'spinning' | 'stopping'>('idle');
  const modeRef = useRef<'idle' | 'spinning' | 'stopping'>('idle');
  const velocityRef = useRef(0);
  const stopStartRef = useRef(0);
  const stopTargetRef = useRef(0);
  const stopStartTimeRef = useRef(0);
  const stopDurationRef = useRef(3.1);
  const [spinsLeft, setSpinsLeft] = useState(0);
  const spinsLeftRef = useRef(0);
  const [results, setResults] = useState<Result[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number>();
  const [face, setFace] = useState<FaceExpression | null>(null);
  const faceTimerRef = useRef<number>();
  const [showStart, setShowStart] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const highlightTimerRef = useRef<number>();
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

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
    const normalized = clampAngle(rotation);
    const pointerAngle = clampAngle(360 - normalized);
    return Math.floor((pointerAngle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
  }, [rotation]);

  /* === sync refs === */
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { spinsLeftRef.current = spinsLeft; }, [spinsLeft]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    document.body.classList.add('meltydip-body');
    return () => { document.body.classList.remove('meltydip-body'); };
  }, []);

  /* === helpers for index/angle === */
  const getPointerAngle = useCallback((value: number) => clampAngle(360 - clampAngle(value)), []);
  const indexFromRotation = useCallback((value: number) => {
    const pointerAngle = getPointerAngle(value);
    return Math.floor((pointerAngle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
  }, [getPointerAngle]);

  /* === controls === */
  const startSpin = () => {
    if (modeRef.current !== 'idle' || spinsLeftRef.current <= 0) return;
    velocityRef.current = 0.1;
    modeRef.current = 'spinning';
    setMode('spinning');
  };

  const stopSpin = () => {
    if (modeRef.current !== 'spinning') return;
    const current = rotationRef.current;
    const idx = indexFromRotation(current);
    const centerAngle = idx * SEGMENT_ANGLE;
    const jitterRange = SEGMENT_ANGLE / 2 - 6;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const targetPointer = clampAngle(centerAngle + jitter);

    const normalizedCurrent = clampAngle(current);
    const normalizedTarget = clampAngle(360 - targetPointer);
    let delta = normalizedTarget - normalizedCurrent;
    if (delta <= 0) delta += 360;

    const laps = 4 + Math.floor(Math.random() * 3);
    stopStartRef.current = current;
    stopTargetRef.current = current + laps * 360 + delta;
    stopStartTimeRef.current = performance.now();
    stopDurationRef.current = 2.8 + Math.random() * 0.6;
    modeRef.current = 'stopping';
    setMode('stopping');
  };

  /* === finishStop（※useEffectより前に定義してビルドエラーを回避） === */
  const finishStop = useCallback(() => {
    modeRef.current = 'idle';
    setMode('idle');

    const finalIdx = indexFromRotation(stopTargetRef.current);
    const item = ITEMS[finalIdx];

    setHighlightIdx(finalIdx);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightIdx(null), 1600);

    playResultChime();
    showToastMessage(`${item.emoji} ${item.name}！`);
    setFace(item.face);
    if (faceTimerRef.current) window.clearTimeout(faceTimerRef.current);
    faceTimerRef.current = window.setTimeout(() => setFace(null), 1600);

    setResults((prev) => [...prev, { id: item.id, name: item.name, emoji: item.emoji }]);

    const next = Math.max(0, spinsLeftRef.current - 1);
    spinsLeftRef.current = next;
    setSpinsLeft(next);

    if (next === 0) {
      setShowCongrats(true);
      window.setTimeout(() => {
        setShowCongrats(false);
        setShowSummary(true);
      }, 2000);
    }
  }, [indexFromRotation, playResultChime, showToastMessage]);

  /* === RAF loop === */
  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (modeRef.current === 'spinning') {
        velocityRef.current = Math.min(18, velocityRef.current + 24 * dt);
        const next = rotationRef.current + velocityRef.current * dt;
        setRotation(next);
        rotationRef.current = next;
      } else if (modeRef.current === 'stopping') {
        const elapsed = (now - stopStartTimeRef.current) / 1000;
        const t = Math.min(1, elapsed / stopDurationRef.current);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = stopStartRef.current + (stopTargetRef.current - stopStartRef.current) * eased;
        setRotation(value);
        rotationRef.current = value;
        if (t >= 1) finishStop();
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
      if (faceTimerRef.current) window.clearTimeout(faceTimerRef.current);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  /* === game flow === */
  const choosePlayers = (count: number) => {
    const total = count * 2;
    setSpinsLeft(total);
    spinsLeftRef.current = total;
    setResults([]);
    setShowStart(false);
    showToastMessage(`人数 ${count}人 / 合計 ${total}回`);
  };

  const resetGame = () => {
    modeRef.current = 'idle';
    setMode('idle');
    setRotation(0);
    rotationRef.current = 0;
    velocityRef.current = 0;
    setSpinsLeft(0);
    spinsLeftRef.current = 0;
    setResults([]);
    setFace(null);
    setShowStart(true);
    setShowSummary(false);
    setShowCongrats(false);
    setHighlightIdx(null);
  };

  const again = () => {
    setShowSummary(false);
    setShowStart(true);
    setRotation(0);
    rotationRef.current = 0;
    setResults([]);
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
    showToastMessage(muted ? 'サウンドON' : 'ミュート');
  };

  const resultSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; emoji: string }>();
    results.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, { name: r.name, count: 0, emoji: r.emoji });
      map.get(r.id)!.count += 1;
    });
    return Array.from(map.values());
  }, [results]);

  const ledBulbs = useMemo(() => {
    const total = 48;
    return Array.from({ length: total }, (_, i) => ({ index: i, angle: i * (360 / total) }));
  }, []);

  const isSegmentHighlighted = useCallback((angle: number) => {
    if (highlightIdx == null) return false;
    const start = clampAngle(highlightIdx * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    const end = clampAngle(start + SEGMENT_ANGLE);
    return start < end ? angle >= start && angle <= end : angle >= start || angle <= end;
  }, [highlightIdx]);

  /* ===== render ===== */
  return (
    <main className="meltydip-app">
      <div className="backdrop">
        <div className="blur" />
        <div className="hero-copy">
          <span className="eyebrow">Cheese Wonderland Special</span>
          <h1>Melty Dip Pot Roulette</h1>
          <p>とろけるチーズに合わせるトッピングをルーレットで決定。フェス仕様のステージで気分も最高潮！</p>
        </div>
        <div className="hero-face"><FaceArt expression="havefun" /></div>
      </div>

      <section className="stage">
        <div className="wheel-area">
          <div className={`wheel-wrapper ${mode}`}>
            <div className="led-ring">
              {ledBulbs.map((b) => (
                <span
                  key={b.index}
                  className={`led ${mode !== 'idle' ? 'spin' : ''} ${isSegmentHighlighted(b.angle) ? 'highlight' : ''}`}
                  style={{ transform: `rotate(${b.angle}deg) translate(var(--led-radius))`, animationDelay: `${b.index * -0.05}s` }}
                />
              ))}
            </div>

            <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
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
                    <path key={item.id} d={describeArc(start, end, 104)} fill={`url(#grad-${item.id})`} stroke="#0a0b16" strokeWidth="0.9"
                      className={highlightIdx === index ? 'segment highlight' : 'segment'} />
                  );
                })}
              </svg>

              <div className="labels">
                {ITEMS.map((item, index) => (
                  <div key={item.id} className="label" style={{ transform: `rotate(${index * SEGMENT_ANGLE}deg)` }}>
                    <div className="label-inner" style={{ transform: `rotate(${-index * SEGMENT_ANGLE}deg)` }}>
                      <span className="emoji" aria-hidden>{item.emoji}</span>
                      <span className="name">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hub"><span className="hub-title">Melty Dip Pot</span><span className="hub-sub">Roulette</span></div>
            </div>

            <div className="pointer"><div className="pointer-inner" /></div>
          </div>
        </div>

        <aside className="side-panel">
          <div className="panel-card">
            <h2>プレイ状況</h2>
            <div className="status-grid">
              <div className="status"><span className="label">残り回数</span><strong>{spinsLeftRef.current > 0 ? spinsLeftRef.current : '--'} 回</strong></div>
              <div className="status"><span className="label">現在の候補</span><strong>{ITEMS[activeIndex]?.emoji} {ITEMS[activeIndex]?.name}</strong></div>
            </div>
            <div className="controls">
              <button onClick={startSpin} disabled={mode !== 'idle' || spinsLeftRef.current <= 0}>回す 🎡</button>
              <button onClick={stopSpin} disabled={mode !== 'spinning'}>止める ⏹</button>
              <button className="ghost" onClick={toggleMute}>{muted ? '🔇' : '🔈'}</button>
              <button className="ghost" onClick={resetGame}>リセット 🔄</button>
            </div>
          </div>

          <div className="panel-card">
            <h2>トッピング一覧</h2>
            <ul className="item-list">
              {ITEMS.map((it) => (
                <li key={it.id}>
                  <span className="dot" style={{ background: it.accent }} />
                  <div><strong>{it.emoji} {it.name}</strong><p>{it.description}</p></div>
                </li>
              ))}
            </ul>
          </div>

          {results.length > 0 && (
            <div className="panel-card">
              <h2>ヒット履歴</h2>
              <ul className="history">
                {results.slice().reverse().map((r, i) => (<li key={`${r.id}-${i}`}><span>{r.emoji}</span>{r.name}</li>))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {toast && <div className="toast">{toast}</div>}

      {showStart && (
        <div className="overlay start">
          <div className="card">
            <h2>人数を選択</h2>
            <p>1人2回プレイできます。チーム人数を選んでスタート！</p>
            <div className="player-grid">{[1, 2, 3, 4, 5, 6].map((n) => <button key={n} onClick={() => choosePlayers(n)}>{n}</button>)}</div>
          </div>
        </div>
      )}

      {face && (<div className="overlay face"><div className="face-wrap"><FaceArt expression={face} /></div></div>)}
      {showCongrats && (<div className="overlay congrats"><CongratsCard /></div>)}

      {showSummary && (
        <div className="overlay summary">
          <div className="card">
            <h2>結果まとめ</h2>
            <table><thead><tr><th>メニュー</th><th>回数</th></tr></thead>
              <tbody>
                {(() => {
                  const map = new Map<string, { name: string; count: number; emoji: string }>();
                  results.forEach((r) => { if (!map.has(r.id)) map.set(r.id, { name: r.name, count: 0, emoji: r.emoji }); map.get(r.id)!.count += 1; });
                  const rows = Array.from(map.values());
                  return rows.length ? rows.map((e) => <tr key={e.name}><td>{e.emoji} {e.name}</td><td>{e.count}</td></tr>) : <tr><td colSpan={2}>該当なし</td></tr>;
                })()}
              </tbody>
            </table>
            <div className="summary-actions">
              <button onClick={again}>もう一度</button>
              <button className="ghost" onClick={() => setShowSummary(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 画面内スタイル */}
      <style jsx global>{`
        body.meltydip-body {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,163,102,.16), transparent 50%),
            radial-gradient(circle at 80% 0%, rgba(255,230,140,.18), transparent 55%),
            linear-gradient(180deg, #070713, #0c0c1f);
        }
      `}</style>
      <style jsx>{`
        /* ここから下はPDF版と同等（縮約なし）— 長いのでそのまま貼ってOK */
        .meltydip-app{position:relative;min-height:100vh;color:#eef2ff;overflow:hidden}
        .backdrop{position:absolute;inset:0;pointer-events:none}
        .backdrop .blur{position:absolute;inset:-40px;background:
          radial-gradient(circle at 30% 20%, rgba(255,180,120,.22), transparent 50%),
          radial-gradient(circle at 90% 15%, rgba(255,90,130,.18), transparent 55%),
          radial-gradient(circle at 40% 80%, rgba(110,190,255,.16), transparent 60%);
          filter:blur(120px);opacity:.75}
        .hero-copy{position:absolute;top:clamp(48px,8vw,80px);left:clamp(40px,6vw,120px);max-width:min(420px,40vw)}
        .hero-copy .eyebrow{display:inline-flex;gap:.4rem;padding:.4rem .8rem;border-radius:999px;background:rgba(255,209,102,.16);color:#ffdd83;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem}
        .hero-copy h1{margin:.8rem 0 .4rem;font-size:clamp(32px,4vw,58px);letter-spacing:-.01em}
        .hero-copy p{margin:0;line-height:1.7;color:rgba(230,235,255,.8);font-size:.98rem}
        .hero-face{position:absolute;top:clamp(60px,16vw,160px);right:clamp(40px,8vw,140px);width:min(320px,32vw);opacity:.78}
        .hero-face :global(.face-art){width:100%;height:auto}
        .stage{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,420px);gap:32px;padding:clamp(120px,16vw,160px) clamp(32px,6vw,60px) 60px}
        .wheel-area{display:grid;place-items:center}
        .wheel-wrapper{position:relative;width:min(620px,72vw);aspect-ratio:1/1;display:grid;place-items:center;--led-radius:calc(50% - clamp(20px,3vw,36px))}
        .led-ring{position:absolute;inset:0;display:grid;place-items:center}
        .led{position:absolute;width:clamp(10px,1.2vw,16px);aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle, rgba(255,230,160,.9), rgba(255,150,60,.3));box-shadow:0 0 12px rgba(255,180,80,.4);opacity:.65;transition:.2s}
        .led.spin{animation:ledPulse 1.4s linear infinite}
        .led.highlight{opacity:1;box-shadow:0 0 18px rgba(255,230,180,.85),0 0 40px rgba(255,160,60,.45)}
        .wheel{position:relative;width:100%;height:100%;border-radius:50%;backdrop-filter:blur(8px);background:rgba(14,18,40,.4);border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 80px rgba(0,0,0,.55);transition:transform .18s ease-out}
        .wheel svg{position:absolute;inset:clamp(26px,4vw,38px);width:calc(100% - clamp(52px,8vw,76px));height:calc(100% - clamp(52px,8vw,76px))}
        .segment{transition:filter .3s ease, opacity .3s ease}
        .segment.highlight{filter:brightness(1.25) saturate(1.2)}
        .labels{position:absolute;inset:clamp(26px,4vw,38px);display:grid;place-items:center;pointer-events:none}
        .label{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center}
        .label-inner{display:grid;place-items:center;transform-origin:center;translate:0 clamp(-44%,-16vw,-48%);text-align:center;gap:.3rem}
        .label .emoji{font-size:clamp(22px,3vw,36px)}
        .label .name{font-size:clamp(.68rem,1.6vw,.85rem);letter-spacing:.02em;background:rgba(10,12,24,.68);padding:.3rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.16)}
        .hub{position:absolute;inset:clamp(130px,22vw,180px);border-radius:50%;background:radial-gradient(circle at 50% 30%, rgba(255,209,120,.26), rgba(255,120,90,.1));border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;text-align:center;gap:.2rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,244,220,.9)}
        .hub-title{font-size:clamp(.72rem,2vw,1.2rem)} .hub-sub{font-size:clamp(.6rem,1.8vw,.9rem)}
        .pointer{position:absolute;top:-18px;left:50%;transform:translateX(-50%);width:clamp(28px,4vw,40px);height:clamp(80px,14vw,120px);display:flex;justify-content:center}
        .pointer-inner{width:clamp(12px,1.6vw,18px);height:100%;background:linear-gradient(180deg,#ffce6a,#ff6f91);clip-path:polygon(50% 0%,90% 52%,50% 100%,10% 52%);box-shadow:0 12px 40px rgba(255,110,130,.45)}
        .side-panel{display:flex;flex-direction:column;gap:18px}
        .panel-card{background:rgba(10,12,28,.72);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:20px;box-shadow:0 20px 46px rgba(0,0,0,.35);backdrop-filter:blur(14px)}
        .panel-card h2{margin:0 0 12px;font-size:1.1rem;letter-spacing:.04em;text-transform:uppercase}
        .status-grid{display:grid;gap:12px}
        .status{background:rgba(255,255,255,.04);border-radius:14px;padding:14px 16px;border:1px solid rgba(255,255,255,.08)}
        .status .label{display:block;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
        .status strong{font-size:1.2rem}
        .controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}
        .controls button{appearance:none;border:none;border-radius:14px;padding:12px 14px;font-size:.95rem;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8b6e);color:#1d1d22;box-shadow:0 14px 36px rgba(0,0,0,.35);transition:.15s}
        .controls button:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;transform:none}
        .controls button:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 22px 48px rgba(255,110,130,.32)}
        .controls .ghost{background:rgba(24,28,48,.85);color:rgba(240,244,255,.9);border:1px solid rgba(255,255,255,.14);box-shadow:none}
        .item-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
        .item-list li{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start}
        .item-list .dot{width:12px;height:12px;border-radius:50%;margin-top:6px;box-shadow:0 0 12px rgba(255,200,120,.5)}
        .item-list strong{display:block;font-size:.95rem}
        .item-list p{margin:.2rem 0 0;font-size:.85rem;opacity:.76}
        .history{margin:0;padding:0;list-style:none;display:grid;gap:6px;font-size:.9rem;max-height:180px;overflow-y:auto}
        .history li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}
        .toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(15,18,40,.92);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:12px 24px;font-weight:700;letter-spacing:.04em;z-index:20;box-shadow:0 16px 40px rgba(0,0,0,.5)}
        .overlay{position:fixed;inset:0;display:grid;place-items:center;z-index:40;background:rgba(4,6,14,.72);backdrop-filter:blur(12px)}
        .overlay.start .card,.overlay.summary .card{background:rgba(14,18,38,.9);border-radius:20px;border:1px solid rgba(255,255,255,.12);padding:clamp(28px,6vw,40px);width:min(90vw,520px);box-shadow:0 30px 80px rgba(0,0,0,.55)}
        .player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .player-grid button{font-size:1.4rem;font-weight:800;padding:18px 0;border-radius:16px;border:none;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8a65);color:#1d1d22;box-shadow:0 18px 42px rgba(0,0,0,.4);transition:.18s}
        .player-grid button:hover{transform:translateY(-3px);box-shadow:0 24px 50px rgba(255,120,100,.38)}
        .overlay.face{background:radial-gradient(circle at 50% 40%, rgba(255,255,255,.08), transparent 70%)}
        .face-wrap{width:min(60vw,520px);animation:popIn .45s ease}
        .overlay.congrats{background:rgba(4,6,14,.82)}
        .congrats-card{position:relative;background:radial-gradient(circle at 50% 30%, rgba(255,209,120,.18), rgba(10,12,24,.94));border-radius:24px;padding:48px 60px;border:1px solid rgba(255,255,255,.16);text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.55)}
        .congrats-card .badge{display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.4rem;border-radius:999px;background:linear-gradient(135deg,#ffd86b,#ff8b6e);color:#1d1d24;font-weight:800;letter-spacing:.08em;margin-bottom:16px}
        .congrats-card p{margin:0;color:rgba(235,238,255,.85);font-size:1rem}
        .congrats-card .spark{position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 180deg, rgba(255,255,255,.12), transparent 30%, rgba(255,255,255,.12) 60%, transparent 90%);mix-blend-mode:screen;animation:rotate 8s linear infinite;opacity:.45}
        .congrats-card .spark.big{animation-duration:12s;opacity:.25}
        .overlay.summary table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.95rem;background:rgba(255,255,255,.04);border-radius:14px;overflow:hidden}
        .overlay.summary th,.overlay.summary td{text-align:left;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
        .overlay.summary th:last-child,.overlay.summary td:last-child{text-align:right}
        .overlay.summary tr:last-child td{border-bottom:none}
        .summary-actions{margin-top:18px;display:flex;gap:10px}
        .summary-actions button{padding:12px 18px;border-radius:14px;border:none;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8a65);color:#1d1d24;box-shadow:0 14px 36px rgba(0,0,0,.35)}
        .summary-actions .ghost{background:rgba(20,24,42,.86);color:rgba(240,244,255,.9);border:1px solid rgba(255,255,255,.14);box-shadow:none}
        @keyframes ledPulse{0%,100%{opacity:.45;box-shadow:0 0 12px rgba(255,180,80,.35)}50%{opacity:.95;box-shadow:0 0 20px rgba(255,200,140,.85)}}
        @keyframes popIn{0%{transform:scale(.86);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes rotate{to{transform:rotate(360deg)}}
        @media (max-width:1100px){.stage{grid-template-columns:1fr;padding:clamp(120px,16vw,160px) clamp(20px,4vw,36px) 60px}.side-panel{order:-1}.hero-face{opacity:.55}}
        @media (max-width:720px){.hero-copy{left:20px;right:20px;max-width:none}.hero-face{display:none}.wheel-wrapper{width:min(86vw,420px)}.controls{grid-template-columns:repeat(2,minmax(0,1fr))}.panel-card{padding:16px}.item-list li{grid-template-columns:12px 1fr}}
      `}</style>
    </main>
  );
}
