import React from 'react';

const Animations: React.FC = () => {
  return (
    <style>
      {`
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      @keyframes tilt {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(1deg); }
        75% { transform: rotate(-1deg); }
      }
      @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-float { animation: float 6s ease-in-out infinite; }
      .animate-tilt { animation: tilt 10s ease-in-out infinite; }
      .animate-slideIn { animation: slideIn 1s ease-out forwards; }
      .animate-fadeIn { animation: fadeIn 1s ease-out forwards; }
      .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      .animate-spin-slow { animation: spin-slow 10s linear infinite; }
      `}
    </style>
  );
};

export default Animations; 