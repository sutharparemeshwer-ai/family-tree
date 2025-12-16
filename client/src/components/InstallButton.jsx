import React, { useState, useEffect } from 'react';
import './InstallButton.css';

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="share-icon-ios">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16 6 12 2 8 6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    // 2. Listen for the 'beforeinstallprompt' event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome logic
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // iOS Logic: Show instructions
      setShowIOSInstructions(true);
    }
  };

  // If already installed, don't show anything
  if (isStandalone) return null;

  // Only show button if we have a prompt (Android) OR it's iOS
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button className="install-app-btn" onClick={handleInstallClick}>
        <DownloadIcon />
        Download App
      </button>

      {showIOSInstructions && (
        <div className="modal-overlay" onClick={() => setShowIOSInstructions(false)}>
          <div className="ios-install-modal" onClick={e => e.stopPropagation()}>
            <h3>Install for iPhone</h3>
            <p>To install this app on your iPhone:</p>
            
            <div className="ios-instruction-row">
              1. Tap the <ShareIcon /> <strong>Share</strong> button.
            </div>
            <div className="ios-instruction-row">
              2. Scroll down and tap <PlusIcon /> <strong>Add to Home Screen</strong>.
            </div>

            <button className="close-ios-modal" onClick={() => setShowIOSInstructions(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallButton;
