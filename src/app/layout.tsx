import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VOCAL LISTENING – Học & Ghi Nhớ Từ Vựng Tiếng Anh',
  description: 'Web app học từ vựng tiếng Anh chuyên sâu cho việc nghe, phát âm chuẩn IPA và ghi nhớ từ vựng theo ngày.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎧</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
