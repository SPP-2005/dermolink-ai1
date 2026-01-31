import React, { useState } from 'react';
import { UserRole } from './types';
import PatientInterface from './components/PatientInterface';
import DoctorInterface from './components/DoctorInterface';
import { Stethoscope, User, ArrowRight, Shield, Lock, KeyRound } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  
  // Auth States
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientOtpSent, setPatientOtpSent] = useState(false);
  const [patientOtp, setPatientOtp] = useState('');
  const [isPatientAuth, setIsPatientAuth] = useState(false);

  const [doctorPass, setDoctorPass] = useState('');
  const [isDoctorAuth, setIsDoctorAuth] = useState(false);

  // Handlers
  const handlePatientLogin = () => {
    if (!patientIdInput.trim()) {
      alert("Please enter your Patient ID");
      return;
    }
    if (!patientOtpSent) {
      setPatientOtpSent(true);
      setTimeout(() => alert("Your OTP is: 1234"), 500); // Simulation
    } else {
      if (patientOtp === '1234') {
        setIsPatientAuth(true);
      } else {
        alert("Invalid OTP");
      }
    }
  };

  const handleDoctorLogin = () => {
    if (doctorPass.length > 3) {
      // Simulate simple auth check
      setIsDoctorAuth(true);
    } else {
      alert("Please enter a valid password (min 4 chars)");
    }
  };

  const handleLogout = () => {
    setRole(UserRole.NONE);
    setIsPatientAuth(false);
    setIsDoctorAuth(false);
    setPatientOtpSent(false);
    setPatientOtp('');
    setDoctorPass('');
    setPatientIdInput('');
  };

  // Render Interfaces
  if (role === UserRole.PATIENT && isPatientAuth) {
    return <PatientInterface onLogout={handleLogout} patientId={patientIdInput} />;
  }

  if (role === UserRole.DOCTOR && isDoctorAuth) {
    return <DoctorInterface onLogout={handleLogout} />;
  }

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
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col justify-center space-y-8 min-h-[400px]">
          {role === UserRole.NONE ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 text-center">Choose Portal</h2>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setRole(UserRole.PATIENT)}
                  className="group relative p-6 rounded-2xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Patient Access</h3>
                    <p className="text-sm text-slate-500">Track progress & adherence</p>
                  </div>
                  <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-teal-500" />
                </button>

                <button 
                  onClick={() => setRole(UserRole.DOCTOR)}
                  className="group relative p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Doctor Dashboard</h3>
                    <p className="text-sm text-slate-500">AI Analytics & Prescriptions</p>
                  </div>
                  <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                </button>
              </div>
            </>
          ) : role === UserRole.PATIENT ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Secure Patient Login</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {patientOtpSent ? "Enter the code sent to your device." : "Verify your identity to continue."}
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
                </div>
              )}
              
              <button onClick={handleLogout} className="w-full text-slate-400 text-sm hover:text-slate-600">Back</button>
            </div>
          ) : role === UserRole.DOCTOR ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Doctor Access</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your credentials to access the clinical dashboard.
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
              
              <button onClick={handleLogout} className="w-full text-slate-400 text-sm hover:text-slate-600">Back</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default App;