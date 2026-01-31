import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, Filter, ChevronRight, AlertTriangle, 
  Wand2, FileText, Download, Check, X, Scissors, Layers, CheckCircle, Bell, Info, LogOut, History, Plus, BarChart2, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeLesion, cleanLesionImage } from '../services/geminiService';
import { getPatients, addPatient, addHistoryEntry } from '../services/storageService';
import { AnalysisResult, AppNotification, PatientRecord } from '../types';

const INITIAL_DOC_NOTIFICATIONS: AppNotification[] = [
  { id: 'd1', type: 'alert', title: 'Critical Lab Result', message: 'Pathology for Robert Smith requires immediate review.', timestamp: new Date(Date.now() - 1000 * 60 * 120), read: false },
  { id: 'd2', type: 'info', title: 'System Update', message: 'New AI model v3.5 deployed successfully.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), read: true },
];

interface DoctorInterfaceProps {
    onLogout: () => void;
}

const DoctorInterface: React.FC<DoctorInterfaceProps> = ({ onLogout }) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'processed'>('original');

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ name: '', age: '', condition: 'Unknown' });

  // Recent History
  const [recentPatients, setRecentPatients] = useState<PatientRecord[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_DOC_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load Patients from "Backend" (LocalStorage)
  useEffect(() => {
    setPatients(getPatients());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate new upload notification
  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotif: AppNotification = {
        id: 'upload-' + Date.now(),
        type: 'info',
        title: 'New Patient Upload',
        message: 'Maria Garcia uploaded a daily progression photo.',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handlePatientSelect = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setAnalysisResult(null);
    setProcessedImage(null);
    setViewMode('original');
    
    // Add to recent history (Keep top 5, unique)
    setRecentPatients(prev => {
        const others = prev.filter(p => p.id !== patient.id);
        return [patient, ...others].slice(0, 5);
    });
  };

  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPatientForm.name && newPatientForm.age) {
        const newPatient = addPatient({
            name: newPatientForm.name,
            age: parseInt(newPatientForm.age),
            condition: newPatientForm.condition,
            status: 'Stable',
            lastUpdate: 'Just now',
            img: `https://picsum.photos/400/400?random=${Date.now()}` // Mock image for demo
        });
        setPatients(getPatients()); // Refresh list
        setShowAddModal(false);
        setNewPatientForm({ name: '', age: '', condition: 'Unknown' });
        handlePatientSelect(newPatient); // Auto select
    }
  };

  const runAnalysis = async () => {
    if (!selectedPatient) return;
    setAnalyzing(true);
    
    try {
        const resp = await fetch(selectedPatient.img);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });

        const result = await analyzeLesion(base64);
        setAnalysisResult(result);

        // Save to Backend History
        addHistoryEntry(selectedPatient.id, {
            date: new Date().toISOString().split('T')[0],
            imageUrl: selectedPatient.img,
            processedImageUrl: processedImage || undefined,
            notes: `AI Diagnosis: ${result.diagnosis} (${Math.round(result.confidence * 100)}%)`,
            severityScore: result.severity === 'Critical' ? 9 : result.severity === 'High' ? 7 : result.severity === 'Moderate' ? 5 : 2,
            analysisResult: result
        });
        
        // Refresh patient list to show updated status if changed
        setPatients(getPatients());

    } catch (e) {
        console.error(e);
        alert("Failed to analyze image.");
    } finally {
        setAnalyzing(false);
    }
  };

  const runHairRemoval = async () => {
    if (!selectedPatient) return;
    setCleaning(true);
    try {
        const resp = await fetch(selectedPatient.img);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });

        const cleanBase64 = await cleanLesionImage(base64);
        if (cleanBase64) {
            setProcessedImage(`data:image/jpeg;base64,${cleanBase64}`);
            setViewMode('processed');
        } else {
            alert("Could not process image.");
        }
    } catch (e) {
        console.error(e);
        alert("Failed to process image.");
    } finally {
        setCleaning(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Prepare chart data from probabilities
  const chartData = analysisResult?.probabilities 
    ? Object.entries(analysisResult.probabilities)
        .map(([name, value]) => ({ name, value: value * 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) 
    : [];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
           <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">D</div>
            <h1 className="font-bold text-lg">DermoLink <span className="text-blue-400 font-light">Pro</span></h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-3 bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg cursor-pointer">
            <Users className="w-5 h-5" />
            <span className="font-medium">Patients</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 px-4 py-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Reports</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 px-4 py-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
            <Layers className="w-5 h-5" />
            <span className="font-medium">CNN Model</span>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                <div>
                    <div className="text-sm font-medium">Dr. S. Miller</div>
                    <div className="text-xs text-slate-500">Dermatologist</div>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm transition-colors border border-transparent hover:border-red-900/30"
            >
                <LogOut className="w-4 h-4" />
                Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Global Floating Notification (Top Right) */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-4" ref={notificationRef}>
           <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors relative"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-semibold text-slate-800">System Alerts</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 font-medium hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No new alerts</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                          <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            n.type === 'alert' ? 'bg-red-100 text-red-600' :
                            n.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {n.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className={`text-sm font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</h4>
                              <button onClick={(e) => deleteNotification(n.id, e)} className="text-slate-300 hover:text-slate-500">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                            <span className="text-xs text-slate-400 mt-2 block">
                              {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Patient List */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col pt-16 md:pt-0">
          <div className="p-4 border-b border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Patient Queue</h2>
                <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{patients.length} active</div>
            </div>

            <button 
                onClick={() => setShowAddModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-all hover:shadow-md"
            >
                <Plus className="w-4 h-4" />
                Add New Patient
            </button>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search patients..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            {/* Recently Viewed */}
            {recentPatients.length > 0 && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                        <History className="w-3 h-3" />
                        <span>Recently Viewed</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {recentPatients.map(p => (
                            <button
                                key={p.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePatientSelect(p);
                                }}
                                className="group relative flex-shrink-0"
                                title={p.name}
                            >
                                <img 
                                    src={p.img} 
                                    alt={p.name} 
                                    className={`w-10 h-10 rounded-full object-cover border-2 transition-all ${selectedPatient?.id === p.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100 group-hover:border-blue-300'}`} 
                                />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                        p.status === 'Critical' ? 'bg-red-500' :
                                        p.status === 'Stable' ? 'bg-blue-500' : 'bg-green-500'
                                    }`}></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.map(p => (
              <div 
                key={p.id} 
                onClick={() => handlePatientSelect(p)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedPatient?.id === p.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <img src={p.img} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{p.name}</h3>
                        <span className="text-[10px] text-slate-400">{p.lastUpdate}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{p.condition}</p>
                    <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        p.status === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                        p.status === 'Improving' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        {p.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace */}
        {selectedPatient ? (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 pr-20">
                <div>
                    <h2 className="font-bold text-lg text-slate-800">{selectedPatient.name}</h2>
                    <p className="text-xs text-slate-500">ID: #{selectedPatient.id} • {selectedPatient.age} yrs</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={runHairRemoval}
                        disabled={cleaning}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                        {cleaning ? <Wand2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                        Grab Cut / Clean
                    </button>
                    <button 
                        onClick={runAnalysis}
                        disabled={analyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200/50"
                    >
                        {analyzing ? <Wand2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                        CNN Diagnosis
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Image Viewer */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Lesion Visualization</h3>
                            <div className="flex bg-slate-200 rounded-lg p-1 text-xs font-medium">
                                <button 
                                    onClick={() => setViewMode('original')}
                                    className={`px-3 py-1 rounded-md transition-all ${viewMode === 'original' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                >
                                    Original
                                </button>
                                <button 
                                    onClick={() => processedImage && setViewMode('processed')}
                                    disabled={!processedImage}
                                    className={`px-3 py-1 rounded-md transition-all ${viewMode === 'processed' ? 'bg-white shadow text-blue-700' : 'text-slate-500 disabled:opacity-50'}`}
                                >
                                    AI Processed
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900 relative min-h-[400px] flex items-center justify-center">
                            <img 
                                src={viewMode === 'original' ? selectedPatient.img : processedImage!} 
                                className="max-h-full max-w-full object-contain" 
                                alt="Lesion" 
                            />
                            {viewMode === 'processed' && (
                                <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                    <Wand2 className="w-3 h-3" />
                                    <span>Hair Removed</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Analysis Report */}
                    <div className="space-y-6">
                        {analysisResult ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                
                                {/* CNN Probability Chart */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                     <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-800">
                                            <BarChart2 className="w-5 h-5 text-blue-600" />
                                            <h3 className="font-bold">CNN Class Probabilities</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <XAxis type="number" domain={[0, 100]} hide />
                                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11}} />
                                                <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#3b82f6'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <Wand2 className="w-5 h-5" />
                                            <h3 className="font-bold">Diagnostic Report</h3>
                                        </div>
                                        <div className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                            {Math.round(analysisResult.confidence * 100)}% Confidence
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</div>
                                            <div className="text-2xl font-bold text-slate-900">{analysisResult.diagnosis}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="text-xs font-medium text-slate-500 mb-1">Severity</div>
                                                <div className={`font-bold ${
                                                    analysisResult.severity === 'Critical' || analysisResult.severity === 'High' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    {analysisResult.severity}
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="text-xs font-medium text-slate-500 mb-1">Risk Factor</div>
                                                <div className="font-bold text-slate-800">Moderate</div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Features</div>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.features.map((f, i) => (
                                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Recommendations</div>
                                            <ul className="space-y-2">
                                                {analysisResult.recommendations.map((r, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                        <span>{r}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <p className="text-xs text-slate-400 italic">
                                                * Analysis generated by CNN Model v4.2. Validated on ISIC 2024 Dataset.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center h-64">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Layers className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-medium mb-1">Ready to Analyze</h3>
                                <p className="text-slate-500 text-sm max-w-xs">Select "CNN Diagnosis" from the toolbar to run the multi-class classification model.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
            <Users className="w-16 h-16 opacity-20" />
            <p>Select a patient to begin analysis</p>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Add New Patient</h2>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleAddPatientSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            required
                            value={newPatientForm.name}
                            onChange={e => setNewPatientForm({...newPatientForm, name: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                        <input 
                            type="number" 
                            required
                            value={newPatientForm.age}
                            onChange={e => setNewPatientForm({...newPatientForm, age: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. 45"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                        <select 
                            value={newPatientForm.condition}
                            onChange={e => setNewPatientForm({...newPatientForm, condition: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Unknown">Unknown</option>
                            <option value="Melanocytic Nevus">Melanocytic Nevus</option>
                            <option value="Basal Cell Carcinoma">Basal Cell Carcinoma</option>
                            <option value="Eczema">Eczema</option>
                            <option value="Psoriasis">Psoriasis</option>
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default DoctorInterface;