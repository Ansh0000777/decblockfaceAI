/**
 * Device Compatibility Utility
 * Helps identify device capabilities and provide recommendations for Web3 access
 */

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'iOS' | 'Android' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown';
  browser: string;
  supportsWeb3: boolean;
  recommendedWallet: string[];
  deepLinkSupported: boolean;
  userAgent: string;
}

export interface WalletOption {
  name: string;
  icon: string;
  url: string;
  deepLink?: string;
  description: string;
  platforms: string[];
}

class DeviceCompatibility {
  private static instance: DeviceCompatibility;
  private deviceInfo: DeviceInfo | null = null;

  constructor() {
    this.detectDevice();
  }

  static getInstance(): DeviceCompatibility {
    if (!DeviceCompatibility.instance) {
      DeviceCompatibility.instance = new DeviceCompatibility();
    }
    return DeviceCompatibility.instance;
  }

  private detectDevice(): void {
    const userAgent = navigator.userAgent;
    const deviceInfo: DeviceInfo = {
      userAgent,
      type: this.getDeviceType(userAgent),
      os: this.getOperatingSystem(userAgent),
      browser: this.getBrowser(userAgent),
      supportsWeb3: this.detectWeb3Support(),
      recommendedWallet: [],
      deepLinkSupported: this.supportsDeepLinks(userAgent),
    };

    deviceInfo.recommendedWallet = this.getRecommendedWallets(deviceInfo);
    this.deviceInfo = deviceInfo;
  }

  private getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;

    if (tabletRegex.test(userAgent)) {
      return 'tablet';
    } else if (mobileRegex.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getOperatingSystem(userAgent: string): 'iOS' | 'Android' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown' {
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'MacOS';
    if (/Linux|X11/i.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  private getBrowser(userAgent: string): string {
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Edg/i.test(userAgent)) return 'Edge';
    if (/Opera|OPR/i.test(userAgent)) return 'Opera';
    if (/MetaMask/i.test(userAgent)) return 'MetaMask Mobile';
    if (/Trust/i.test(userAgent)) return 'Trust Wallet';
    if (/Coinbase/i.test(userAgent)) return 'Coinbase Wallet';
    return 'Unknown';
  }

  private detectWeb3Support(): boolean {
    // Check for window.ethereum (MetaMask, Trust, etc.)
    if (typeof window !== 'undefined' && window.ethereum) {
      return true;
    }

    // Check for window.web3 (legacy)
    if (typeof window !== 'undefined' && window.web3) {
      return true;
    }

    // Check for Web3 in user agent
    if (/ethereum|web3/i.test(navigator.userAgent)) {
      return true;
    }

    return false;
  }

  private supportsDeepLinks(userAgent: string): boolean {
    // Most modern mobile browsers support deep links
    const mobileRegex = /Mobile|Android|iPhone|iPad|iPod/i;
    return mobileRegex.test(userAgent);
  }

  private getRecommendedWallets(deviceInfo: DeviceInfo): string[] {
    const recommendations: string[] = [];

    if (deviceInfo.type === 'mobile') {
      if (deviceInfo.os === 'iOS') {
        recommendations.push('MetaMask Mobile', 'Trust Wallet', 'Coinbase Wallet');
      } else if (deviceInfo.os === 'Android') {
        recommendations.push('MetaMask Mobile', 'Trust Wallet', 'Rainbow');
      } else {
        recommendations.push('MetaMask Mobile');
      }
    } else {
      // Desktop
      recommendations.push('MetaMask Extension');

      if (deviceInfo.browser === 'Chrome') {
        recommendations.push('Coinbase Wallet Extension', 'Phantom');
      } else if (deviceInfo.browser === 'Firefox') {
        recommendations.push('MetaMask Extension');
      } else if (deviceInfo.browser === 'Edge') {
        recommendations.push('MetaMask Extension', 'Built-in Wallet');
      }
    }

    return recommendations;
  }

  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      this.detectDevice();
    }
    return this.deviceInfo!;
  }

  isMobile(): boolean {
    return this.getDeviceInfo().type === 'mobile';
  }

  isTablet(): boolean {
    return this.getDeviceInfo().type === 'tablet';
  }

  isDesktop(): boolean {
    return this.getDeviceInfo().type === 'desktop';
  }

  supportsWallet(walletName: string): boolean {
    const deviceInfo = this.getDeviceInfo();
    return deviceInfo.recommendedWallet.includes(walletName);
  }

  getWalletOptions(): WalletOption[] {
    const deviceInfo = this.getDeviceInfo();
    const isMobile = deviceInfo.type === 'mobile';

    const baseOptions: WalletOption[] = [
      {
        name: 'MetaMask',
        icon: '🦊',
        url: isMobile ? 'https://metamask.app.link/dapp/blockdface.local' : 'https://metamask.io/download/',
        deepLink: isMobile ? 'metamask://dapp/blockdface.local' : undefined,
        description: 'Most popular Web3 wallet',
        platforms: ['iOS', 'Android', 'Windows', 'MacOS', 'Linux']
      },
      {
        name: 'Trust Wallet',
        icon: '🔒',
        url: isMobile ? 'https://link.trustwallet.com/open_url?coin_id=60&url=https://blockdface.local' : 'https://trustwallet.com/',
        deepLink: isMobile ? 'trust://' : undefined,
        description: 'Simple and secure mobile wallet',
        platforms: ['iOS', 'Android']
      },
      {
        name: 'Coinbase Wallet',
        icon: '🔷',
        url: isMobile ? 'https://go.cb-w.com/dapp?cb_url=https://blockdface.local' : 'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddlgijnpbnjdggppjdp',
        deepLink: isMobile ? 'cbwallet://dapp/https://blockdface.local' : undefined,
        description: 'Wallet from Coinbase exchange',
        platforms: ['iOS', 'Android', 'Chrome']
      }
    ];

    // Filter options based on device compatibility
    return baseOptions.filter(option =>
      option.platforms.includes(deviceInfo.os) ||
      option.platforms.includes(deviceInfo.type) ||
      !isMobile // Desktop users can see all options
    );
  }

  generateDeepLink(wallet: WalletOption, dappUrl: string): string | null {
    if (!this.isMobile() || !wallet.deepLink) {
      return null;
    }

    // Map DApp URL to wallet-specific deep link format
    switch (wallet.name) {
      case 'MetaMask':
        return `metamask://dapp/${dappUrl}`;
      case 'Trust Wallet':
        return `trust://dapp/${dappUrl}`;
      case 'Coinbase Wallet':
        return `cbwallet://dapp/${dappUrl}`;
      default:
        return wallet.deepLink;
    }
  }

  openWallet(wallet: WalletOption, dappUrl: string = 'blockdface.local'): boolean {
    try {
      const deepLink = this.generateDeepLink(wallet, dappUrl);

      if (deepLink && this.isMobile()) {
        // Try deep link first for mobile
        window.location.href = deepLink;

        // Fallback to app store after 2 seconds
        setTimeout(() => {
          window.open(wallet.url, '_blank');
        }, 2000);
      } else {
        // Desktop or no deep link support
        window.open(wallet.url, '_blank');
      }

      return true;
    } catch (error) {
      console.error('Failed to open wallet:', error);
      return false;
    }
  }

  getNetworkConfig() {
    return {
      chainId: '0x539', // 1337 in hex for Ganache
      chainName: 'Ganache Local',
      rpcUrls: ['http://127.0.0.1:8545'],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      blockExplorerUrls: null
    };
  }

  getConnectionInstructions(): string {
    const deviceInfo = this.getDeviceInfo();

    if (deviceInfo.type === 'mobile') {
      if (deviceInfo.os === 'iOS') {
        return 'For best experience, use the MetaMask mobile app or open this link in Safari with MetaMask installed.';
      } else {
        return 'Use MetaMask mobile app or Trust Wallet for the best experience.';
      }
    } else {
      if (deviceInfo.browser === 'Chrome') {
        return 'Install MetaMask extension for Chrome browser.';
      } else if (deviceInfo.browser === 'Firefox') {
        return 'Install MetaMask extension for Firefox browser.';
      } else if (deviceInfo.browser === 'Edge') {
        return 'Use the built-in crypto wallet in Edge or install MetaMask extension.';
      } else {
        return 'Install MetaMask extension for your browser for best compatibility.';
      }
    }
  }

  isCompatible(): boolean {
    const deviceInfo = this.getDeviceInfo();

    // Check basic requirements
    if (!deviceInfo.supportsWeb3 && deviceInfo.type === 'desktop') {
      return false;
    }

    // All devices can potentially connect with proper wallet
    return true;
  }

  getCompatibilityScore(): number {
    const deviceInfo = this.getDeviceInfo();
    let score = 0;

    // Native Web3 support
    if (deviceInfo.supportsWeb3) score += 40;

    // Browser compatibility
    if (['Chrome', 'Firefox', 'Edge', 'Safari'].includes(deviceInfo.browser)) score += 20;

    // Operating system support
    if (['iOS', 'Android', 'Windows', 'MacOS'].includes(deviceInfo.os)) score += 20;

    // Wallet options available
    score += Math.min(deviceInfo.recommendedWallet.length * 5, 20);

    return Math.min(score, 100);
  }
}

// Singleton export
export default DeviceCompatibility.getInstance();

// Global type declarations
declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}