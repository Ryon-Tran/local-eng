'use client';

import React, { useState, useEffect } from 'react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      <div
        className="card"
        style={{
          margin: '0 0 16px 0',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
          borderColor: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            📲
          </div>
          <div>
            <strong style={{ fontSize: 14 }}>Cài đặt VocalEng như App di động</strong>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Mở nhanh từ màn hình chính, học và nghe mượt mà không cần mở trình duyệt
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleInstallClick}
            id="btn-install-pwa"
          >
            📲 Cài đặt ngay
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsDismissed(true)}
            style={{ padding: '6px 10px' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="modal-overlay" onClick={() => setShowIOSGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>📲 Cài đặt trên iPhone / iPad</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowIOSGuide(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li>
                  Nhấn vào nút <strong>Chia sẻ (Share)</strong> biểu tượng <span style={{ fontSize: 18 }}>⎋</span> ở thanh dưới Safari.
                </li>
                <li>
                  Cuộn xuống và chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
                </li>
                <li>
                  Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải.
                </li>
              </ol>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowIOSGuide(false)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
