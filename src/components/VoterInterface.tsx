import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ContractService from '../services/ContractService';
import { ROUTES, MESSAGES } from '../utils/constants';

interface Candidate {
  id: number;
  name: string;
}

interface VotingPeriod {
  startTime: number;
  endTime: number;
  isActive: boolean;
}

const VoterInterface: React.FC = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votingPeriod, setVotingPeriod] = useState<VotingPeriod>({
    startTime: 0,
    endTime: 0,
    isActive: false
  });
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [account, setAccount] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [winner, setWinner] = useState<string>('');
  const [tieNames, setTieNames] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [chainNow, setChainNow] = useState<number>(0);
  const [lastVotedRound, setLastVotedRound] = useState<number>(0);

  const loadData = useCallback(async (addressOverride?: string) => {
    try {
      const voterAddress = addressOverride ?? account;
      const [candidatesData, votingPeriodData] = await Promise.all([
        ContractService.getCandidates(),
        ContractService.getVotingPeriod(),
      ]);

      setCandidates(
        candidatesData.ids.map((id: number, index: number) => ({
          id,
          name: candidatesData.names[index],
        }))
      );

      // Compute active using system time to avoid idle-chain skew
      const nowSys = Math.floor(Date.now() / 1000);
      const activeNow =
        votingPeriodData.startTime > 0 &&
        nowSys >= votingPeriodData.startTime &&
        nowSys < votingPeriodData.endTime;
      setVotingPeriod({ ...votingPeriodData, isActive: activeNow });

      let currentRound = 0;
      try {
        currentRound = await ContractService.getCurrentElectionRound();
      } catch (roundErr) {
        console.warn('Failed to fetch current election round:', roundErr);
      }

      if (voterAddress) {
        try {
          const [legacyHasVoted, lastRound] = await Promise.all([
            ContractService.hasVoted(voterAddress),
            ContractService.getLastVotedRound(voterAddress),
          ]);
          const lastRoundNum = Number(lastRound) || 0;
          setLastVotedRound(lastRoundNum);
          const votedThisRound = legacyHasVoted && lastRoundNum === currentRound;
          setHasVoted(votedThisRound);
        } catch (voteErr) {
          console.warn('Unable to determine voter status:', voteErr);
          setHasVoted(false);
          setLastVotedRound(0);
        }
      } else {
        setHasVoted(false);
        setLastVotedRound(0);
      }

      // Check if voting has ended using chain time
      try {
        const now = await ContractService.getCurrentBlockTimestamp();
        if (votingPeriodData.endTime > 0 && now >= votingPeriodData.endTime) {
          try {
            const multi = await ContractService.getWinners();
            if (multi && multi.names && multi.names.length > 1) {
              setWinner('');
              setTieNames(multi.names);
            } else if (multi && multi.names && multi.names.length === 1) {
              setWinner(multi.names[0]);
              setTieNames([]);
            } else {
              const singleWinner = await ContractService.getWinner();
              setWinner(singleWinner);
              setTieNames([]);
            }
          } catch (inner) {
            console.error('Failed to retrieve winners:', inner);
          }
        } else {
          setWinner('');
          setTieNames([]);
        }
      } catch (timeErr) {
        console.error('Failed to verify voting end time:', timeErr);
      }
    } catch (error) {
      console.error('Failed to load voting data:', error);
      setError('Failed to load voting data');
    }
  }, [account]);

  useEffect(() => {
    initializeVoterInterface();
  }, []);

  useEffect(() => {
    if (votingPeriod.endTime > 0) {
      const timer = setInterval(() => {
        updateTimeRemaining();
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [votingPeriod]);

  useEffect(() => {
    if (votingPeriod.startTime > 0) {
      setHasVoted(false);
      setWinner('');
      setTieNames([]);
    }
  }, [votingPeriod.startTime]);

  useEffect(() => {
    const eth: any = (window as any).ethereum;
    if (!eth) return;

    const onAccounts = async (accounts: string[]) => {
      try {
        const acc = accounts && accounts.length ? accounts[0] : '';
        setAccount(acc);
        await loadData();
        const voted = await ContractService.hasVoted(acc);
        setHasVoted(voted);
      } catch (e) {
        console.error('accountsChanged handler failed', e);
      }
    };
    const onChain = async () => {
      try {
        await loadData();
      } catch(e) { console.error('chainChanged handler failed', e); }
    };

    eth.on?.('accountsChanged', onAccounts);
    eth.on?.('chainChanged', onChain);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts);
      eth.removeListener?.('chainChanged', onChain);
    };
  }, []);

  useEffect(() => {
    let id: any;
    const tick = async () => {
      try {
        const vp = await ContractService.getVotingPeriod();
        const nowSys = Math.floor(Date.now() / 1000);
        const active = vp.startTime > 0 && nowSys >= vp.startTime && nowSys < vp.endTime;
        setVotingPeriod({ ...vp, isActive: active });
      } catch (e) {
        // ignore
      }
    };
    id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  const initializeVoterInterface = async () => {
    try {
      const voterId = localStorage.getItem('blockdface_voter_id');
      if (!voterId) {
        navigate(ROUTES.HOME);
        return;
      }

      let connectedAccount = '';
      try {
        connectedAccount = (await ContractService.connectWallet()) || '';
      } catch {
        connectedAccount = '';
      }
      if (!connectedAccount) {
        setMessage(MESSAGES.WALLET_NOT_CONNECTED);
      } else {
        setAccount(connectedAccount);
      }

      await loadData();

      const voted = await ContractService.hasVoted();
      setHasVoted(voted);
    } catch (error) {
      console.error('Failed to initialize voter interface:', error);
      setError('Failed to initialize voting interface');
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = async () => {
    if (!votingPeriod.endTime) return;

    // Use system time for UI; tx mining will advance chain time
    const now = Math.floor(Date.now() / 1000);
    setChainNow(now);

    // Flip active state when crossing boundaries
    if (
      votingPeriod.startTime > 0 &&
      now >= votingPeriod.startTime &&
      now < votingPeriod.endTime &&
      !votingPeriod.isActive
    ) {
      setVotingPeriod(prev => ({ ...prev, isActive: true }));
    }
    if (votingPeriod.endTime > 0 && now >= votingPeriod.endTime) {
      if (votingPeriod.isActive) setVotingPeriod(prev => ({ ...prev, isActive: false }));
      setTimeRemaining('Voting has ended');
      if (!winner) {
        loadWinner();
      }
      return;
    }

    const remaining = votingPeriod.endTime - now;
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${seconds}s`);
    }
  };

  const loadWinner = async () => {
    try {
      const winnerData = await ContractService.getWinner();
      setWinner(winnerData);
      try {
        const multi = await ContractService.getWinners();
        if (multi && multi.names && multi.names.length > 1) {
          setTieNames(multi.names);
        } else {
          setTieNames([]);
        }
      } catch { /* ignore */ }
    } catch (error) {
      console.error('Failed to load winner:', error);
    }
  };

  useEffect(() => {
    let retries = 0;
    let interval: any;
    const shouldRetry = (w: string) => !w || w === 'No candidates' || w === 'No winner';

    const kick = async () => {
      try {
        await loadWinner();
        retries++;
        if (retries > 10) return; // stop after ~10 seconds
        // If still placeholder, try again shortly to allow final block/state to settle
        setTimeout(() => {
          if (shouldRetry(winner)) kick();
        }, 1000);
      } catch {}
    };

    if (!loading) {
      const show = !votingPeriod.isActive && votingPeriod.endTime > 0 && chainNow > 0 && chainNow >= votingPeriod.endTime;
      if (show && shouldRetry(winner)) {
        kick();
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, chainNow, votingPeriod.isActive, votingPeriod.endTime]);

  const handleVote = async () => {
    if (selectedCandidate === null) {
      setError('Please select a candidate before voting');
      return;
    }

    try {
      setVoting(true);
      setMessage('Casting your vote...');
      setError('');

      if (!account) {
        const acc = await ContractService.connectWallet();
        if (!acc) {
          setError(MESSAGES.WALLET_NOT_CONNECTED);
          setVoting(false);
          return;
        }
        setAccount(acc);
      }

      const transactionHash = await ContractService.vote(selectedCandidate);

      setMessage(`Vote cast successfully! Transaction: ${transactionHash}`);
      setHasVoted(true);

      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Failed to vote:', error);
      setError(error.message || 'Failed to cast vote');
      setMessage('');
    } finally {
      setVoting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('blockdface_voter_id');
    navigate(ROUTES.HOME);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <h2>Loading Voting Interface...</h2>
          <p>Preparing your secure voting experience</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.votingBox}>
        <header style={styles.header}>
          <h1>🗳️ Voting Portal</h1>
          <div style={styles.walletInfo}>
            <span>Wallet: {account ? formatAddress(account) : 'Not connected'}</span>
            {!account ? (
              <button onClick={async ()=>{ try{ const acc = await ContractService.connectWallet(); if (acc) setAccount(acc);} catch(e:any){ setError(e?.message || 'Failed to connect wallet'); } }} style={styles.disconnectButton}>
                Connect MetaMask
              </button>
            ) : (
              <button onClick={handleDisconnect} style={styles.disconnectButton}>
                Disconnect
              </button>
            )}
          </div>
        </header>

        {message && (
          <div style={styles.successMessage}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Voting Status */}
        <div style={styles.statusCard}>
          <h2>Voting Status</h2>

          {votingPeriod.startTime > 0 ? (
            <>
              <p><strong>Start:</strong> {formatTimestamp(votingPeriod.startTime)}</p>
              <p><strong>End:</strong> {formatTimestamp(votingPeriod.endTime)}</p>
              <p><strong>Status:</strong>
                <span style={{
                  color: votingPeriod.isActive ? '#27ae60' : '#e74c3c',
                  fontWeight: 'bold',
                  marginLeft: '10px'
                }}>
                  {votingPeriod.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </p>

              {votingPeriod.isActive && (
                <div style={styles.countdown}>
                  <h3>⏰ Time Remaining</h3>
                  <div style={styles.timeDisplay}>{timeRemaining}</div>
                </div>
              )}

              {!votingPeriod.isActive && votingPeriod.endTime > 0 && chainNow > 0 && chainNow < votingPeriod.startTime && (
                <p style={styles.notStartedMessage}>
                  📅 Voting has not started yet
                </p>
              )}

              {!votingPeriod.isActive && votingPeriod.endTime > 0 && chainNow > 0 && chainNow >= votingPeriod.endTime && (
                <p style={styles.endedMessage}>
                  🏁 Voting has ended
                </p>
              )}
            </>
          ) : (
            <p style={styles.notStartedMessage}>
              ⏳ Voting period has not been set yet
            </p>
          )}
        </div>

        {/* Tie banner for users (no full results) */}
        {!votingPeriod.isActive && votingPeriod.endTime > 0 && chainNow > 0 && chainNow >= votingPeriod.endTime && tieNames.length > 1 && (
          <div style={styles.resultsCard}>
            <h3 style={{ margin: 0 }}>Tied: {tieNames.join(', ')}</h3>
          </div>
        )}

        {/* Voting Interface */}
        <div style={styles.votingCard}>
          <h2>Cast Your Vote</h2>

          {hasVoted ? (
            <div style={styles.alreadyVoted}>
              <h3>✅ Vote Recorded</h3>
              <p>You have successfully cast your vote. Thank you for participating!</p>
              {votingPeriod.isActive && (
                <p>Results will be announced after the voting period ends.</p>
              )}
            </div>
          ) : (
            <>
              {votingPeriod.startTime > 0 && !votingPeriod.isActive && (
                <div style={styles.notActive}>
                  {chainNow > 0 && chainNow < votingPeriod.startTime ? (
                    <p>Voting has not started yet. You can see candidates below.</p>
                  ) : (
                    <p>Voting has ended. You can still view candidates below.</p>
                  )}
                </div>
              )}

              {candidates.length === 0 ? (
                <p style={styles.noCandidates}>
                  No candidates available for this election.
                </p>
              ) : (
                <>
                  <div style={styles.candidatesList}>
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        style={{
                          ...styles.candidateOption,
                          ...(selectedCandidate === candidate.id ? styles.selectedCandidate : {})
                        }}
                        onClick={() => setSelectedCandidate(candidate.id)}
                      >
                        <div style={styles.candidateInfo}>
                          <div style={styles.radioButton}>
                            {selectedCandidate === candidate.id && (
                              <div style={styles.radioButtonSelected}></div>
                            )}
                          </div>
                          <span style={styles.candidateName}>{candidate.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleVote}
                    style={{
                      ...styles.voteButton,
                      ...((selectedCandidate === null || voting || !votingPeriod.isActive) ? styles.voteButtonDisabled : {})
                    }}
                    disabled={selectedCandidate === null || voting || !votingPeriod.isActive}
                  >
                    {voting ? 'Casting Vote...' : (votingPeriod.isActive ? 'Cast Vote' : 'Vote when Active')}
                  </button>

                  <p style={styles.disclaimer}>
                    ⚠️ Your vote can be cast only during the active period and each wallet can vote once.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {/* Contract Info */}
        <div style={styles.infoCard}>
          <h3>Secure Voting Information</h3>
          <p>• Your vote is anonymous and recorded on the blockchain</p>
          <p>• Each wallet can vote only once per election</p>
          <p>• All transactions are transparent and verifiable</p>
          <p>• Results are automatically calculated when voting ends</p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  votingBox: {
    maxWidth: '800px',
    margin: '0 auto',
    color: '#333'
  },
  loadingBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '60px',
    textAlign: 'center' as const,
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  walletInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  disconnectButton: {
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  successMessage: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb',
    textAlign: 'center' as const
  },
  errorMessage: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
    textAlign: 'center' as const
  },
  statusCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  countdown: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    marginTop: '15px'
  },
  timeDisplay: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '10px 0'
  },
  resultsCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  winnerAnnouncement: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    padding: '30px',
    borderRadius: '15px',
    textAlign: 'center' as const
  },
  confetti: {
    fontSize: '2rem',
    marginTop: '15px'
  },
  votingCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  alreadyVoted: {
    textAlign: 'center' as const,
    padding: '40px',
    background: '#d4edda',
    borderRadius: '10px',
    border: '2px solid #c3e6cb'
  },
  notActive: {
    textAlign: 'center' as const,
    padding: '40px',
    background: '#fff3cd',
    borderRadius: '10px',
    border: '2px solid #ffeaa7'
  },
  notStartedMessage: {
    color: '#f39c12',
    textAlign: 'center' as const,
    fontSize: '1.1rem',
    margin: '20px 0'
  },
  endedMessage: {
    color: '#e74c3c',
    textAlign: 'center' as const,
    fontSize: '1.1rem',
    margin: '20px 0'
  },
  noCandidates: {
    textAlign: 'center' as const,
    color: '#666',
    fontStyle: 'italic',
    padding: '20px'
  },
  candidatesList: {
    marginBottom: '25px'
  },
  candidateOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    margin: '10px 0',
    border: '2px solid #e1e8ed',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  selectedCandidate: {
    borderColor: '#667eea',
    background: '#f8f9ff'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  radioButton: {
    width: '20px',
    height: '20px',
    border: '2px solid #667eea',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioButtonSelected: {
    width: '12px',
    height: '12px',
    background: '#667eea',
    borderRadius: '50%'
  },
  candidateName: {
    fontSize: '1.1rem',
    fontWeight: '500'
  },
  voteButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 40px',
    borderRadius: '25px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.2s'
  },
  voteButtonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed'
  },
  disclaimer: {
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '0.9rem',
    marginTop: '20px',
    fontStyle: 'italic'
  },
  infoCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  }
};

export default VoterInterface;