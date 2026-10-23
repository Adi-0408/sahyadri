import React from 'react';
import { Download, Smartphone, Star, ShieldCheck, Zap } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        {/* App Logo / Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center shadow-xl mb-4 border border-slate-700">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Sahyadri Lands</h2>
        <p className="text-slate-500 font-medium text-sm mb-4">India's Premium Real Estate App</p>

        {/* App Info Badges */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex flex-col items-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Version</span>
            <span className="text-sm font-bold text-slate-700">1.0.4</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col items-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Size</span>
            <span className="text-sm font-bold text-slate-700">65 MB</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col items-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 flex-row gap-1">
            <span className="text-sm font-bold text-slate-700">4.9</span>
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>

        {/* Features List */}
        <div className="w-full text-left space-y-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Key Features</h4>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-1.5 rounded-full">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Instant Property Search</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">100% Verified Listings</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-1.5 rounded-full">
              <Smartphone className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Easy to use Interface</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="primary" 
          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-0.5"
          onClick={() => {
            // Replace with actual APK download link
            window.location.href = '#download-apk';
          }}
        >
          <Download className="w-5 h-5" />
          Download APK Now
        </Button>
        <p className="text-[10px] text-slate-400 font-medium mt-3 text-center">
          By downloading, you agree to our Terms of Service & Privacy Policy.
        </p>
      </div>
    </Dialog>
  );
};
