import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vocal Listening – Học Từ Vựng Tiếng Anh',
    short_name: 'VocalEng',
    description: 'Web app học từ vựng tiếng Anh chuyên sâu cho việc nghe, phát âm chuẩn IPA và ghi nhớ theo ngày.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#6366f1',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
