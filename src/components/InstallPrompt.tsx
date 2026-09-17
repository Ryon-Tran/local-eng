'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

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
          padding: '12px 16px',
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
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 13 }}>Cài đặt VocalEng như App di động</strong>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Mở nhanh từ màn hình chính, học và nghe mượt mà không cần mở trình duyệt
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleInstallClick}
            id="btn-install-pwa"
            style={{ gap: 6 }}
          >
            <Download size={14} />
            <span>Cài đặt ngay</span>
          </button>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setIsDismissed(true)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="modal-overlay" onClick={() => setShowIOSGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Cài đặt trên iPhone / iPad</h3>
              </div>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowIOSGuide(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li>
                  Nhấn vào nút <strong>Chia sẻ (Share)</strong> biểu tượng <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> ở thanh dưới của Safari.
                </li>
                <li>
                  Cuộn xuống và chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
                </li>
                <li>
                  Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.
                </li>
              </ol>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setShowIOSGuide(false)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
