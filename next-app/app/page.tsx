'use client';

import React, { useState } from 'react';

// ルーレット候補（6種類）
const OPTIONS = [
  '野菜盛り合わせ',
  'ローストポーク',
  '牛コロカツ',
  'フライドチキン',
  'ガーリックバゲット',
  '海老フリッター',
];

export default function Page() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  function spin() {
    if (spinning) return;
    setSpinning(true);

    setTimeout(() => {
      const pick = OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
      setResult(pick);
      setHistory((h) => [pick, ...h].slice(0, 8));
      setSpinning(false);
    }, 1600); // 疑似スピン時間
  }

  function reset() {
    setResult(null);
    setHistory([]);
  }

  return (
    <main className="wrap">
      <h1 className="logo">Melty Dip Pot Roulette</h1>

      <section className="panel">
        {/* 見た目用ルーレット（実際の当選はランダムで決定） */}
        <div className={`wheel ${spinning ? 'spin' : ''}`} aria-hidden="true" />
        <div className="pointer" aria-hidden="true" />

        <div className="result" aria-live="polite">
          <div className="badge">RESULT</div>
          <p className="line">
            本日のピック：<b>{result ?? '—'}</b>
          </p>
        </div>

        <div className="actions">
          <button className="btn" onClick={spin} disabled={spinning}>
            {spinning ? 'スピン中…' : 'LUCKY DIP!'}
          </button>
          <button className="btn ghost" onClick={reset} disabled={spinning || history.length === 0}>
            クリア
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>候補（全6種）</h2>
        <ul className="options">
          {OPTIONS.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="panel history">
          <h2>履歴</h2>
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                <span className="dot" />
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ページ内スタイル（外部CSSなしでも動く最小構成） */}
      <style jsx>{`
        :global(html, body) {
          margin: 0;
          background: radial-gradient(circle at 20% 20%, #1e2030, #0c0e18 60%);
          color: #f7f7ff;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Noto Sans JP', sans-serif;
        }
        .wrap {
          max-width: 860px;
          margin: 0 auto;
          padding: 28px 20px 60px;
        }
        .logo {
          margin: 0 0 20px;
          font-size: 28px;
          letter-spacing: 0.06em;
        }
        .panel {
          background: rgba(20, 22, 38, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
          margin-top: 18px;
        }

        /* 6分割の見た目 */
        .wheel {
          width: 280px;
          height: 280px;
          margin: 6px auto 18px;
          border-radius: 50%;
          background: conic-gradient(
            #ffd166 0deg 60deg,
            #ef476f 60deg 120deg,
            #ffd166 120deg 180deg,
            #ef476f 180deg 240deg,
            #ffd166 240deg 300deg,
            #ef476f 300deg 360deg
          );
          box-shadow: inset 0 0 0 10px rgba(0, 0, 0, 0.25), 0 10px 40px rgba(0, 0, 0, 0.35);
        }
        .pointer {
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-bottom: 18px solid #fff;
          margin: 0 auto -6px;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
        }
        .wheel.spin {
          animation: spin 1.6s cubic-bezier(0.2, 0.7, 0.2, 1) 1;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(960deg); /* 2.6回転くらい */
          }
        }

        .result {
          display: grid;
          gap: 6px;
          text-align: center;
          margin: 8px 0 14px;
        }
        .badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 12px;
          letter-spacing: 0.08em;
        }
        .line {
          margin: 0;
          color: #cfd3ff;
          font-size: 15px;
        }
        .line b {
          color: #fff;
          font-size: 20px;
        }
        .actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 12px;
        }
        .btn {
          appearance: none;
          border: none;
          padding: 12px 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffd166, #ef476f);
          color: #111;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(239, 71, 111, 0.32);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn.ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: none;
        }

        .options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          padding: 0;
          margin: 10px 0 0;
          list-style: none;
        }
        .options li {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .history h2 {
          margin: 0 0 10px;
          font-size: 16px;
          color: #cfd3ff;
        }
        .history ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }
        .history li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffd166;
          box-shadow: 0 0 10px rgba(255, 209, 102, 0.6);
        }
      `}</style>
    </main>
  );
}
