import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Stethoscope, User, Shield, Lock, KeyRound } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Tab State: Default to PATIENT
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.PATIENT);

  // Auth States
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientOtpSent, setPatientOtpSent] = useState(false);
  const [patientOtp, setPatientOtp] = useState('');

  const [doctorPass, setDoctorPass] = useState('');

  // Handlers
  const handlePatientLogin = () => {
    if (!patientIdInput.trim()) {
      toast.error("Please enter your Patient ID");
      return;
    }
    if (!patientOtpSent) {
      setPatientOtpSent(true);
      setTimeout(() => toast.success("OTP sent! (Code: 1234)"), 500);
    } else {
      if (patientOtp === '1234') {
        login(UserRole.PATIENT, { patientId: patientIdInput });
        toast.success("Welcome back!");
        navigate('/patient/dashboard');
      } else {
        toast.error("Invalid OTP");
      }
    }
  };

  const handleDoctorLogin = () => {
    if (doctorPass.length > 3) {
      login(UserRole.DOCTOR, { name: "Dr. S. Miller" });
      toast.success("Welcome, Doctor.");
      navigate('/doctor/dashboard');
    } else {
      toast.error("Incorrect Password (min 4 chars)");
    }
  };

  const switchTab = (role: UserRole) => {
    setActiveTab(role);
    // Reset inputs on tab switch to avoid confusion
    setPatientOtpSent(false);
    setPatientOtp('');
    setDoctorPass('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl z-10 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Intro Section */}
        <div className="flex flex-col justify-center text-center md:text-left space-y-6">
          <div className="inline-flex items-center gap-2 self-center md:self-start bg-slate-800/50 backdrop-blur border border-slate-700 px-4 py-2 rounded-full">
            <Shield className="w-4 h-4 text-teal-400" />
            <span className="text-teal-400 text-xs font-bold tracking-wider">SECURE MEDICAL PLATFORM</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            DermoLink <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">AI</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Bridging the gap between home care and clinical expertise. The advanced standard for dermatological monitoring and diagnosis.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col min-h-[400px]">

          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex mb-8">
            <button
              onClick={() => switchTab(UserRole.PATIENT)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.PATIENT
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <User className="w-4 h-4" />
              Patient
            </button>
            <button
              onClick={() => switchTab(UserRole.DOCTOR)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.DOCTOR
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Stethoscope className="w-4 h-4" />
              Doctor
            </button>
          </div>

          {/* Patient Form */}
          {activeTab === UserRole.PATIENT && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Secure Patient Login</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {patientOtpSent ? "Enter the code sent to your device." : "Verify your identity."}
                </p>
              </div>

              {!patientOtpSent ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Patient ID (Try '1')"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handlePatientLogin}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center text-sm text-slate-500 mb-2">Patient ID: <span className="font-bold text-slate-800">{patientIdInput}</span></div>
                  <input
                    type="text"
                    placeholder="Enter OTP (1234)"
                    value={patientOtp}
                    onChange={(e) => setPatientOtp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center tracking-widest text-lg font-bold"
                  />
                  <button
                    onClick={handlePatientLogin}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Verify & Enter
                  </button>
                  <button onClick={() => setPatientOtpSent(false)} className="w-full text-teal-600 text-sm hover:underline">Change ID</button>
                </div>
              )}
            </div>
          )}

          {/* Doctor Form */}
          {activeTab === UserRole.DOCTOR && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Professional Access</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your credentials.
                </p>
              </div>

              <div className="space-y-4">
                <input type="text" placeholder="Doctor ID" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={doctorPass}
                  onChange={(e) => setDoctorPass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDoctorLogin()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleDoctorLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
                >
                  Access Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
