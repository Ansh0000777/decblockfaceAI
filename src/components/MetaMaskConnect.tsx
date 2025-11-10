import React, { useState, useEffect } from 'react';
import ContractService from '../services/ContractService';

interface WalletInfo {
  address: string;
  balance: string;
  networkName: string;
}

interface MetaMaskConnectProps {
  onConnect?: (account: string) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  showNetwork?: boolean;
}

const MetaMaskConnect: React.FC<MetaMaskConnectProps> = ({
  onConnect,
  onDisconnect,
  showBalance = false,
  showNetwork = false
}) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof ContractService.getBrowserInfo> | null>(null);

  useEffect(() => {
    // Check browser compatibility
    const info = ContractService.getBrowserInfo();
    setBrowserInfo(info);

    // Check existing connection
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      // Check if already connected
      if (ContractService.isConnected()) {
        const account = ContractService.getAccount();
        if (account) {
          await updateWalletInfo(account);
        }
      }
    } catch (error) {
      console.error('Failed to check existing connection:', error);
    }
  };

  const updateWalletInfo = async (account: string) => {
    try {
      const info = await ContractService.getWalletInfo();
      if (info) {
        setWalletInfo(info);
        if (onConnect) {
          onConnect(account);
        }
      }
    } catch (error) {
      console.error('Failed to update wallet info:', error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');

    try {
      const account = await ContractService.connectWallet();
      if (account) {
        await updateWalletInfo(account);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWalletInfo(null);
    setError('');
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = () => {
    if (!walletInfo) return '🦊';

    // Detect wallet type from browser info
    if (browserInfo?.browserName.includes('MetaMask')) {
      return '🦊';
    } else if (browserInfo?.browserName.includes('Trust')) {
      return '🔒';
    } else if (browserInfo?.browserName.includes('Coinbase')) {
      return '🔷';
    } else {
      return '💼';
    }
  };

  const isWeb3Supported = ContractService.isWeb3Supported();

  if (!isWeb3Supported || !browserInfo?.supported) {
    return (
      <div style={styles.container}>
        <div style={styles.compatibilityBox}>
          <h3>🔧 Web3 Not Supported</h3>
          <p>Your browser doesn't support Web3 features.</p>

          <div style={styles.browserInfo}>
            <p><strong>Detected Browser:</strong> {browserInfo?.browserName || 'Unknown'}</p>
            <p>{browserInfo?.recommendation}</p>
          </div>

          <div style={styles.optionsContainer}>
            <h4>Recommended Options:</h4>

            {browserInfo?.browserName.includes('Mobile') ? (
              <div style={styles.mobileOptions}>
                <a
                  href="https://metamask.app.link/dapp/blockdface.local"
                  style={styles.optionButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📱 Open in MetaMask App
                </a>
                <a
                  href="https://trustwallet.com/"
                  style={styles.optionButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔒 Use Trust Wallet
                </a>
              </div>
            ) : (
              <div style={styles.desktopOptions}>
                <a
                  href="https://metamask.io/download/"
                  style={styles.optionButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🦊 Install MetaMask
                </a>
                <a
                  href="https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddlgijnpbnjdggppjdp"
                  style={styles.optionButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔷 Install Coinbase Wallet
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (walletInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.connectedBox}>
          <div style={styles.walletHeader}>
            <span style={styles.walletIcon}>{getWalletIcon()}</span>
            <div style={styles.accountInfo}>
              <span style={styles.address}>{formatAddress(walletInfo.address)}</span>
              {showBalance && (
                <span style={styles.balance}>{walletInfo.balance} ETH</span>
              )}
              {showNetwork && (
                <span style={styles.network}>{walletInfo.networkName}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            style={styles.disconnectButton}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        style={{
          ...styles.connectButton,
          ...(isConnecting ? styles.connectButtonDisabled : {})
        }}
      >
        {isConnecting ? (
          <>
            <span style={styles.loadingSpinner}>⏳</span>
            Connecting...
          </>
        ) : (
          <>
            <span>{getWalletIcon()}</span>
            Connect Wallet
          </>
        )}
      </button>

      {error && (
        <div style={styles.errorMessage}>
          <strong>Connection Failed:</strong> {error}
        </div>
      )}

      <div style={styles.hintBox}>
        <p style={styles.hint}>
          💡 <strong>Tip:</strong> {browserInfo?.recommendation}
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    maxWidth: '350px'
  },
  compatibilityBox: {
    background: '#fff5f5',
    border: '2px solid #fed7d7',
    borderRadius: '15px',
    padding: '25px',
    textAlign: 'center' as const,
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  browserInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    margin: '15px 0',
    textAlign: 'left' as const
  },
  optionsContainer: {
    margin: '20px 0'
  },
  mobileOptions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  desktopOptions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  optionButton: {
    display: 'block',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: '15px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    transition: 'transform 0.2s'
  },
  connectedBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
    border: '2px solid #9ae6b4',
    borderRadius: '15px',
    padding: '15px 20px',
    boxShadow: '0 5px 15px rgba(16, 185, 129, 0.2)',
    width: '100%'
  },
  walletHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  walletIcon: {
    fontSize: '24px'
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start'
  },
  address: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2d3748'
  },
  balance: {
    fontSize: '12px',
    color: '#4a5568',
    marginTop: '2px'
  },
  network: {
    fontSize: '11px',
    color: '#718096',
    marginTop: '2px',
    background: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  connectButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    justifyContent: 'center',
    boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)'
  },
  connectButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none'
  },
  disconnectButton: {
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 3px 10px rgba(229, 62, 62, 0.3)'
  },
  loadingSpinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  },
  errorMessage: {
    color: '#e53e3e',
    fontSize: '13px',
    textAlign: 'center' as const,
    background: '#fff5f5',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #fed7d7',
    width: '100%'
  },
  hintBox: {
    background: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '10px',
    width: '100%'
  },
  hint: {
    margin: '0',
    color: '#1e40af',
    fontSize: '12px'
  }
};

// Add CSS animation for loading spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default MetaMaskConnect;