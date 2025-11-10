import React, { useState, useEffect } from 'react';
import ContractService from '../services/ContractService';
import DeviceCompatibility, { WalletOption } from '../utils/deviceCompatibility';

interface UniversalWalletConnectProps {
  onConnect?: (account: string) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  showNetwork?: boolean;
}

const UniversalWalletConnect: React.FC<UniversalWalletConnectProps> = ({
  onConnect,
  onDisconnect,
  showBalance = false,
  showNetwork = false
}) => {
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [deviceInfo] = useState(DeviceCompatibility.getDeviceInfo());
  const [walletOptions] = useState(DeviceCompatibility.getWalletOptions());

  useEffect(() => {
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
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

  const handleConnect = async (wallet?: WalletOption) => {
    setIsConnecting(true);
    setError('');
    setShowWalletOptions(false);

    try {
      if (wallet && deviceInfo.type === 'mobile') {
        // For mobile, try deep link first
        const success = DeviceCompatibility.openWallet(wallet);
        if (success) {
          // Give user time to connect in the wallet app
          setTimeout(() => {
            checkWalletConnection();
          }, 5000);
        }
      } else {
        // For desktop or direct connection
        const account = await ContractService.connectWallet();
        if (account) {
          await updateWalletInfo(account);
        }
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  };

  const checkWalletConnection = async () => {
    try {
      const account = await ContractService.connectWallet();
      if (account) {
        await updateWalletInfo(account);
        setIsConnecting(false);
      } else {
        // Connection still pending, keep checking
        setTimeout(checkWalletConnection, 2000);
      }
    } catch (error) {
      setIsConnecting(false);
      setError('Connection cancelled or failed');
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

  const getWalletIcon = (walletName?: string) => {
    const wallet = walletOptions.find(w => w.name === walletName);
    return wallet?.icon || '💼';
  };

  const isWeb3Supported = ContractService.isWeb3Supported();
  const isCompatible = DeviceCompatibility.isCompatible();
  const compatibilityScore = DeviceCompatibility.getCompatibilityScore();

  // Show compatibility warning
  if (!isCompatible || compatibilityScore < 40) {
    return (
      <div style={styles.container}>
        <div style={styles.compatibilityWarning}>
          <h3>⚠️ Limited Compatibility</h3>
          <p>Your device may have limited Web3 support.</p>

          <div style={styles.deviceInfo}>
            <p><strong>Device:</strong> {deviceInfo.type}</p>
            <p><strong>Browser:</strong> {deviceInfo.browser}</p>
            <p><strong>OS:</strong> {deviceInfo.os}</p>
            <p><strong>Compatibility Score:</strong> {compatibilityScore}/100</p>
          </div>

          <div style={styles.recommendations}>
            <h4>Recommended Solutions:</h4>
            {walletOptions.slice(0, 3).map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                style={styles.walletOption}
              >
                <span style={styles.walletIcon}>{wallet.icon}</span>
                <div style={styles.walletDetails}>
                  <strong>{wallet.name}</strong>
                  <small>{wallet.description}</small>
                </div>
              </button>
            ))}
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

  if (showWalletOptions) {
    return (
      <div style={styles.container}>
        <div style={styles.walletSelection}>
          <h3>Choose Your Wallet</h3>
          <p>Select a wallet to connect to BlockDFace</p>

          <div style={styles.walletList}>
            {walletOptions.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                style={styles.walletOption}
              >
                <span style={styles.walletIcon}>{wallet.icon}</span>
                <div style={styles.walletDetails}>
                  <strong>{wallet.name}</strong>
                  <small>{wallet.description}</small>
                </div>
                {deviceInfo.type === 'mobile' && (
                  <span style={styles.mobileBadge}>Mobile</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowWalletOptions(false)}
            style={styles.backButton}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {!isWeb3Supported ? (
        <div style={styles.noWeb3Support}>
          <h3>🔧 Web3 Not Detected</h3>
          <p>Your browser doesn't have a Web3 wallet connected.</p>

          <div style={styles.solutions}>
            <h4>Quick Solutions:</h4>
            {deviceInfo.type === 'mobile' ? (
              <div style={styles.mobileSolutions}>
                <button
                  onClick={() => setShowWalletOptions(true)}
                  style={styles.solutionButton}
                >
                  📱 Choose Mobile Wallet
                </button>
                <button
                  onClick={() => DeviceCompatibility.openWallet(walletOptions[0])}
                  style={styles.solutionButton}
                >
                  🦊 Open MetaMask App
                </button>
              </div>
            ) : (
              <div style={styles.desktopSolutions}>
                <button
                  onClick={() => setShowWalletOptions(true)}
                  style={styles.solutionButton}
                >
                  💼 Choose Browser Wallet
                </button>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.solutionButton}
                >
                  🦊 Install MetaMask
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowWalletOptions(true)}
          style={styles.connectButton}
        >
          <span>{getWalletIcon()}</span>
          Connect Wallet
        </button>
      )}

      {error && (
        <div style={styles.errorMessage}>
          <strong>Connection Failed:</strong> {error}
        </div>
      )}

      {isConnecting && (
        <div style={styles.connectingStatus}>
          <span style={styles.spinner}>⏳</span>
          <p>Waiting for wallet connection...</p>
          <small>Check your wallet app and approve the connection</small>
        </div>
      )}

      <div style={styles.deviceInfo}>
        <small>
          📱 {deviceInfo.type} • 🌐 {deviceInfo.browser} •
          📊 Compatibility: {compatibilityScore}/100
        </small>
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
    maxWidth: '400px'
  },
  compatibilityWarning: {
    background: '#fff3cd',
    border: '2px solid #ffeaa7',
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center' as const,
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  deviceInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    margin: '15px 0',
    textAlign: 'left' as const,
    fontSize: '14px'
  },
  recommendations: {
    margin: '20px 0'
  },
  walletSelection: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '450px'
  },
  walletList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    margin: '20px 0'
  },
  walletOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left' as const
  },
  walletIcon: {
    fontSize: '24px'
  },
  walletDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const
  },
  mobileBadge: {
    background: '#667eea',
    color: 'white',
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '12px'
  },
  noWeb3Support: {
    background: '#fff5f5',
    border: '2px solid #fed7d7',
    borderRadius: '15px',
    padding: '25px',
    textAlign: 'center' as const,
    maxWidth: '450px'
  },
  solutions: {
    margin: '20px 0'
  },
  mobileSolutions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  desktopSolutions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  solutionButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: '15px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
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
  disconnectButton: {
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  backButton: {
    background: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    padding: '10px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '10px'
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
  connectingStatus: {
    textAlign: 'center' as const,
    padding: '20px',
    background: '#f0f9ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe'
  },
  spinner: {
    fontSize: '24px',
    display: 'block',
    margin: '0 auto 10px'
  }
};

export default UniversalWalletConnect;