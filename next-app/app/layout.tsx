// next-app/app/layout.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css'; // なければ作成（空でもOK）

export const metadata: Metadata = {
  title: 'Meltidipot',
  description: 'Melty Dip Pot roulette',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
