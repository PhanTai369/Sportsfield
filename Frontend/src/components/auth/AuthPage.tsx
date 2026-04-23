import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import LeftPanel from './LeftPanel';
import Animations from './Animations';
import { useAuth } from '../../contexts/authContext';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user is already logged in, redirect to home page
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  const handleSwitchToLogin = () => {
    setIsLogin(true);
  };
  
  const handleSwitchToRegister = () => {
    setIsLogin(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white">
      <Animations />
      
      {/* Left Panel - Image (hidden on mobile) */}
      <LeftPanel />
      
      {/* Right Panel - Login/Register Form */}
      <div className="w-full md:w-1/2 flex justify-center items-start md:items-center bg-white p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-md py-4 md:py-6">
          {/* Logo */}
          <div className="text-center mb-4 md:mb-6 transform transition-all duration-500">
            <div className="inline-block relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#16A34A] to-green-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center justify-center">
                  <img 
                    src="/logoSportFields.png" 
                    alt="Sport Fields Logo" 
                    className="h-8 w-auto mr-2"
                  />
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 animate-float">
                    SPORTS<span className="text-[#16A34A]">FIELD</span>
                  </h2>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mt-2 text-sm animate-fadeIn">Đặt sân bóng trực tuyến</p>
          </div>
          
          {/* Tab switching */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              onClick={handleSwitchToLogin}
              className={`flex-1 py-2 font-medium text-center cursor-pointer whitespace-nowrap ${
                isLogin 
                  ? 'text-[#16A34A] border-b-2 border-[#16A34A]' 
                  : 'text-gray-500'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={handleSwitchToRegister}
              className={`flex-1 py-2 font-medium text-center cursor-pointer whitespace-nowrap ${
                !isLogin 
                  ? 'text-[#16A34A] border-b-2 border-[#16A34A]' 
                  : 'text-gray-500'
              }`}
            >
              Đăng ký
            </button>
          </div>
          
          {/* Form container */}
          <div>
            {isLogin ? (
              <Login onSwitchToRegister={handleSwitchToRegister} />
            ) : (
              <Register onSwitchToLogin={handleSwitchToLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 