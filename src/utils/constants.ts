export const APP_CONFIG = {
  CONTRACT_ADDRESS: process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  NETWORK_ID: 1337, // Ganache local network
  GAS_LIMIT: 200000,
  FACE_MATCH_THRESHOLD: 0.6,
  FACE_PHOTOS_REQUIRED: 3,
  VOTING_PERIOD_MIN_DURATION: 3600, // 1 hour in seconds
};

export const ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  VOTE: '/vote',
};

export const MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your MetaMask wallet',
  NOT_ADMIN: 'Only admin can access this page',
  FACE_NOT_RECOGNIZED: 'Face not recognized. Please try again.',
  ALREADY_VOTED: 'You have already voted',
  VOTING_NOT_STARTED: 'Voting has not started yet',
  VOTING_ENDED: 'Voting has ended',
  NO_CANDIDATES: 'No candidates available',
  CAMERA_ACCESS_DENIED: 'Camera access denied. Please allow camera access to continue.',
  METAMASK_NOT_INSTALLED: 'MetaMask is not installed. Please install MetaMask to continue.',
};

export const STORAGE_KEYS = {
  VOTER_ID: 'blockdface_voter_id',
  ADMIN_SESSION: 'blockdface_admin_session',
  LAST_VOTE_CHECK: 'blockdface_last_vote_check',
};