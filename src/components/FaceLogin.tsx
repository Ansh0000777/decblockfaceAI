import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FaceRecognitionService from '../services/FaceRecognitionService';
import ContractService from '../services/ContractService';
import { STORAGE_KEYS, MESSAGES, APP_CONFIG } from '../utils/constants';

interface LoginState {
  isRegistering: boolean;
  isAuthenticating: boolean;
  cameraActive: boolean;
  message: string;
  voterId: string | null;
  photoCount: number;
  error: string | null;
}

const FaceLogin: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loginState, setLoginState] = useState<LoginState>({
    isRegistering: false,
    isAuthenticating: false,
    cameraActive: false,
    message: 'Welcome to BlockDFace Voting System',
    voterId: null,
    photoCount: 0,
    error: null
  });

  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    checkExistingRegistration();
    // Check if models are loaded periodically
    const modelCheckInterval = setInterval(() => {
      if (FaceRecognitionService.isReady()) {
        setModelsLoading(false);
        clearInterval(modelCheckInterval);
      }
    }, 1000);

    return () => {
      stopCamera();
      clearInterval(modelCheckInterval);
    };
  }, []);

  const checkExistingRegistration = async () => {
    try {
      const storedVoterId = localStorage.getItem(STORAGE_KEYS.VOTER_ID);
      if (storedVoterId) {
        const voterData = await FaceRecognitionService.getVoterById(storedVoterId);
        if (voterData) {
          setLoginState(prev => ({
            ...prev,
            voterId: storedVoterId,
            message: 'Welcome back! You can login with your face'
          }));
        }
      }
    } catch (error) {
      console.error('Error checking existing registration:', error);
    }
  };

  const startCamera = async (): Promise<boolean> => {
    if (!videoRef.current) {
      setLoginState(prev => ({ ...prev, error: 'Camera not available' }));
      return false;
    }

    try {
      const success = await FaceRecognitionService.startCamera(videoRef.current);
      if (success) {
        setLoginState(prev => ({
          ...prev,
          cameraActive: true,
          error: null
        }));
        return true;
      } else {
        setLoginState(prev => ({
          ...prev,
          error: MESSAGES.CAMERA_ACCESS_DENIED
        }));
        return false;
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setLoginState(prev => ({
        ...prev,
        error: 'Failed to start camera'
      }));
      return false;
    }
  };

  const stopCamera = () => {
    FaceRecognitionService.stopCamera();
    setLoginState(prev => ({ ...prev, cameraActive: false }));
  };

  const startRegistration = async () => {
    if (!await startCamera()) return;

    setLoginState(prev => ({
      ...prev,
      isRegistering: true,
      message: 'Position your face in the circle and get ready for photos',
      photoCount: 0,
      error: null
    }));
  };

  const captureFacePhotos = async () => {
    try {
      setLoginState(prev => ({
        ...prev,
        message: `Capturing face photo ${prev.photoCount + 1} of ${APP_CONFIG.FACE_PHOTOS_REQUIRED}...`,
        error: null
      }));

      const descriptors = await FaceRecognitionService.captureFacePhotos(APP_CONFIG.FACE_PHOTOS_REQUIRED);

      setLoginState(prev => ({
        ...prev,
        message: 'Processing your face data...',
        photoCount: APP_CONFIG.FACE_PHOTOS_REQUIRED
      }));

      const voterId = await FaceRecognitionService.registerVoter(descriptors);

      localStorage.setItem(STORAGE_KEYS.VOTER_ID, voterId);

      setLoginState(prev => ({
        ...prev,
        voterId,
        isRegistering: false,
        message: 'Registration successful! You can now login with your face.',
        photoCount: 0
      }));

      stopCamera();

    } catch (error) {
      console.error('Registration failed:', error);
      setLoginState(prev => ({
        ...prev,
        isRegistering: false,
        message: 'Registration failed. Please try again.',
        photoCount: 0,
        error: 'Failed to capture face properly. Please ensure good lighting and try again.'
      }));
      stopCamera();
    }
  };

  const startAuthentication = async () => {
    if (!await startCamera()) return;

    setLoginState(prev => ({
      ...prev,
      isAuthenticating: true,
      message: 'Position your face in the circle for authentication',
      error: null
    }));

    // Start face detection loop
    setTimeout(() => authenticateFace(), 2000);
  };

  const authenticateFace = async () => {
    try {
      const voterId = await FaceRecognitionService.authenticateVoter();

      if (voterId) {
        setLoginState(prev => ({
          ...prev,
          message: 'Face recognized! Connecting your wallet...',
          error: null
        }));

        // Connect wallet and redirect to voting
        await connectWalletAndRedirect(voterId);
      } else {
        setLoginState(prev => ({
          ...prev,
          message: MESSAGES.FACE_NOT_RECOGNIZED,
          error: 'Face not recognized. Please try again or register if you are a new user.'
        }));

        // Retry after 2 seconds
        if (loginState.isAuthenticating) {
          setTimeout(() => authenticateFace(), 2000);
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setLoginState(prev => ({
        ...prev,
        isAuthenticating: false,
        message: 'Authentication failed. Please try again.',
        error: 'Authentication error occurred.'
      }));
      stopCamera();
    }
  };

  const connectWalletAndRedirect = async (voterId: string) => {
    try {
      const account = await ContractService.connectWallet();

      if (account) {
        setLoginState(prev => ({
          ...prev,
          message: 'Wallet connected! Redirecting to voting...',
          isAuthenticating: false
        }));

        stopCamera();

        // Store session and redirect
        localStorage.setItem(STORAGE_KEYS.VOTER_ID, voterId);
        setTimeout(() => navigate('/vote'), 1500);
      } else {
        setLoginState(prev => ({
          ...prev,
          isAuthenticating: false,
          message: 'Wallet connection required',
          error: MESSAGES.WALLET_NOT_CONNECTED
        }));
        stopCamera();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setLoginState(prev => ({
        ...prev,
        isAuthenticating: false,
        message: 'Wallet connection failed',
        error: 'Failed to connect wallet. Please try again.'
      }));
      stopCamera();
    }
  };

  const cancelAction = () => {
    stopCamera();
    setLoginState(prev => ({
      ...prev,
      isRegistering: false,
      isAuthenticating: false,
      message: loginState.voterId ? 'Welcome back! You can login with your face' : 'Welcome to BlockDFace Voting System',
      photoCount: 0,
      error: null
    }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>BlockDFace Voting</h1>
        <p style={styles.subtitle}>Decentralized Voting with Face Authentication</p>

        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            style={styles.video}
            autoPlay
            playsInline
            muted
          />

          {!loginState.cameraActive && (
            <div style={styles.videoPlaceholder}>
              <div style={styles.cameraIcon}>📷</div>
              <p>Camera will appear here</p>
            </div>
          )}

          {loginState.cameraActive && (
            <div style={styles.faceOverlay}>
              <div style={styles.faceCircle}></div>
            </div>
          )}
        </div>

        <div style={styles.messageContainer}>
          <p style={styles.message}>{loginState.message}</p>
          {loginState.error && (
            <p style={styles.error}>{loginState.error}</p>
          )}
          {loginState.isRegistering && (
            <p style={styles.photoCounter}>
              Photo {loginState.photoCount} / {APP_CONFIG.FACE_PHOTOS_REQUIRED}
            </p>
          )}
        </div>

        <div style={styles.buttonContainer}>
          {!loginState.cameraActive && !loginState.isRegistering && !loginState.isAuthenticating && (
            <>
              {loginState.voterId ? (
                <button
                  style={styles.primaryButton}
                  onClick={startAuthentication}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? 'Loading Models...' : 'Login with Face'}
                </button>
              ) : (
                <>
                  <button
                    style={styles.primaryButton}
                    onClick={startRegistration}
                    disabled={modelsLoading}
                  >
                    {modelsLoading ? 'Loading Models...' : 'Register Face'}
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={startAuthentication}
                    disabled={modelsLoading}
                  >
                    {modelsLoading ? 'Loading Models...' : 'I\'m Already Registered'}
                  </button>
                </>
              )}
            </>
          )}

          {loginState.isRegistering && (
            <>
              <button
                style={styles.primaryButton}
                onClick={captureFacePhotos}
              >
                Start Face Capture
              </button>
              <button
                style={styles.secondaryButton}
                onClick={cancelAction}
              >
                Cancel
              </button>
            </>
          )}

          {loginState.isAuthenticating && (
            <button
              style={styles.secondaryButton}
              onClick={cancelAction}
            >
              Cancel Authentication
            </button>
          )}
        </div>

        <div style={styles.adminLink}>
          <a href="/admin" style={styles.link}>Admin Panel</a>
        </div>

        <div style={styles.privacyNotice}>
          <p style={styles.privacyText}>
            🔒 Your face data is processed locally and never leaves your device
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  loginBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center' as const
  },
  title: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  subtitle: {
    margin: '0 0 30px 0',
    color: '#666',
    fontSize: '1rem'
  },
  videoContainer: {
    position: 'relative' as const,
    width: '300px',
    height: '300px',
    margin: '0 auto 30px auto',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '4px solid #667eea'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa',
    color: '#666'
  },
  cameraIcon: {
    fontSize: '3rem',
    marginBottom: '10px'
  },
  faceOverlay: {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const
  },
  faceCircle: {
    width: '200px',
    height: '200px',
    border: '3px solid #4CAF50',
    borderRadius: '50%',
    boxShadow: '0 0 20px rgba(76, 175, 80, 0.5)'
  },
  messageContainer: {
    margin: '20px 0',
    minHeight: '60px'
  },
  message: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '1rem',
    lineHeight: '1.5'
  },
  error: {
    margin: '0 0 10px 0',
    color: '#e74c3c',
    fontSize: '0.9rem',
    backgroundColor: '#ffeaea',
    padding: '10px',
    borderRadius: '8px'
  },
  photoCounter: {
    margin: '0',
    color: '#667eea',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    margin: '20px 0'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '25px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  secondaryButton: {
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    padding: '15px 30px',
    borderRadius: '25px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  adminLink: {
    marginTop: '20px'
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '0.9rem'
  },
  privacyNotice: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  },
  privacyText: {
    margin: '0',
    color: '#666',
    fontSize: '0.8rem'
  }
};

export default FaceLogin;