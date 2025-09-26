'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ========= base path（GitHub Pages などのサブパス対応） ========= */
const prefix = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const img = (file: string) => `${prefix}/img/bg/${file}`;

/* ========= types ========= */
type Item = {
  id: string;
  name: string;
  description: string;
  icon: string;     // public/img/bg/ 内のファイル名（例: 'veg.png'）
  accent: string;
};
type Result = { id: string; name: string; icon: string };

/* ========= items (6種類) ========= */
const ITEMS: Item[] = [
  { id: 'veg',      name: '野菜盛り合わせ',   description: '色とりどりの野菜を軽くロースト。チーズとの相性ばつぐん。', icon: 'veg.png',      accent: '#5ed67d' },
  { id: 'pork',     name: 'ローストポーク',   description: 'しっとりジューシー、コクのあるチーズと好相性。',             icon: 'pork.png',     accent: '#ff7f7f' },
  { id: 'beef',     name: '牛コロカツ',       description: '食べごたえ満点のひとくちビーフカツ。',                         icon: 'beef.png',     accent: '#f76367' },
  { id: 'chicken',  name: 'フライドチキン',   description: 'カリッと衣にチーズが絡んで止まらない！',                        icon: 'chicken.png',  accent: '#ff9e6e' },
  { id: 'baguette', name: 'ガーリックバゲット', description: '香ばしい香りでチーズがさらに主役に。',                       icon: 'baguette.png', accent: '#ffd166' },
  { id: 'shrimp',   name: '海老フリッター',   description: 'プリッと食感に濃厚チーズをダイブ。',                            icon: 'shrimp.png',   accent: '#ff9472' },
];

/* ========= geometry ========= */
const SEGMENT_ANGLE = 360 / ITEMS.length;
const clampAngle = (deg: number) => ((deg % 360) + 360) % 360;

/* ========= ユーティリティ ========= */
function polarToCartesian(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}
function describeArc(start: number, end: number, radius: number) {
  const s = polarToCartesian(radius, start);
  const e = polarToCartesian(radius, end);
  const large = end - start <= 180 ? '0' : '1';
  return `M 0 0 L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${radius} ${radius} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
}

/* ========= Congrats ========= */
const CongratsCard = () => (
  <div className="congrats-card">
    <div className="spark" />
    <div className="spark big" />
    <div className="badge">CONGRATS!</div>
    <p>メルティディップポットのミッション達成！</p>
  </div>
);

/* ========= Web Audio ========= */
function createAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    return new Ctor();
  } catch {
    return null;
  }
}

/* ========= ページ本体 ========= */
export default function Page() {
  /* state / refs */
  const [rotation, setRotation] = useState(0);            // 針の角度（度）
  const rotationRef = useRef(0);

  const [mode, setMode] = useState<'idle' | 'spinning' | 'stopping'>('idle');
  const modeRef = useRef<'idle' | 'spinning' | 'stopping'>('idle');

  const velocityRef = useRef(0);                          // 針の角速度（度/秒）
  const stopStartRef = useRef(0);
  const stopTargetRef = useRef(0);
  const stopStartTimeRef = useRef(0);
  const stopDurationRef = useRef(3.1);

  const [spinsLeft, setSpinsLeft] = useState(0);
  const spinsLeftRef = useRef(0);

  const [results, setResults] = useState<Result[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [showStart, setShowStart] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const [flashImg, setFlashImg] = useState<string | null>(null);

  const toastTimerRef = useRef<number>();
  const highlightTimerRef = useRef<number>();
  const flashTimerRef = useRef<number>();
  const autoStopTimerRef = useRef<number>();
  const [needlePulse, setNeedlePulse] = useState(false);   // 「回す」ボタン hover で針をちょい演出

  /* helpers */
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

    const bus = ctx.createGain();
    bus.gain.value = 0.001;
    bus.connect(ctx.destination);

    [0, 0.12, 0.26].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const tones = [523.25, 659.25, 783.99]; // C5, E5, G5
      osc.frequency.setValueAtTime(tones[i], now + offset);
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g).connect(bus);
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.start(now + offset);
      osc.stop(now + offset + 0.26);
    });

    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(0.35, now + 0.12);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  }, [ensureAudio]);

  const showToastMessage = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1400);
  }, []);

  /* pointer（針）が示しているインデックスを計算 */
  const activeIndex = useMemo(() => {
    const pointerAngle = clampAngle(rotation); // 針が回るのでそのまま
    return Math.floor((pointerAngle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
  }, [rotation]);

  /* refs sync */
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { spinsLeftRef.current = spinsLeft; }, [spinsLeft]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* body 背景クラス */
  useEffect(() => {
    document.body.classList.add('meltydip-body');
    return () => { document.body.classList.remove('meltydip-body'); };
  }, []);

  /* インデックス/角度補助 */
  const indexFromPointer = useCallback((angle: number) => {
    const pointerAngle = clampAngle(angle);
    return Math.floor((pointerAngle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % ITEMS.length;
  }, []);

  /* ===== ここから操作系：必ず回る & 自動停止対応 ===== */
  const startSpin = () => {
    if (modeRef.current !== 'idle') return;

    // ユーザー操作で Web Audio を解錠
    ensureAudio();

    // 初回など回数設定が無い場合は 1 回ぶんシードして必ず回る
    if (spinsLeftRef.current <= 0) {
      setSpinsLeft(1);
      spinsLeftRef.current = 1;
      showToastMessage('お試しスピン 1回');
    }

    // 初期角速度（度/秒）
    velocityRef.current = 120; // ゆっくり始める
    modeRef.current = 'spinning';
    setMode('spinning');

    // スタートオーバーレイは閉じる
    if (showStart) setShowStart(false);

    // 1.2〜1.8秒後に自動で止め始める（押さなくても止まる）
    if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = window.setTimeout(() => {
      if (modeRef.current === 'spinning') stopSpin();
    }, 1200 + Math.random() * 600);
  };

  const stopSpin = () => {
    if (modeRef.current !== 'spinning') return;

    const current = rotationRef.current;
    const idx = indexFromPointer(current);
    const centerAngle = idx * SEGMENT_ANGLE;

    // セグメント中心±少しのジッター（見た目の自然さ）
    const jitterRange = SEGMENT_ANGLE / 2 - 8;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const targetPointer = clampAngle(centerAngle + jitter);

    // 現在角度から目標角度まで前方に進む差分
    const normalizedCurrent = clampAngle(current);
    const normalizedTarget = clampAngle(targetPointer);
    let delta = normalizedTarget - normalizedCurrent;
    if (delta <= 0) delta += 360;

    const laps = 4 + Math.floor(Math.random() * 3); // 4〜6周して止める
    stopStartRef.current = current;
    stopTargetRef.current = current + laps * 360 + delta;
    stopStartTimeRef.current = performance.now();
    stopDurationRef.current = 2.8 + Math.random() * 0.6;

    modeRef.current = 'stopping';
    setMode('stopping');
  };

  const finishStop = useCallback(() => {
    modeRef.current = 'idle';
    setMode('idle');

    const finalIdx = indexFromPointer(stopTargetRef.current);
    const item = ITEMS[finalIdx];

    // セグメントのハイライト
    setHighlightIdx(finalIdx);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightIdx(null), 1600);

    playResultChime();
    showToastMessage(`${item.name}！`);

    setResults((prev) => [...prev, { id: item.id, name: item.name, icon: item.icon }]);

    // 停止直後のフラッシュ画像
    setFlashImg(img(item.icon));
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashImg(null), 900);

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
  }, [indexFromPointer, playResultChime, showToastMessage]);

  /* RAF ループ（針を回す） */
  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (modeRef.current === 'spinning') {
        // 加速して最大速度に近づく
        const maxVel = 720; // 度/秒（2回転/秒）
        const accel = 480;  // 度/秒^2
        velocityRef.current = Math.min(maxVel, velocityRef.current + accel * dt);
        const next = rotationRef.current + velocityRef.current * dt;
        setRotation(next);
        rotationRef.current = next;
      } else if (modeRef.current === 'stopping') {
        const elapsed = (now - stopStartTimeRef.current) / 1000;
        const t = Math.min(1, elapsed / stopDurationRef.current);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
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

  /* クリーンアップ */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  /* UI: ランプ座標（演出用） */
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

  /* 人数選択 */
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
    setRotation(0); rotationRef.current = 0;
    velocityRef.current = 0;
    setSpinsLeft(0); spinsLeftRef.current = 0;
    setResults([]);
    setShowStart(true);
    setShowSummary(false);
    setShowCongrats(false);
    setHighlightIdx(null);
  };

  /* ========= render ========= */
  return (
    <main className="meltydip-app">
      <div className="backdrop">
        {/* 背景写真（CSSの global でも敷いているが、ここは安全に念押し） */}
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
            {/* ライト演出 */}
            <div className="led-ring">
              {ledBulbs.map((b) => (
                <span
                  key={b.index}
                  className={`led ${mode !== 'idle' ? 'spin' : ''} ${isSegmentHighlighted(b.angle) ? 'highlight' : ''}`}
                  style={{ transform: `rotate(${b.angle}deg) translate(var(--led-radius))`, animationDelay: `${b.index * -0.05}s` }}
                />
              ))}
            </div>

            {/* 盤面（静止） */}
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
                      className={highlightIdx === index ? 'segment highlight' : 'segment'}
                    />
                  );
                })}
              </svg>

              {/* セグメント名＋アイコン（盤面に固定表示） */}
              <div className="labels">
                {ITEMS.map((item, index) => (
                  <div key={item.id} className="label" style={{ transform: `rotate(${index * SEGMENT_ANGLE}deg)` }}>
                    <div className="label-inner" style={{ transform: `rotate(${-index * SEGMENT_ANGLE}deg)` }}>
                      <img className="icon" src={img(item.icon)} alt={item.name} draggable={false} />
                      <span className="name">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 中央ロゴ */}
              <div className="hub">
                <span className="hub-title">Melty Dip Pot</span>
                <span className="hub-sub">Roulette</span>
              </div>
            </div>

            {/* 針（これが回る） */}
            <div className={`needle ${needlePulse ? 'pulse' : ''}`} style={{ transform: `rotate(${rotation}deg)` }}>
              <div className="needle-inner" />
            </div>
          </div>

          {/* 盤の下に操作群 */}
          <div className="controls under-wheel">
            <button
              onMouseEnter={() => setNeedlePulse(true)}
              onMouseLeave={() => setNeedlePulse(false)}
              onClick={startSpin}
              disabled={mode !== 'idle'}
            >
              回す 🎡
            </button>
            <button onClick={stopSpin} disabled={mode !== 'spinning'}>止める ⏹</button>
            <div className="status">
              <span className="label">残り</span>
              <strong>{spinsLeft > 0 ? spinsLeft : '--'} 回</strong>
              <span className="now">いま：{ITEMS[activeIndex]?.name ?? '—'}</span>
              <button className="ghost" onClick={() => setMuted(m => !m)}>{muted ? '🔇' : '🔈'}</button>
              <button className="ghost" onClick={resetGame}>リセット 🔄</button>
            </div>
          </div>
        </div>

        {/* 右側：一覧と履歴 */}
        <aside className="side-panel">
          <div className="panel-card">
            <h2>トッピング一覧</h2>
            <ul className="item-list">
              {ITEMS.map((it) => (
                <li key={it.id}>
                  <span className="dot" style={{ background: it.accent }} />
                  <img className="inline-icon" src={img(it.icon)} alt="" />
                  <div>
                    <strong>{it.name}</strong>
                    <p>{it.description}</p>
                  </div>
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
                    <img className="history-icon" src={img(r.icon)} alt="" />
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {toast && <div className="toast">{toast}</div>}
      {showCongrats && <div className="overlay congrats"><CongratsCard /></div>}

      {showSummary && (
        <div className="overlay summary">
          <div className="card">
            <h2>結果まとめ</h2>
            <table>
              <thead><tr><th>メニュー</th><th>回数</th></tr></thead>
              <tbody>
                {(() => {
                  const map = new Map<string, { name: string; count: number; icon: string }>();
                  results.forEach((r) => {
                    if (!map.has(r.id)) map.set(r.id, { name: r.name, count: 0, icon: r.icon });
                    map.get(r.id)!.count += 1;
                  });
                  const rows = Array.from(map.values());
                  return rows.length
                    ? rows.map((e) => (
                        <tr key={e.name}>
                          <td><img className="table-icon" src={img(e.icon)} alt="" /> {e.name}</td>
                          <td>{e.count}</td>
                        </tr>
                      ))
                    : <tr><td colSpan={2}>該当なし</td></tr>;
                })()}
              </tbody>
            </table>
            <div className="summary-actions">
              <button onClick={() => { setShowSummary(false); setShowStart(true); }}>もう一度</button>
              <button className="ghost" onClick={() => setShowSummary(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {showStart && (
        <div className="overlay start">
          <div className="card">
            <h2>人数を選択</h2>
            <p>1人あたり2回プレイできます。チーム人数を選んでスタート！</p>
            <div className="player-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => choosePlayers(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 停止直後のフラッシュ */}
      {flashImg && (
        <div className="flash" aria-hidden>
          <img src={flashImg} alt="" />
        </div>
      )}

      {/* ========= スタイル ========= */}
      <style jsx global>{`
        body.meltydip-body {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,163,102,.16), transparent 50%),
            radial-gradient(circle at 80% 0%, rgba(255,230,140,.18), transparent 55%),
            linear-gradient(180deg, #070713, #0c0c1f),
            url('${img('top.png')}');
          background-size: auto, auto, auto, cover;
          background-repeat: no-repeat;
          background-position: center top;
          background-attachment: fixed;
        }
      `}</style>

      <style jsx>{`
        .meltydip-app{position:relative;min-height:100vh;color:#eef2ff;overflow:hidden}
        .backdrop{position:absolute;inset:0;pointer-events:none}
        .bg-photo{position:absolute;inset:0;background:center/cover no-repeat;filter:brightness(.5)}
        .backdrop .blur{position:absolute;inset:-40px;background:
          radial-gradient(circle at 30% 20%, rgba(255,180,120,.22), transparent 50%),
          radial-gradient(circle at 90% 15%, rgba(255,90,130,.18), transparent 55%),
          radial-gradient(circle at 40% 80%, rgba(110,190,255,.16), transparent 60%);
          filter:blur(120px);opacity:.65}
        .hero-copy{position:absolute;top:clamp(48px,8vw,80px);left:clamp(40px,6vw,120px);max-width:min(420px,40vw)}
        .hero-copy .eyebrow{display:inline-flex;gap:.4rem;padding:.4rem .8rem;border-radius:999px;background:rgba(255,209,102,.16);color:#ffdd83;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem}
        .hero-copy h1{margin:.8rem 0 .4rem;font-size:clamp(32px,4vw,58px);letter-spacing:-.01em}
        .hero-copy p{margin:0;line-height:1.7;color:rgba(230,235,255,.8);font-size:.98rem}

        .stage{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,420px);gap:32px;
          padding:clamp(120px,16vw,160px) clamp(32px,6vw,60px) 60px}

        .wheel-area{display:grid;place-items:center}
        .wheel-wrapper{position:relative;width:min(620px,72vw);aspect-ratio:1;display:grid;place-items:center;--led-radius:calc(50% - clamp(20px,3vw,36px))}
        .led-ring{position:absolute;inset:0;display:grid;place-items:center}
        .led{position:absolute;width:clamp(10px,1.2vw,16px);aspect-ratio:1;border-radius:50%;
          background:radial-gradient(circle, rgba(255,230,160,.9), rgba(255,150,60,.3));
          box-shadow:0 0 12px rgba(255,180,80,.4);opacity:.65;transition:.2s}
        .led.spin{animation:ledPulse 1.4s linear infinite}
        .led.highlight{opacity:1;box-shadow:0 0 18px rgba(255,230,180,.85),0 0 40px rgba(255,160,60,.45)}

        .wheel{position:relative;width:100%;height:100%;border-radius:50%;
          backdrop-filter:blur(8px);background:rgba(14,18,40,.4);
          border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 80px rgba(0,0,0,.55)}
        .wheel svg{position:absolute;inset:clamp(26px,4vw,38px);width:calc(100% - clamp(52px,8vw,76px));height:calc(100% - clamp(52px,8vw,76px))}
        .segment{transition:filter .3s ease, opacity .3s ease}
        .segment.highlight{filter:brightness(1.25) saturate(1.2)}
        .labels{position:absolute;inset:clamp(26px,4vw,38px);display:grid;place-items:center;pointer-events:none}
        .label{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center}
        .label-inner{display:grid;place-items:center;transform-origin:center;translate:0 clamp(-44%,-16vw,-48%);text-align:center;gap:.3rem}
        .label .icon{width:clamp(28px,4vw,44px);height:auto;display:block;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
        .label .name{font-size:clamp(.68rem,1.6vw,.85rem);letter-spacing:.02em;background:rgba(10,12,24,.68);padding:.3rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.16)}

        .hub{position:absolute;inset:clamp(130px,22vw,180px);border-radius:50%;
          background:radial-gradient(circle at 50% 30%, rgba(255,209,120,.26), rgba(255,120,90,.1));
          border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;text-align:center;gap:.2rem;
          font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,244,220,.9)}
        .hub-title{font-size:clamp(.72rem,2vw,1.2rem)} .hub-sub{font-size:clamp(.6rem,1.8vw,.9rem)}

        /* 針：中央から回転 */
        .needle{position:absolute;inset:0;display:grid;place-items:center;transform-origin:center;transition:transform .18s ease-out}
        .needle-inner{
          width:clamp(12px,1.6vw,18px);
          height:clamp(80px,14vw,120px);
          background:linear-gradient(180deg,#ffce6a,#ff6f91);
          clip-path:polygon(50% 8%, 85% 52%, 50% 96%, 15% 52%);
          box-shadow:0 12px 40px rgba(255,110,130,.45);
        }
        .needle.pulse .needle-inner{transform:translateY(-2px);filter:brightness(1.08)}

        /* 操作系 */
        .controls.under-wheel{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;margin-top:14px}
        .controls.under-wheel button{appearance:none;border:none;border-radius:14px;padding:12px 14px;font-size:.95rem;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8b6e);color:#1d1d22;box-shadow:0 14px 36px rgba(0,0,0,.35);transition:.15s}
        .controls.under-wheel button:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;transform:none}
        .controls.under-wheel button:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 22px 48px rgba(255,110,130,.32)}
        .controls .ghost{background:rgba(24,28,48,.85);color:rgba(240,244,255,.9);border:1px solid rgba(255,255,255,.14);box-shadow:none}
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
        .history-icon{width:18px;height:18px;object-fit:contain;margin-right:6px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
        .table-icon{width:18px;height:18px;object-fit:contain;vertical-align:-3px;margin-right:6px}

        .toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(15,18,40,.92);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:12px 24px;font-weight:700;letter-spacing:.04em;z-index:50;box-shadow:0 16px 40px rgba(0,0,0,.5)}

        .overlay{position:fixed;inset:0;display:grid;place-items:center;z-index:40;background:rgba(4,6,14,.72);backdrop-filter:blur(12px)}
        .overlay.start .card,.overlay.summary .card{background:rgba(14,18,38,.9);border-radius:20px;border:1px solid rgba(255,255,255,.12);padding:clamp(28px,6vw,40px);width:min(90vw,520px);box-shadow:0 30px 80px rgba(0,0,0,.55)}
        .player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .player-grid button{font-size:1.4rem;font-weight:800;padding:18px 0;border-radius:16px;border:none;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8a65);color:#1d1d22;box-shadow:0 18px 42px rgba(0,0,0,.4);transition:.18s}
        .player-grid button:hover{transform:translateY(-3px);box-shadow:0 24px 50px rgba(255,120,100,.38)}

        .overlay.congrats{background:rgba(4,6,14,.82)}
        .congrats-card{position:relative;background:radial-gradient(circle at 50% 30%, rgba(255,209,120,.18), rgba(10,12,24,.94));
          border-radius:24px;padding:48px 60px;border:1px solid rgba(255,255,255,.16);text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.55)}
        .congrats-card .badge{display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.4rem;border-radius:999px;background:linear-gradient(135deg,#ffd86b,#ff8b6e);color:#1d1d24;font-weight:800;letter-spacing:.08em;margin-bottom:16px}
        .congrats-card p{margin:0;color:rgba(235,238,255,.85);font-size:1rem}
        .congrats-card .spark{position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 180deg, rgba(255,255,255,.12), transparent 30%, rgba(255,255,255,.12) 60%, transparent 90%);
          mix-blend-mode:screen;animation:rotate 8s linear infinite;opacity:.45}
        .congrats-card .spark.big{animation-duration:12s;opacity:.25}

        .overlay.summary table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.95rem;background:rgba(255,255,255,.04);border-radius:14px;overflow:hidden}
        .overlay.summary th,.overlay.summary td{text-align:left;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
        .overlay.summary th:last-child,.overlay.summary td:last-child{text-align:right}
        .overlay.summary tr:last-child td{border-bottom:none}
        .summary-actions{margin-top:18px;display:flex;gap:10px}
        .summary-actions button{padding:12px 18px;border-radius:14px;border:none;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffd86b,#ff8a65);color:#1d1d24;box-shadow:0 14px 36px rgba(0,0,0,.35)}
        .summary-actions .ghost{background:rgba(20,24,42,.86);color:rgba(240,244,255,.9);border:1px solid rgba(255,255,255,.14);box-shadow:none}

        .flash{position:fixed;inset:0;display:grid;place-items:center;z-index:60;pointer-events:none;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.08), transparent 60%);
          animation:flashFade .9s ease forwards}
        .flash img{width:min(30vw,240px);height:auto;object-fit:contain;filter:drop-shadow(0 12px 40px rgba(0,0,0,.5))}

        @keyframes ledPulse{0%,100%{opacity:.45;box-shadow:0 0 12px rgba(255,180,80,.35)}50%{opacity:.95;box-shadow:0 0 20px rgba(255,200,140,.85)}}
        @keyframes rotate{to{transform:rotate(360deg)}}
        @keyframes flashFade{0%{opacity:0}10%{opacity:1}80%{opacity:.9}100%{opacity:0}}

        @media (max-width:1100px){
          .stage{grid-template-columns:1fr;padding:clamp(120px,16vw,160px) clamp(20px,4vw,36px) 60px}
        }
        @media (max-width:720px){
          .hero-copy{left:20px;right:20px;max-width:none}
          .wheel-wrapper{width:min(86vw,420px)}
          .controls.under-wheel{grid-template-columns:repeat(2,minmax(0,1fr))}
          .panel-card{padding:16px}
          .item-list li{grid-template-columns:12px 40px 1fr}
        }
      `}</style>
    </main>
  );
}
