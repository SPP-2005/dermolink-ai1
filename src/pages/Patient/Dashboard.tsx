import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Camera, Send, ShieldCheck, Activity, Calendar,
  UploadCloud, AlertCircle, CheckCircle, Clock, X, Info, AlertTriangle, LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chatWithMedicalBot, fileToGenerativePart, verifySkinPhoto } from '../../services/geminiService';
import { getPatient, addHistoryEntry } from '../../services/storageService';
import { Message, AppNotification, HistoryEntry } from '../../types';

const MOCK_DATA = [
  { day: 'Mon', score: 7 },
  { day: 'Tue', score: 6.5 },
  { day: 'Wed', score: 6 },
  { day: 'Thu', score: 5 },
  { day: 'Fri', score: 4.5 },
  { day: 'Sat', score: 4 },
  { day: 'Sun', score: 3.5 },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: '1', type: 'reminder', title: 'Medication Due', message: 'Time to apply your topical cream.', timestamp: new Date(Date.now() - 1000 * 60 * 30), read: false },
  { id: '2', type: 'info', title: 'Dr. Miller', message: 'Updated your care plan.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), read: true },
];

interface PatientInterfaceProps {
  onLogout: () => void;
  patientId: string;
}

const PatientInterface: React.FC<PatientInterfaceProps> = ({ onLogout, patientId }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  const [alarmActive, setAlarmActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Hello! I'm DermoBot. How is your skin feeling today? Any new symptoms?", timestamp: new Date() }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [patientName, setPatientName] = useState('Patient');

  // Storage State
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load Patient Data dynamically based on ID
  useEffect(() => {
    const patientData = getPatient(patientId);
    if (patientData) {
      setHistory(patientData.history);
      setPatientName(patientData.name);
    } else {
      // Fallback or empty state if ID not found (e.g. wrong ID entered)
      console.warn(`Patient ID ${patientId} not found`);
    }
  }, [patientId]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate Smart Alarm triggering
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlarmActive(true);
      // Also add a notification for the alarm
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        type: 'alert',
        title: 'Missed Check-in',
        message: 'Please complete your daily scan to silence the alarm.',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }, 5000); // Triggers 5s after load for demo
    return () => clearTimeout(timer);
  }, []);

  // Simulate incoming appointment reminder
  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotif: AppNotification = {
        id: 'appointment-' + Date.now(),
        type: 'info',
        title: 'Upcoming Appointment',
        message: 'Video consultation tomorrow at 10:00 AM.',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMsg.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputMsg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const responseText = await chatWithMedicalBot(history, userMsg.text);

    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "I'm currently offline.", timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await fileToGenerativePart(file);
      const isValid = await verifySkinPhoto(base64);

      if (isValid) {
        // SAVE TO BACKEND
        const newEntry: HistoryEntry = {
          date: new Date().toISOString().split('T')[0],
          imageUrl: `data:image/jpeg;base64,${base64}`,
          notes: 'Self-reported progress photo',
          severityScore: 0,
        };

        addHistoryEntry(patientId, newEntry);
        setHistory(prev => [newEntry, ...prev]);
      } else {
        alert("The AI could not verify this as a skin photo. Please try again with a clearer image.");
      }
    } catch (error) {
      console.error(error);
      alert("Error verifying image.");
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleAlarmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await fileToGenerativePart(file);
      const isValid = await verifySkinPhoto(base64);

      if (isValid) {
        setAlarmActive(false);

        // SAVE TO BACKEND
        const newEntry: HistoryEntry = {
          date: new Date().toISOString().split('T')[0],
          imageUrl: `data:image/jpeg;base64,${base64}`,
          notes: 'Medication Adherence Check-in (Smart Alarm)',
          severityScore: 0, // Not applicable for simple adherence check
        };

        addHistoryEntry(patientId, newEntry);
        setHistory(prev => [newEntry, ...prev]);

        alert("Medication adherence recorded! Alarm disabled.");
      } else {
        alert("That doesn't look like a skin photo. Please upload a valid photo to turn off the alarm.");
      }
    } catch (error) {
      console.error(error);
      alert("Error verifying image.");
    } finally {
      setUploading(false);
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 relative">
      {/* Smart Alarm Overlay */}
      {alarmActive && (
        <div className="fixed inset-0 z-50 bg-red-600/90 backdrop-blur-sm flex items-center justify-center p-4 animate-pulse">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-10 h-10 text-red-600 animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Medication Time!</h2>
            <p className="text-slate-600">
              The Smart Alarm is active. To turn it off and record your adherence, please take a clear photo of your treated area.
            </p>

            <div className="pt-4">
              <label className="cursor-pointer bg-slate-900 text-white hover:bg-slate-800 transition-colors py-4 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold text-lg shadow-lg">
                {uploading ? (
                  <span>Verifying Photo...</span>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span>Upload Proof to Dismiss</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAlarmUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold">D</div>
            <h1 className="font-bold text-xl text-slate-800">DermoLink <span className="text-teal-500 font-light">Patient</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Connection</span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors relative"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-teal-600 font-medium hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}>
                          <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'alert' ? 'bg-red-100 text-red-600' :
                              n.type === 'info' ? 'bg-blue-100 text-blue-600' :
                                n.type === 'reminder' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {n.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> :
                              n.type === 'info' ? <Info className="w-4 h-4" /> :
                                n.type === 'reminder' ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
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

            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-500 text-lg">
              {patientName.charAt(0)}
            </div>

            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors md:hidden"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-2 text-slate-500 hover:text-red-600 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        {/* Navigation Tabs (Mobile mostly) */}
        <div className="flex md:hidden bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
          >
            AI Assistant
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dashboard Column */}
          <div className={`md:col-span-2 space-y-6 ${activeTab === 'chat' ? 'hidden md:block' : ''}`}>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-teal-600 mb-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-semibold text-sm">Improvement</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">85%</div>
                <div className="text-xs text-slate-500">Last 7 days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold text-sm">Streak</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">12 Days</div>
                <div className="text-xs text-slate-500">Medication Adherence</div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hidden sm:block">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold text-sm">Next Dose</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">8:00 PM</div>
                <div className="text-xs text-slate-500">Topical Cream</div>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-lg text-slate-800 mb-6">Lesion Severity Tracking</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={3} dot={{ fill: '#0d9488', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Medical Log (Updated with detailed list) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-800">Medical Log</h3>
                <label className={`flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span>{uploading ? 'Analyzing...' : 'Add Photo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleManualUpload} disabled={uploading} />
                </label>
              </div>
              <div className="space-y-4">
                {history.length > 0 ? history.map((entry, index) => (
                  <div key={index} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-200">
                      <img src={entry.imageUrl} alt="Lesion" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-bold text-slate-900">{entry.date}</div>
                        <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                          <Activity className="w-3 h-3" />
                          <span>Score: {entry.severityScore > 0 ? `${entry.severityScore}/10` : 'Check-in'}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{entry.notes}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No medical history recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Column */}
          <div className={`md:col-span-1 flex flex-col h-[calc(100vh-8rem)] md:h-[600px] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${activeTab === 'dashboard' ? 'hidden md:flex' : ''}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="font-semibold text-slate-800">DermoBot AI</h3>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Personal Assistant</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${m.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
                    }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-none p-3 shadow-sm border border-slate-100">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMsg.trim() || isTyping}
                  className="bg-teal-600 text-white p-2 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientInterface;