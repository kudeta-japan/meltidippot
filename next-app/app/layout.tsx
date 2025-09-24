import './globals.css';

export const metadata = { title: 'Meltidippot' };

export default function RootLayout({ children }; { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
