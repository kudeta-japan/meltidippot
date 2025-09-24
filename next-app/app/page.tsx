'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const EVENT_TIME = new Date('2025-10-05T17:30:00+09:00').getTime();
const DEFAULT_CAPACITY = 40;
const FORM_ENDPOINT = 'https://formspree.io/f/xpwlgjrn';
const REMAINING_ENDPOINT = process.env.NEXT_PUBLIC_REMAINING_ENDPOINT;

const EVENT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'CHEESE WONDERLAND',
  startDate: '2025-10-05T17:30:00+09:00',
  endDate: '2025-10-05T20:00:00+09:00',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: 'KU-DETA',
    address: '岐阜市加納新本町3-1-1 SPAZIO B1'
  },
  image: ['https://kudeta-japan.github.io/cheeseparty/img/ogp.jpg'],
  description:
    'とろけて・食べて・遊べるチーズテーマパーク。Raclette Slider / Chicago Waterfall / Melty Dip Pot / Cheese Lab / Espuma Basque.',
  offers: {
    '@type': 'Offer',
    price: '3000',
    priceCurrency: 'JPY',
    availability: 'https://schema.org/InStock',
    url: 'https://kudeta-japan.github.io/cheeseparty/'
  },
  organizer: {
    '@type': 'Organization',
    name: 'KU-DETA',
    url: 'https://www.instagram.com/ku_deta_gifu/'
  }
};

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

function useCountdown(targetTime: number): Countdown {

  const calculate = useCallback(() => {
    const now = Date.now();
    const diff = Math.max(0, targetTime - now);
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000)
    };
 
  }, [targetTime]);

  const [countdown, setCountdown] = useState<Countdown>(() => calculate());

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(calculate());
    }, 1000);
    return () => clearInterval(id);
  }, [calculate]);

  return countdown;
}

function useRemainingSeats(capacity: number, endpoint?: string) {
  const [remaining, setRemaining] = useState<number>(capacity);
  const [loading, setLoading] = useState<boolean>(Boolean(endpoint));

  useEffect(() => {
    let cancelled = false;

    async function fetchSeats() {
      if (!endpoint) {
        setLoading(false);
        setRemaining(capacity);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error('failed');
        const data = await response.json();
        const value = Number(data?.remaining ?? data?.seats ?? data?.left);
        if (!Number.isFinite(value)) {
          throw new Error('invalid');
@@ -297,50 +297,53 @@ export default function Page() {
          <div className="container">
            <h2 className="fade">食べて味わう5大アトラクション</h2>
            <p className="section-lead fade">
              香り、食感、ビジュアルが異なる5つのメインアトラクションを用意しました。お気に入りのチーズ体験を見つけてください。
            </p>
            <div className="highlight-grid">
              <article className="highlight fade">
                <img src="/img/attr_raclette.jpg" alt="ラクレットスライダー" />
                <div className="body">
                  <h3>Raclette Slider</h3>
                  <p>熱々のラクレットをとろりとかけるライブ感抜群の一品。香ばしいミニバーガーにチーズが雪崩れ落ちます。</p>
                </div>
              </article>
              <article className="highlight fade">
                <img src="/img/attr_chicago.jpg" alt="シカゴチーズウォーターフォール" />
                <div className="body">
                  <h3>Chicago Waterfall</h3>
                  <p>チーズソースが滝のように溢れ出す圧巻のシカゴピザ。カットする瞬間の歓声が止まりません。</p>
                </div>
              </article>
              <article className="highlight fade">
                <img src="/img/attr_meltydip.jpg" alt="メルティディップポット" />
                <div className="body">
                  <h3>Melty Dip Pot</h3>
                  <p>彩り野菜とパンをディップして楽しむ濃厚チーズポット。好みのトッピングで自分だけの味を完成させて。</p>
                  <a className="highlight-link" href="./meltydip-roulette" target="_blank" rel="noopener noreferrer">
                    ルーレットを開く →
                  </a>
                </div>
              </article>
              <article className="highlight fade">
                <img src="/img/attr_lab.jpg" alt="チーズラボ" />
                <div className="body">
                  <h3>Cheese Lab</h3>
                  <p>試験管やフラスコを使った遊び心満載のチーズテイスティング。香りの違いを感じるガストロラボです。</p>
                </div>
              </article>
              <article className="highlight fade">
                <img src="/img/attr_espuma.jpg" alt="エスプーマバスク" />
                <div className="body">
                  <h3>Espuma Basque</h3>
                  <p>ふわふわの泡チーズを纏ったバスクチーズケーキ。口に入れた瞬間、溶けて消える新感覚デザート。</p>
                </div>
              </article>
              <article className="highlight fade">
                <img src="/img/cheese.jpg" alt="チーズの盛り合わせ" />
                <div className="body">
                  <h3>Cheese Pairing Bar</h3>
                  <p>セレクトチーズとワイン、クラフトドリンクのマリアージュ。スタッフがペアリングをアテンドします。</p>
                </div>
              </article>
            </div>
