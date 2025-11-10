import React, { useState, useEffect, useCallback } from 'react';
import ContractService from '../services/ContractService';
import { ROUTES, MESSAGES } from '../utils/constants';

interface Candidate {
  id: number;
  name: string;
  voteCount?: number;
}

interface VotingPeriod {
  startTime: number;
  endTime: number;
  isActive: boolean;
}

const AdminDashboard: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votingPeriod, setVotingPeriod] = useState<VotingPeriod>({
    startTime: 0,
    endTime: 0,
    isActive: false
  });
  const [newCandidateName, setNewCandidateName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [winner, setWinner] = useState<string>('');

  const initializeDashboard = useCallback(async () => {
    try {
      // Connect wallet and check ownership
      const connectedAccount = await ContractService.connectWallet();
      if (!connectedAccount) {
        setError(MESSAGES.WALLET_NOT_CONNECTED);
        setLoading(false);
        return;
      }

      setAccount(connectedAccount);

      const ownerStatus = await ContractService.isOwner();
      if (!ownerStatus) {
        setError(MESSAGES.NOT_ADMIN);
        setLoading(false);
        return;
      }

      setIsOwner(true);
      await loadData();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setError('Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const loadData = async () => {
    try {
      const candidatesData = await ContractService.getCandidates();
      const candidatesList: Candidate[] = candidatesData.ids.map((id: number, index: number) => ({
        id,
        name: candidatesData.names[index]
      }));
      setCandidates(candidatesList);

      const votingPeriodData = await ContractService.getVotingPeriod();
      setVotingPeriod(votingPeriodData);

      // Set datetime-local inputs from voting period
      if (votingPeriodData.startTime > 0) {
        setStartTime(new Date(votingPeriodData.startTime * 1000).toISOString().slice(0, 16));
        setEndTime(new Date(votingPeriodData.endTime * 1000).toISOString().slice(0, 16));
      }

      // Check if voting has ended to show winner
      if (votingPeriodData.endTime > 0 && Date.now() > votingPeriodData.endTime * 1000) {
        const winnerData = await ContractService.getWinner();
        setWinner(winnerData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load contract data');
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) {
      setError('Candidate name cannot be empty');
      return;
    }

    try {
      setMessage('Adding candidate...');
      setError('');
      await ContractService.addCandidate(newCandidateName.trim());
      setNewCandidateName('');
      setMessage(`Candidate "${newCandidateName}" added successfully!`);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to add candidate:', error);
      setError(error.message || 'Failed to add candidate');
      setMessage('');
    }
  };

  const handleRemoveCandidate = async (candidateId: number, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${candidateName}"?`)) {
      return;
    }

    try {
      setMessage('Removing candidate...');
      setError('');
      await ContractService.removeCandidate(candidateId);
      setMessage(`Candidate "${candidateName}" removed successfully!`);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to remove candidate:', error);
      setError(error.message || 'Failed to remove candidate');
      setMessage('');
    }
  };

  const handleSetVotingPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      return;
    }

    // Convert inputs to seconds
    let s = Math.floor(new Date(startTime).getTime() / 1000);
    let eSec = Math.floor(new Date(endTime).getTime() / 1000);

    if (eSec <= s) {
      setError('End time must be after start time');
      return;
    }

    try {
      setMessage('Setting voting period...');
      setError('');

      // Align with chain time and enforce small buffer for immediate testing
      const chainNow = await ContractService.getCurrentBlockTimestamp();
      const minStart = chainNow + 60; // at least 1 minute from now
      if (s < minStart) s = minStart;

      const minDuration = 60; // allow 1 minute duration for quick testing
      if (eSec <= s + minDuration) eSec = s + minDuration;

      await ContractService.setVotingPeriod(s, eSec);
      setMessage('Voting period set successfully!');
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to set voting period:', error);
      setError(error.message || 'Failed to set voting period');
      setMessage('');
    }
  };

  const handleClearVotingPeriod = async () => {
    try {
      setMessage('Clearing voting period...');
      setError('');
      await (ContractService as any).clearVotingPeriod?.();
      setMessage('Voting period cleared');
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to clear voting period:', error);
      setError(error.message || 'Failed to clear voting period');
      setMessage('');
    }
  };

  const loadResults = async () => {
    try {
      const resultsData = await ContractService.getResults();
      const candidatesWithVotes: Candidate[] = resultsData.ids.map((id: number, index: number) => ({
        id,
        name: resultsData.names[index],
        voteCount: resultsData.votes[index]
      }));
      setCandidates(candidatesWithVotes);
    } catch (error) {
      console.error('Failed to load results:', error);
      setError('Failed to load voting results');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!votingPeriod.endTime) return '';
    const now = Math.floor(Date.now() / 1000);
    const remaining = votingPeriod.endTime - now;

    if (remaining <= 0) return 'Voting ended';

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <h2>Initializing Admin Dashboard...</h2>
          <p>Please connect your MetaMask wallet</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <a href={ROUTES.HOME} style={styles.link}>Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        <header style={styles.header}>
          <h1>Admin Dashboard</h1>
          <div style={styles.walletInfo}>
            <span>Connected: {formatAddress(account)}</span>
            <a href={ROUTES.HOME} style={styles.link}>Logout</a>
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

        <div style={styles.grid}>
          {/* Candidate Management */}
          <div style={styles.card}>
            <h2>Candidate Management</h2>
            <form onSubmit={handleAddCandidate} style={styles.form}>
              <label htmlFor="candidateName" style={{ display: 'none' }}>Candidate Name</label>
              <input
                id="candidateName"
                type="text"
                placeholder="Enter candidate name"
                title="Candidate name"
                aria-label="Candidate name"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                style={styles.input}
                disabled={votingPeriod.isActive}
              />
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={votingPeriod.isActive}
              >
                Add Candidate
              </button>
            </form>

            <div style={styles.candidateList}>
              {candidates.length === 0 ? (
                <p style={styles.emptyMessage}>No candidates added yet</p>
              ) : (
                candidates.map((candidate) => (
                  <div key={candidate.id} style={styles.candidateItem}>
                    <span>
                      {candidate.name}
                      {candidate.voteCount !== undefined && (
                        <span style={styles.voteCount}> - {candidate.voteCount} votes</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleRemoveCandidate(candidate.id, candidate.name)}
                      style={styles.dangerButton}
                      disabled={votingPeriod.isActive}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Voting Period Settings */}
          <div style={styles.card}>
            <h2>Voting Period Settings</h2>
            <form onSubmit={handleSetVotingPeriod} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="votingStart">Start Time:</label>
                <input
                  id="votingStart"
                  type="datetime-local"
                  title="Voting start time"
                  aria-label="Voting start time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={styles.input}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="votingEnd">End Time:</label>
                <input
                  id="votingEnd"
                  type="datetime-local"
                  title="Voting end time"
                  aria-label="Voting end time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={styles.input}
                  min={startTime}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button type="submit" style={styles.primaryButton}>
                  Set Voting Period
                </button>
                <button type="button" style={styles.secondaryButton} onClick={handleClearVotingPeriod}>
                  Clear Voting Period
                </button>
              </div>
            </form>

            {votingPeriod.startTime > 0 && (
              <div style={styles.periodInfo}>
                <h3>Current Voting Period</h3>
                <p><strong>Start:</strong> {formatTimestamp(votingPeriod.startTime)}</p>
                <p><strong>End:</strong> {formatTimestamp(votingPeriod.endTime)}</p>
                <p><strong>Status:</strong>
                  <span style={{
                    color: votingPeriod.isActive ? '#27ae60' : '#e74c3c',
                    fontWeight: 'bold'
                  }}>
                    {votingPeriod.isActive ? ' Active' : ' Inactive'}
                  </span>
                </p>
                {votingPeriod.isActive && (
                  <p><strong>Time Remaining:</strong> {getTimeRemaining()}</p>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div style={styles.card}>
            <h2>Voting Results</h2>
            <button onClick={loadResults} style={styles.secondaryButton}>
              Load Results
            </button>

            {winner && winner !== 'No candidates' && (
              <div style={styles.winnerAnnouncement}>
                <h3>🎉 Winner: {winner} 🎉</h3>
              </div>
            )}

            {candidates.some(c => c.voteCount !== undefined) ? (
              <div style={styles.resultsList}>
                {candidates
                  .filter(c => c.voteCount !== undefined)
                  .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                  .map((candidate) => (
                    <div key={candidate.id} style={styles.resultItem}>
                      <span>{candidate.name}</span>
                      <span style={styles.voteCount}>{candidate.voteCount} votes</span>
                    </div>
                  ))
                }
              </div>
            ) : (
              <p style={styles.emptyMessage}>Click "Load Results" to view voting statistics</p>
            )}
          </div>

          {/* Contract Info */}
          <div style={styles.card}>
            <h2>Contract Information</h2>
            <p><strong>Address:</strong> {ContractService.getContractAddress()}</p>
            <p><strong>Network:</strong> Local Ganache (Chain ID: 1337)</p>
            <p><strong>Candidates:</strong> {candidates.length}</p>
            <p><strong>Status:</strong>
              <span style={{ color: '#27ae60', fontWeight: 'bold' }}> Connected</span>
            </p>
          </div>
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
  dashboard: {
    maxWidth: '1200px',
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
  errorBox: {
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
    gap: '20px'
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 'bold'
  },
  successMessage: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb'
  },
  errorMessage: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  form: {
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '10px'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.2s'
  },
  secondaryButton: {
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '20px',
    transition: 'all 0.2s'
  },
  dangerButton: {
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  candidateList: {
    maxHeight: '200px',
    overflowY: 'auto'
  },
  candidateItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #eee'
  },
  voteCount: {
    color: '#667eea',
    fontWeight: 'bold'
  },
  emptyMessage: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '20px'
  },
  periodInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '15px'
  },
  winnerAnnouncement: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    margin: '20px 0'
  },
  resultsList: {
    marginTop: '20px'
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '8px'
  }
};

export default AdminDashboard;