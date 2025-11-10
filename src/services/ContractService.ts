console.log("✅ Using ContractService.ts from:", __filename);

// src/services/ContractService.ts
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import DeviceCompatibility from '../utils/deviceCompatibility';

// ---------- ABI ----------
export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'candidateId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
    ],
    name: 'CandidateAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'candidateId', type: 'uint256' }],
    name: 'CandidateRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'candidateId', type: 'uint256' },
    ],
    name: 'VoteCast',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' },
    ],
    name: 'VotingPeriodSet',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'string', name: '_name', type: 'string' }],
    name: 'addCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_candidateId', type: 'uint256' }],
    name: 'removeCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_startTime', type: 'uint256' },
      { internalType: 'uint256', name: '_endTime', type: 'uint256' },
    ],
    name: 'setVotingPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_candidateId', type: 'uint256' }],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'clearVotingPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCandidateCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCandidates',
    outputs: [
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'string[]', name: '', type: 'string[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getResults',
    outputs: [
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'string[]', name: '', type: 'string[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVotingPeriod',
    outputs: [
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getWinner',
    outputs: [{ internalType: 'string', name: 'winnerName', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_voter', type: 'address' }],
    name: 'hasVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isVotingPeriodActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const satisfies ethers.InterfaceAbi;

// ---------- Types ----------
export interface WalletInfo {
  address: string;
  balance: string;
  chainId: string;
  networkName: string;
}

export type BrowserInfo = {
  supported: boolean;
  recommendation: string;
  browserName: string;
  deviceType: string;
  compatibilityScore: number;
};

// A typed shape for your contract so TS knows the functions exist.
interface VotingContract extends ethers.BaseContract {
  // write
  addCandidate(name: string): Promise<ethers.TransactionResponse>;
  removeCandidate(id: number | bigint): Promise<ethers.TransactionResponse>;
  setVotingPeriod(start: number | bigint, end: number | bigint): Promise<ethers.TransactionResponse>;
  clearVotingPeriod(): Promise<ethers.TransactionResponse>;
  vote(id: number | bigint): Promise<ethers.TransactionResponse>;
  // read
  owner(): Promise<string>;
  hasVoted(addr: string): Promise<boolean>;
  getCandidates(): Promise<[bigint[], string[]]>;
  getResults(): Promise<[bigint[], string[], bigint[]]>;
  getWinner(): Promise<string>;
  getVotingPeriod(): Promise<[bigint, bigint, boolean]>;
}

// ---------- Service ----------
class ContractService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: VotingContract | null = null;
  private contractAddress = '';
  private account = '';

  constructor() {
    void this.initializeProvider();
  }

  // ---------- Initialization ----------
  private async initializeProvider() {
    try {
      const detected = (await detectEthereumProvider({
        mustBeMetaMask: false,
        silent: true,
        timeout: 3000,
      })) as any | null;

      if (detected) {
        this.provider = new ethers.BrowserProvider(detected);
      } else {
        const rpcUrl = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
        console.warn('No injected provider detected; falling back to JSON-RPC at', rpcUrl);
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      }

      // Optional dev signer (bypass MetaMask for local writes)
      const useDev = (process.env.REACT_APP_USE_DEV_SIGNER || '').toLowerCase() === 'true';
      if (useDev) {
        try {
          const rpcUrl = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
          const pk =
            (process.env.REACT_APP_DEV_PRIVATE_KEY || process.env.ADMIN_OWNER_PRIVATE_KEY || '').trim();
          if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)) {
            const json = new ethers.JsonRpcProvider(rpcUrl);
            this.provider = json;
            const wallet = new ethers.Wallet(pk, json);
            this.signer = wallet;
            this.account = await wallet.getAddress();
            await this.loadContract();
            return;
          }
        } catch (e) {
          console.warn('Dev signer init failed, continuing with detected provider:', e);
        }
      }

      await this.loadContract();
    } catch (e) {
      console.error('initializeProvider failed:', e);
    }
  }

  private async loadContract() {
    try {
      // Try to read address from /public/contractInfo.json
      let address: string | undefined;
      try {
        const resp = await fetch('/contractInfo.json');
        if (resp.ok) {
          const data = await resp.json();
          address = data.address;
        }
      } catch {
        // ignore
      }

      this.contractAddress = address || process.env.REACT_APP_CONTRACT_ADDRESS || '';
      if (!this.contractAddress || !this.contractAddress.startsWith('0x') || this.contractAddress.length !== 42) {
        console.error('Contract address missing/invalid. Set public/contractInfo.json or REACT_APP_CONTRACT_ADDRESS.');
        this.contract = null;
        return;
      }

      const runner = (this.signer as ethers.Signer) || (this.provider as ethers.AbstractProvider);
      if (!runner) {
        this.contract = null;
        return;
      }

      // Verify bytecode exists
      try {
        const prov =
          (this.signer && (this.signer.provider as ethers.AbstractProvider | null)) || this.provider;
        if (prov?.getCode) {
          const code = await prov.getCode(this.contractAddress);
          if (!code || code === '0x') {
            console.error(
              'Configured contract address has no code on-chain. Update REACT_APP_CONTRACT_ADDRESS to the deployed contract.'
            );
            this.contract = null;
            return;
          }
        }
      } catch (e) {
        console.warn('Could not verify on-chain bytecode for contract address:', e);
      }

      // Create typed contract instance
      const base = new ethers.Contract(this.contractAddress, CONTRACT_ABI, runner);
      this.contract = base as unknown as VotingContract;
    } catch (e) {
      console.error('loadContract failed:', e);
      this.contract = null;
    }
  }

  // ---------- Wallet / Network ----------
  async connectWallet(): Promise<string | null> {
    try {
      // Always try to use MetaMask if it is present, even if a dev signer/JSON-RPC provider exists
      try {
        const detected: any = await detectEthereumProvider({ mustBeMetaMask: false, silent: true, timeout: 1500 });
        if (detected) {
          this.provider = new ethers.BrowserProvider(detected);
        } else if (!this.provider) {
          await this.initializeProvider();
        }
      } catch {
        if (!this.provider) await this.initializeProvider();
      }
      if (!this.provider) throw new Error('No Web3 provider available.');

      // Only BrowserProvider can request accounts
      if (this.provider instanceof ethers.BrowserProvider) {
        try {
          const accounts = await this.provider.send('eth_requestAccounts', []);
          if (!accounts || accounts.length === 0) throw new Error('No accounts found');
          this.account = accounts[0];
          this.signer = await this.provider.getSigner();

          // Ensure correct network if requested
          const targetChainId = Number(process.env.REACT_APP_CHAIN_ID || '1337');
          try {
            const net = await this.provider.getNetwork();
            if (Number(net.chainId) !== targetChainId) {
              const hexId = `0x${targetChainId.toString(16)}`;
              try {
                await this.provider.send('wallet_switchEthereumChain', [{ chainId: hexId }]);
              } catch (e: any) {
                if (e?.code === 4902) {
                  const rpcUrl = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
                  await this.provider.send('wallet_addEthereumChain', [
                    {
                      chainId: hexId,
                      chainName: 'Ganache Local',
                      rpcUrls: [rpcUrl],
                      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    },
                  ]);
                  await this.provider.send('wallet_switchEthereumChain', [{ chainId: hexId }]);
                } else {
                  throw e;
                }
              }
              // refresh signer post-switch
              this.signer = await this.provider.getSigner();
            }
          } catch (e) {
            console.warn('Network check/switch skipped or failed:', e);
          }

          await this.loadContract();
          return this.account;
        } catch (err: any) {
          if (err?.code === 4001) {
            throw new Error('User rejected the connection request. Please try again.');
          }
          if (err?.code === -32002) {
            throw new Error('Please check MetaMask for a pending connection request.');
          }
          throw new Error('Failed to connect wallet: ' + (err?.message || String(err)));
        }
      } else {
        // JsonRpcProvider only (e.g., dev signer path)
        if (!this.signer) throw new Error('Browser wallet not found. Please install MetaMask.');
        await this.loadContract();
        return this.account || (await this.signer.getAddress());
      }
    } catch (e: any) {
      console.error('connectWallet failed:', e);
      throw e;
    }
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    try {
      if (!this.provider || !this.account) return null;
      const bal = await this.provider.getBalance(this.account);
      const net = await this.provider.getNetwork();
      return {
        address: this.account,
        balance: ethers.formatEther(bal),
        chainId: net.chainId.toString(),
        networkName: net.name || 'Unknown',
      };
    } catch (e) {
      console.error('getWalletInfo failed:', e);
      return null;
    }
  }

  async getNetworkInfo(): Promise<{ chainId: string; name: string } | null> {
    try {
      if (!this.provider) return null;

      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId.toString(),
        name: network.name || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  async getCurrentBlockTimestamp(): Promise<number> {
    try {
      const prov: any = (this.signer && (this.signer as any).provider) || this.provider;
      if (!prov || !prov.getBlock) return Math.floor(Date.now() / 1000);
      const latest = await prov.getBlock('latest');
      const ts = latest?.timestamp ?? Math.floor(Date.now() / 1000);
      return typeof ts === 'bigint' ? Number(ts) : Number(ts);
    } catch (e) {
      console.warn('getCurrentBlockTimestamp fallback to system time:', e);
      return Math.floor(Date.now() / 1000);
    }
  }

  async switchNetwork(chainId: string): Promise<boolean> {
    try {
      if (!(this.provider instanceof ethers.BrowserProvider)) return false;
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${parseInt(chainId, 10).toString(16)}` },
      ]);
      return true;
    } catch (e: any) {
      console.error('switchNetwork failed:', e);
      if (e?.code === 4902) throw new Error('Network not found in MetaMask. Please add it manually.');
      return false;
    }
  }

  async addNetwork(networkConfig: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
  }): Promise<boolean> {
    try {
      if (!(this.provider instanceof ethers.BrowserProvider)) return false;
      await this.provider.send('wallet_addEthereumChain', [networkConfig]);
      return true;
    } catch (e) {
      console.error('addNetwork failed:', e);
      return false;
    }
  }

  // ---------- Permissions / Ownership ----------
  async isOwner(): Promise<boolean> {
    try {
      if (!this.account) return false;

      const override = (process.env.REACT_APP_ADMIN_OVERRIDE || '').toLowerCase() === 'true';
      if (override) return true;

      const list = (process.env.REACT_APP_ADMIN_ADDRESSES || '')
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);
      if (list.length > 0 && list.includes(this.account.toLowerCase())) return true;

      if (!this.contract) return false;
      const ownerAddr = await this.contract.owner();
      const acct = this.account.toLowerCase();
      return ownerAddr.toLowerCase() === acct;
    } catch (e) {
      console.error('isOwner failed:', e);
      return false;
    }
  }

  // ---------- Write functions ----------
  async addCandidate(name: string): Promise<string> {
    try {
      if (!this.contract && (this.signer || this.provider)) await this.loadContract();
      if (!this.contract || !this.signer) throw new Error('Contract not initialized or wallet not connected');

      const c = this.contract.connect(this.signer) as VotingContract;
      // Force legacy tx with safe gas settings for Ganache
      let gasLimit: bigint | undefined;
      try {
        const est = await ((c as any).addCandidate?.estimateGas?.(name));
        if (est) gasLimit = (BigInt(est) * 12n) / 10n; // +20%
      } catch {}
      const fee = await ((this.signer as any).provider?.getFeeData?.() ?? {});
      const minPriority = 1_000_000_000n; // 1 gwei
      const overrides: any = {};
      if (fee?.maxFeePerGas || fee?.maxPriorityFeePerGas) {
        let maxPriority: bigint = (fee?.maxPriorityFeePerGas as any) ?? minPriority;
        try { if (typeof maxPriority !== 'bigint') maxPriority = BigInt(maxPriority); } catch { maxPriority = minPriority; }
        if (maxPriority < minPriority) maxPriority = minPriority;
        let suggestedMax: bigint | undefined = fee?.maxFeePerGas as any;
        try { if (suggestedMax && typeof suggestedMax !== 'bigint') suggestedMax = BigInt(suggestedMax); } catch { suggestedMax = undefined; }
        const lastBase: bigint | undefined = (fee?.lastBaseFeePerGas as any) ?? undefined;
        let maxFee: bigint = suggestedMax ?? (lastBase ? (lastBase * 2n + maxPriority) : (3_000_000_000n));
        if (maxFee < (maxPriority + minPriority)) maxFee = maxPriority + minPriority; // ensure headroom
        overrides.maxFeePerGas = maxFee;
        overrides.maxPriorityFeePerGas = maxPriority;
      } else {
        let gasPrice: bigint = (fee?.gasPrice as any) ?? 2_000_000_000n; // 2 gwei fallback
        try { if (typeof gasPrice !== 'bigint') gasPrice = BigInt(gasPrice); } catch { gasPrice = 2_000_000_000n; }
        overrides.type = 0;
        overrides.gasPrice = gasPrice;
      }
      if (!gasLimit) gasLimit = 300_000n;
      overrides.gasLimit = gasLimit;
      const tx = await (c as any).addCandidate(name, overrides);
      const receipt = await tx.wait();
      return receipt?.hash ?? (() => { throw new Error('Transaction failed'); })();
    } catch (e: any) {
      console.error('addCandidate failed:', e);
      if (e?.code === 4001) throw new Error('Transaction rejected by user');
      if (e?.code === -32603) throw new Error('Insufficient funds for transaction');
      throw new Error('Failed to add candidate: ' + (e?.reason || e?.message || String(e)));
    }
  }

  async removeCandidate(candidateId: number): Promise<string> {
    try {
      if (!this.contract && (this.signer || this.provider)) await this.loadContract();
      if (!this.contract || !this.signer) throw new Error('Contract not initialized or wallet not connected');

      // sanity check bytecode
      const prov = (this.signer.provider as ethers.AbstractProvider) || this.provider;
      const code = prov && (await prov.getCode(this.contractAddress));
      if (!code || code === '0x') {
        throw new Error(
          'Configured address has no contract code. Set REACT_APP_CONTRACT_ADDRESS to the deployed VotingSystem address and restart the app.'
        );
      }

      const c = this.contract.connect(this.signer) as VotingContract;
      // Force legacy tx with safe gas settings for Ganache
      let gasLimit: bigint | undefined;
      try {
        const est = await ((c as any).removeCandidate?.estimateGas?.(candidateId));
        if (est) gasLimit = (BigInt(est) * 12n) / 10n;
      } catch {}
      const fee = await ((this.signer as any).provider?.getFeeData?.() ?? {});
      const minPriority = 1_000_000_000n;
      const overrides: any = {};
      if (fee?.maxFeePerGas || fee?.maxPriorityFeePerGas) {
        let maxPriority: bigint = (fee?.maxPriorityFeePerGas as any) ?? minPriority;
        try { if (typeof maxPriority !== 'bigint') maxPriority = BigInt(maxPriority); } catch { maxPriority = minPriority; }
        if (maxPriority < minPriority) maxPriority = minPriority;
        let suggestedMax: bigint | undefined = fee?.maxFeePerGas as any;
        try { if (suggestedMax && typeof suggestedMax !== 'bigint') suggestedMax = BigInt(suggestedMax); } catch { suggestedMax = undefined; }
        const lastBase: bigint | undefined = (fee?.lastBaseFeePerGas as any) ?? undefined;
        let maxFee: bigint = suggestedMax ?? (lastBase ? (lastBase * 2n + maxPriority) : (3_000_000_000n));
        if (maxFee < (maxPriority + minPriority)) maxFee = maxPriority + minPriority;
        overrides.maxFeePerGas = maxFee;
        overrides.maxPriorityFeePerGas = maxPriority;
      } else {
        let gasPrice: bigint = (fee?.gasPrice as any) ?? 2_000_000_000n;
        try { if (typeof gasPrice !== 'bigint') gasPrice = BigInt(gasPrice); } catch { gasPrice = 2_000_000_000n; }
        overrides.type = 0;
        overrides.gasPrice = gasPrice;
      }
      if (!gasLimit) gasLimit = 300_000n;
      overrides.gasLimit = gasLimit;
      const tx = await (c as any).removeCandidate(candidateId, overrides);
      const receipt = await tx.wait();
      return receipt?.hash ?? (() => { throw new Error('Transaction failed'); })();
    } catch (e: any) {
      console.error('removeCandidate failed:', e);
      if (e?.code === 4001) throw new Error('Transaction rejected by user');
      throw new Error('Failed to remove candidate: ' + (e?.reason || e?.message || String(e)));
    }
  }

  async setVotingPeriod(startTime: number, endTime: number): Promise<string> {
    try {
      if (!this.contract && (this.signer || this.provider)) await this.loadContract();
      if (!this.contract || !this.signer) throw new Error('Contract not initialized or wallet not connected');

      const prov = (this.signer.provider as ethers.AbstractProvider) || this.provider;
      const code = prov && (await prov.getCode(this.contractAddress));
      if (!code || code === '0x') {
        throw new Error(
          'Configured address has no contract code. Set REACT_APP_CONTRACT_ADDRESS to the deployed VotingSystem address and restart the app.'
        );
      }

      const c = this.contract.connect(this.signer) as VotingContract;
      // Force legacy tx with safe gas settings for Ganache
      let gasLimit: bigint | undefined;
      try {
        const est = await ((c as any).setVotingPeriod?.estimateGas?.(startTime, endTime));
        if (est) gasLimit = (BigInt(est) * 12n) / 10n;
      } catch {}
      const fee = await ((this.signer as any).provider?.getFeeData?.() ?? {});
      const minPriority = 1_000_000_000n;
      const overrides: any = {};
      if (fee?.maxFeePerGas || fee?.maxPriorityFeePerGas) {
        let maxPriority: bigint = (fee?.maxPriorityFeePerGas as any) ?? minPriority;
        try { if (typeof maxPriority !== 'bigint') maxPriority = BigInt(maxPriority); } catch { maxPriority = minPriority; }
        if (maxPriority < minPriority) maxPriority = minPriority;
        let suggestedMax: bigint | undefined = fee?.maxFeePerGas as any;
        try { if (suggestedMax && typeof suggestedMax !== 'bigint') suggestedMax = BigInt(suggestedMax); } catch { suggestedMax = undefined; }
        const lastBase: bigint | undefined = (fee?.lastBaseFeePerGas as any) ?? undefined;
        let maxFee: bigint = suggestedMax ?? (lastBase ? (lastBase * 2n + maxPriority) : (3_000_000_000n));
        if (maxFee < (maxPriority + minPriority)) maxFee = maxPriority + minPriority;
        overrides.maxFeePerGas = maxFee;
        overrides.maxPriorityFeePerGas = maxPriority;
      } else {
        let gasPrice: bigint = (fee?.gasPrice as any) ?? 2_000_000_000n;
        try { if (typeof gasPrice !== 'bigint') gasPrice = BigInt(gasPrice); } catch { gasPrice = 2_000_000_000n; }
        overrides.type = 0;
        overrides.gasPrice = gasPrice;
      }
      if (!gasLimit) gasLimit = 350_000n;
      overrides.gasLimit = gasLimit;
      const tx = await (c as any).setVotingPeriod(startTime, endTime, overrides);
      const receipt = await tx.wait();
      return receipt?.hash ?? (() => { throw new Error('Transaction failed'); })();
    } catch (e: any) {
      console.error('setVotingPeriod failed:', e);
      if (e?.code === 4001) throw new Error('Transaction rejected by user');
      throw new Error('Failed to set voting period: ' + (e?.reason || e?.message || String(e)));
    }
  }

  async vote(candidateId: number): Promise<string> {
    try {
      if (!this.contract && (this.signer || this.provider)) await this.loadContract();
      if (!this.contract) throw new Error('Contract not initialized');

      // Prefer MetaMask for voting so non-admin users see a wallet prompt
      let voteSigner: ethers.Signer | null = null;
      if (this.provider instanceof ethers.BrowserProvider) {
        // Ensure account is connected in MetaMask
        const accounts = await this.provider.send('eth_requestAccounts', []);
        if (!accounts || accounts.length === 0) throw new Error('No wallet accounts found');
        this.account = accounts[0];
        voteSigner = await this.provider.getSigner();
      } else if (this.signer) {
        // Fallback to whatever signer we have (e.g., dev signer in local RPC)
        voteSigner = this.signer;
      }

      if (!voteSigner) throw new Error('No signer available for voting');

      const prov = (voteSigner.provider as ethers.AbstractProvider) || this.provider;
      const code = prov && (await prov.getCode(this.contractAddress));
      if (!code || code === '0x') {
        throw new Error(
          'Configured address has no contract code. Set REACT_APP_CONTRACT_ADDRESS to the deployed VotingSystem address and restart the app.'
        );
      }

      const c = this.contract.connect(voteSigner) as VotingContract;

      // Preflight: catch certain permanent reverts only.
      // Do NOT block on "not active" because mining a tx advances Ganache time and the vote may succeed.
      try {
        if ((c as any).vote?.staticCall) {
          await (c as any).vote.staticCall(candidateId);
        }
      } catch (pre: any) {
        const msg = (pre?.reason || pre?.shortMessage || pre?.message || '').toLowerCase();
        if (msg.includes('already')) throw new Error('You have already voted');
        // If it looks like timing-related (not active/not started), continue to send tx so MetaMask pops
        if (msg.includes('not')) {
          // continue without throwing
        } else {
          // Unknown revert: surface but still allow sending? To be safe, throw here
          throw new Error('Vote preflight indicates revert: ' + (pre?.reason || pre?.shortMessage || pre?.message || 'Unknown'));
        }
      }

      // Gas/fees with Ganache-friendly fallbacks
      let gasLimit: bigint | undefined;
      try {
        const est = await ((c as any).vote?.estimateGas?.(candidateId));
        if (est) gasLimit = (BigInt(est) * 12n) / 10n;
      } catch {}

      const fd = await ((voteSigner as any).provider?.getFeeData?.() ?? {});
      const minPriority = 1_000_000_000n;
      const overrides: any = {};
      if (fd?.maxFeePerGas || fd?.maxPriorityFeePerGas) {
        let maxPriority: bigint = (fd?.maxPriorityFeePerGas as any) ?? minPriority;
        try { if (typeof maxPriority !== 'bigint') maxPriority = BigInt(maxPriority); } catch { maxPriority = minPriority; }
        if (maxPriority < minPriority) maxPriority = minPriority;
        let suggestedMax: bigint | undefined = fd?.maxFeePerGas as any;
        try { if (suggestedMax && typeof suggestedMax !== 'bigint') suggestedMax = BigInt(suggestedMax); } catch { suggestedMax = undefined; }
        const lastBase: bigint | undefined = (fd?.lastBaseFeePerGas as any) ?? undefined;
        let maxFee: bigint = suggestedMax ?? (lastBase ? (lastBase * 2n + maxPriority) : (3_000_000_000n));
        if (maxFee < (maxPriority + minPriority)) maxFee = maxPriority + minPriority;
        overrides.maxFeePerGas = maxFee;
        overrides.maxPriorityFeePerGas = maxPriority;
      } else {
        let gasPrice: bigint = (fd?.gasPrice as any) ?? 2_000_000_000n;
        try { if (typeof gasPrice !== 'bigint') gasPrice = BigInt(gasPrice); } catch { gasPrice = 2_000_000_000n; }
        overrides.type = 0;
        overrides.gasPrice = gasPrice;
      }
      if (!gasLimit) gasLimit = 200_000n;
      overrides.gasLimit = gasLimit;

      const tx = await (c as any).vote(candidateId, overrides);
      const receipt = await tx.wait();
      return receipt?.hash ?? (() => { throw new Error('Transaction failed'); })();
    } catch (e: any) {
      console.error('vote failed:', e);
      if (e?.code === 4001) throw new Error('Transaction rejected by user');
      const full = (e?.reason || e?.shortMessage || e?.message || '').toLowerCase();
      if (full.includes('already')) throw new Error('You have already voted');
      if (full.includes('not active') || full.includes('not started')) {
        throw new Error('Voting is not active yet. Try again in a second.');
      }
      throw new Error('Failed to vote: ' + (e?.reason || e?.shortMessage || e?.message || String(e)));
    }
  }

  async clearVotingPeriod(): Promise<string> {
    try {
      if (!this.contract && (this.signer || this.provider)) await this.loadContract();
      if (!this.contract || !this.signer) throw new Error('Contract not initialized or wallet not connected');

      const prov = (this.signer.provider as ethers.AbstractProvider) || this.provider;
      const code = prov && (await prov.getCode(this.contractAddress));
      if (!code || code === '0x') {
        throw new Error('Configured address has no contract code. Set REACT_APP_CONTRACT_ADDRESS to the deployed VotingSystem address and restart the app.');
      }

      // Authorization pre-check (owner or admin)
      const acct = (await this.signer.getAddress()).toLowerCase();
      let owner = '';
      let admin = '';
      try { owner = String(await (this.contract as any).owner()).toLowerCase(); } catch {}
      try { admin = String(await (this.contract as any).admin()).toLowerCase(); } catch {}
      if (owner && acct !== owner && admin && acct !== admin) {
        throw new Error('Only owner or admin can clear the voting period. Switch signer or set admin to your address.');
      }

      const c = this.contract.connect(this.signer) as VotingContract;

      // Preflight: static call to reveal reverts early
      try {
        if ((c as any).clearVotingPeriod?.staticCall) {
          await (c as any).clearVotingPeriod.staticCall();
        }
      } catch (pre: any) {
        const reason = pre?.reason || pre?.shortMessage || pre?.message || 'Unknown revert';
        throw new Error('Clear would revert: ' + reason + '. Ensure the contract address is correct and you are owner/admin.');
      }

      // Gas/fees
      let gasLimit: bigint | undefined;
      try {
        const est = await ((c as any).clearVotingPeriod?.estimateGas?.());
        if (est) gasLimit = (BigInt(est) * 12n) / 10n;
      } catch {}

      const fee = await ((this.signer as any).provider?.getFeeData?.() ?? {});
      const minPriority = 1_000_000_000n;
      const overrides: any = {};
      if (fee?.maxFeePerGas || fee?.maxPriorityFeePerGas) {
        let maxPriority: bigint = (fee?.maxPriorityFeePerGas as any) ?? minPriority;
        try { if (typeof maxPriority !== 'bigint') maxPriority = BigInt(maxPriority); } catch { maxPriority = minPriority; }
        if (maxPriority < minPriority) maxPriority = minPriority;
        let suggestedMax: bigint | undefined = fee?.maxFeePerGas as any;
        try { if (suggestedMax && typeof suggestedMax !== 'bigint') suggestedMax = BigInt(suggestedMax); } catch { suggestedMax = undefined; }
        const lastBase: bigint | undefined = (fee?.lastBaseFeePerGas as any) ?? undefined;
        let maxFee: bigint = suggestedMax ?? (lastBase ? (lastBase * 2n + maxPriority) : (3_000_000_000n));
        if (maxFee < (maxPriority + minPriority)) maxFee = maxPriority + minPriority;
        overrides.maxFeePerGas = maxFee;
        overrides.maxPriorityFeePerGas = maxPriority;
      } else {
        let gasPrice: bigint = (fee?.gasPrice as any) ?? 2_000_000_000n;
        try { if (typeof gasPrice !== 'bigint') gasPrice = BigInt(gasPrice); } catch { gasPrice = 2_000_000_000n; }
        overrides.type = 0;
        overrides.gasPrice = gasPrice;
      }
      if (!gasLimit) gasLimit = 200_000n;
      overrides.gasLimit = gasLimit;

      const tx = await (c as any).clearVotingPeriod(overrides);
      const receipt = await tx.wait();
      return receipt?.hash ?? (() => { throw new Error('Transaction failed'); })();
    } catch (e: any) {
      console.error('clearVotingPeriod failed:', e);
      if (e?.code === 4001) throw new Error('Transaction rejected by user');
      throw new Error('Failed to clear voting period: ' + (e?.reason || e?.shortMessage || e?.message || String(e)));
    }
  }

  // ---------- Read functions ----------
  async hasVoted(address?: string): Promise<boolean> {
    try {
      if (!this.contract) return false;
      const voter = address || this.account;
      if (!voter) return false;
      return await this.contract.hasVoted(voter);
    } catch (e) {
      console.error('hasVoted failed:', e);
      return false;
    }
  }

  async getCandidates(): Promise<{ ids: number[]; names: string[] }> {
    try {
      if (!this.contract) return { ids: [], names: [] };
      const [idsBig, names] = await this.contract.getCandidates();
      return { ids: idsBig.map((b) => Number(b)), names };
    } catch (e) {
      console.error('getCandidates failed:', e);
      return { ids: [], names: [] };
    }
  }

  async getResults(): Promise<{ ids: number[]; names: string[]; votes: number[] }> {
    try {
      if (!this.contract) return { ids: [], names: [], votes: [] };
      const [idsBig, names, votesBig] = await this.contract.getResults();
      return { ids: idsBig.map(Number), names, votes: votesBig.map(Number) };
    } catch (e) {
      console.error('getResults failed:', e);
      return { ids: [], names: [], votes: [] };
    }
  }

  async getWinner(): Promise<string> {
    try {
      if (!this.contract) return 'No candidates';
      const name = await this.contract.getWinner();
      if (typeof name === 'string' && name && name !== 'No candidates' && name !== 'No winner') {
        return name;
      }
      // Fallback to client-side compute
      const { names, votes } = await this.getResults();
      if (!names.length) return 'No candidates';
      let max = -1;
      let idx = -1;
      for (let i = 0; i < votes.length; i++) {
        if (votes[i] > max) { max = votes[i]; idx = i; }
      }
      if (idx < 0 || max <= 0) return 'No winner';
      return names[idx];
    } catch (e: any) {
      // If on-chain call reverted because voting not ended, still try computing from results
      try {
        const { names, votes } = await this.getResults();
        if (!names.length) return 'No candidates';
        let max = -1;
        let idx = -1;
        for (let i = 0; i < votes.length; i++) {
          if (votes[i] > max) { max = votes[i]; idx = i; }
        }
        if (idx < 0 || max <= 0) return 'No winner';
        return names[idx];
      } catch (inner) {
        console.error('getWinner fallback failed:', inner);
        return 'No candidates';
      }
    }
  }

  async getVotingPeriod(): Promise<{ startTime: number; endTime: number; isActive: boolean }> {
    try {
      if (!this.contract) return { startTime: 0, endTime: 0, isActive: false };
      const [start, end, active] = await this.contract.getVotingPeriod();
      return { startTime: Number(start), endTime: Number(end), isActive: active };
    } catch (e) {
      console.error('getVotingPeriod failed:', e);
      return { startTime: 0, endTime: 0, isActive: false };
    }
  }

  // ---------- Misc / Helpers ----------
  isReady(): boolean {
    return this.contract !== null && this.provider !== null;
  }

  isConnected(): boolean {
    return this.account !== '' && this.signer !== null;
  }

  getAccount(): string {
    return this.account;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  // Instance wrappers (your components can also use the statics)
  isWeb3Supported(): boolean {
    return ContractService.isWeb3Supported();
  }

  getBrowserInfo(): BrowserInfo {
    return ContractService.getBrowserInfo();
  }

  // ---------- Static utilities used by components ----------
  static isWeb3Supported(): boolean {
    return (
      typeof window !== 'undefined' &&
      (typeof (window as any).ethereum !== 'undefined' ||
        typeof (window as any).web3 !== 'undefined' ||
        /ethereum|web3/i.test(navigator.userAgent))
    );
  }

  static getBrowserInfo(): BrowserInfo {
    const deviceInfo = DeviceCompatibility.getDeviceInfo();
    const isCompatible = DeviceCompatibility.isCompatible();
    const compatibilityScore = DeviceCompatibility.getCompatibilityScore();
    const recommendation = isCompatible
      ? DeviceCompatibility.getConnectionInstructions()
      : 'Your device has limited Web3 support. Consider using a different browser or device.';

    return {
      supported: isCompatible && this.isWeb3Supported(),
      recommendation,
      browserName: deviceInfo.browser,
      deviceType: deviceInfo.type,
      compatibilityScore,
    };
  }
}

// global declaration
declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}

// Singleton instance for convenience
const __instance = new ContractService();
if (typeof window !== 'undefined') {
  (window as any).ContractService = __instance;
}

// Named + default exports
export { ContractService };
export type { VotingContract };
export default __instance;
