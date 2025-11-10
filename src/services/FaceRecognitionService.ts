import * as faceapi from 'face-api.js';
import { APP_CONFIG } from '../utils/constants';

interface VoterData {
  voterId: string;
  faceDescriptor: Float32Array;
  registrationDate: number;
}

class FaceRecognitionService {
  private isInitialized = false;

  private modelsLoaded = false;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor() {
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      // Load face-api.js models
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);

      this.modelsLoaded = true;
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Failed to load face recognition models:', error);
    }
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.videoElement = videoElement;

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      videoElement.srcObject = this.stream;

      // Wait for video to be ready
      return new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          this.isInitialized = true;
          resolve(true);
        };

        videoElement.onerror = () => {
          reject(new Error('Failed to load video stream'));
        };
      });
    } catch (error) {
      console.error('Failed to start camera:', error);
      return false;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.isInitialized = false;
  }

  async detectFace(): Promise<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection; }> | null> {
    if (!this.isInitialized || !this.videoElement || !this.modelsLoaded) {
      return null;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      return detection ?? null;
    } catch (error) {
      console.error('Face detection failed:', error);
      return null;
    }
  }

  async getFaceDescriptor(): Promise<Float32Array | null> {
    if (!this.isInitialized || !this.videoElement || !this.modelsLoaded) {
      return null;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        return detection.descriptor;
      }
      return null;
    } catch (error) {
      console.error('Failed to get face descriptor:', error);
      return null;
    }
  }

  async captureFacePhotos(photoCount: number = 3): Promise<Float32Array[]> {
    const descriptors: Float32Array[] = [];

    for (let i = 0; i < photoCount; i++) {
      // Wait a bit between captures
      await new Promise(resolve => setTimeout(resolve, 1000));

      const descriptor = await this.getFaceDescriptor();
      if (descriptor) {
        descriptors.push(descriptor);
      } else {
        throw new Error(`Failed to capture face photo ${i + 1}`);
      }
    }

    return descriptors;
  }

  async registerVoter(descriptors: Float32Array[]): Promise<string> {
    try {
      // Generate unique voter ID
      const voterId = this.generateVoterId();

      // Average the descriptors to create a more stable representation
      const averagedDescriptor = this.averageDescriptors(descriptors);

      // Store voter data in IndexedDB
      await this.storeVoterData({
        voterId,
        faceDescriptor: averagedDescriptor,
        registrationDate: Date.now()
      });

      return voterId;
    } catch (error) {
      console.error('Failed to register voter:', error);
      throw error;
    }
  }

  async authenticateVoter(): Promise<string | null> {
    try {
      // Get current face descriptor
      const currentDescriptor = await this.getFaceDescriptor();
      if (!currentDescriptor) {
        return null;
      }

      // Get all registered voters
      const registeredVoters = await this.getAllVoters();

      // Find best match
      let bestMatch: VoterData | null = null;
      let bestDistance = APP_CONFIG.FACE_MATCH_THRESHOLD; // Threshold for face matching

      for (const voter of registeredVoters) {
        const distance = faceapi.euclideanDistance(currentDescriptor, voter.faceDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = voter;
        }
      }

      return bestMatch ? bestMatch.voterId : null;
    } catch (error) {
      console.error('Failed to authenticate voter:', error);
      return null;
    }
  }

  private generateVoterId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private averageDescriptors(descriptors: Float32Array[]): Float32Array {
    if (descriptors.length === 0) {
      throw new Error('No descriptors to average');
    }

    const descriptorLength = descriptors[0].length;
    const averaged = new Float32Array(descriptorLength);

    for (let i = 0; i < descriptorLength; i++) {
      let sum = 0;
      for (const descriptor of descriptors) {
        sum += descriptor[i];
      }
      averaged[i] = sum / descriptors.length;
    }

    return averaged;
  }

  // IndexedDB operations
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VotingFaceDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('voters')) {
          const store = db.createObjectStore('voters', { keyPath: 'voterId' });
          store.createIndex('registrationDate', 'registrationDate', { unique: false });
        }
      };
    });
  }

  private async storeVoterData(voterData: VoterData): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['voters'], 'readwrite');
      const store = transaction.objectStore('voters');
      const request = store.put(voterData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getAllVoters(): Promise<VoterData[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['voters'], 'readonly');
      const store = transaction.objectStore('voters');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getVoterById(voterId: string): Promise<VoterData | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['voters'], 'readonly');
      const store = transaction.objectStore('voters');
      const request = store.get(voterId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async clearAllVoters(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['voters'], 'readwrite');
      const store = transaction.objectStore('voters');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Check if user is already registered
  async getRegisteredVoterId(): Promise<string | null> {
    try {
      const voters = await this.getAllVoters();
      if (voters.length > 0) {
        // Return the most recently registered voter
        const sortedVoters = voters.sort((a, b) => b.registrationDate - a.registrationDate);
        return sortedVoters[0].voterId;
      }
      return null;
    } catch (error) {
      console.error('Failed to get registered voter ID:', error);
      return null;
    }
  }

  isReady(): boolean {
    return this.modelsLoaded;
  }
}

export default new FaceRecognitionService();