import { PatientRecord, HistoryEntry } from '../types';

const STORAGE_KEY = 'DERMOLINK_PATIENTS_V1';

const SEED_DATA: PatientRecord[] = [
  { 
    id: '1', 
    name: 'Alice Johnson', 
    age: 34, 
    condition: 'Melanocytic Nevus', 
    lastUpdate: '2 days ago',
    status: 'Stable', 
    img: 'https://picsum.photos/400/400?random=1',
    history: [
       {
        date: '2024-05-15',
        imageUrl: 'https://picsum.photos/150/150?random=101',
        notes: 'Lesion shows slight redness, but no significant increase in size. Continuing topical application recommended.',
        severityScore: 4
      },
      {
        date: '2024-05-12',
        imageUrl: 'https://picsum.photos/150/150?random=102',
        notes: 'Initial scan after medication change. Edges appear well-defined compared to previous week.',
        severityScore: 5
      }
    ]
  },
  { 
    id: '2', 
    name: 'Robert Smith', 
    age: 52, 
    condition: 'Basal Cell Carcinoma', 
    lastUpdate: 'Yesterday',
    status: 'Critical', 
    img: 'https://picsum.photos/400/400?random=2',
    history: []
  },
  { 
    id: '3', 
    name: 'Maria Garcia', 
    age: 28, 
    condition: 'Eczema', 
    lastUpdate: '1 week ago',
    status: 'Improving', 
    img: 'https://picsum.photos/400/400?random=3',
    history: []
  },
];

export const getPatients = (): PatientRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  return JSON.parse(stored);
};

export const getPatient = (id: string): PatientRecord | undefined => {
  const patients = getPatients();
  return patients.find(p => p.id === id);
};

export const addPatient = (patient: Omit<PatientRecord, 'id' | 'history'>): PatientRecord => {
  const patients = getPatients();
  const newPatient: PatientRecord = {
    ...patient,
    id: Date.now().toString(),
    history: []
  };
  patients.unshift(newPatient); // Add to top
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  return newPatient;
};

export const addHistoryEntry = (patientId: string, entry: HistoryEntry) => {
  const patients = getPatients();
  const index = patients.findIndex(p => p.id === patientId);
  if (index !== -1) {
    patients[index].history.unshift(entry);
    // Update last status based on entry
    patients[index].lastUpdate = 'Just now';
    if (entry.severityScore > 7) patients[index].status = 'Critical';
    else if (entry.severityScore > 4) patients[index].status = 'Stable';
    else patients[index].status = 'Improving';
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }
};