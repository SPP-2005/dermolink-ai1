export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  NONE = 'NONE'
}

export interface User {
  id: string;
  email: string;
  password: string; // In a real app, this would be hashed
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PatientRecord {
  id: string; // Links to User.id
  name: string;
  age: number;
  condition: string;
  lastUpdate: string;
  status: 'Critical' | 'Stable' | 'Improving' | 'New';
  img: string; // Profile/Reference Image
  history: HistoryEntry[];
  messages?: Message[]; // Chat history
}

export interface HistoryEntry {
  date: string;
  imageUrl: string;
  processedImageUrl?: string;
  notes: string;
  severityScore: number;
  analysisResult?: AnalysisResult;
}

export interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  severity: string;
  probabilities: Record<string, number>;
  recommendations: string[];
  features: string[];
}

export interface AppNotification {
  id: string;
  type: 'alert' | 'info' | 'reminder' | 'message';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}