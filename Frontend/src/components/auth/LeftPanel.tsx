import React, { useState, useEffect } from 'react';

interface Feature {
  icon: string;
  text: string;
}

const LeftPanel: React.FC = () => {
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features: Feature[] = [
    { icon: 'users', text: 'Sân 5 người - Phù hợp cho nhóm nhỏ' },
    { icon: 'users', text: 'Sân 7 người - Lý tưởng cho đội bóng phong trào' },
    { icon: 'users', text: 'Sân 11 người - Tiêu chuẩn thi đấu chuyên nghiệp' },
    { icon: 'clock', text: 'Đặt sân linh hoạt 24/7' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLeftPanel(true);
    }, 300);
    
    const featureInterval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(featureInterval);
    };
  }, []);

  return (
    <div className={`hidden md:block w-full md:w-1/2 relative transition-opacity duration-1000 ${showLeftPanel ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#16A34A]/10 mix-blend-overlay"></div>
        <div className="absolute inset-0 animate-pulse-slow">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30"></div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
          alt="Sân bóng đá"
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 flex flex-col justify-center items-start p-6 md:p-8 lg:p-12 z-20 overflow-hidden">
        <div className="relative w-full max-w-lg">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#16A34A]/30 to-emerald-600/30 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <div className="relative px-4 md:px-5 lg:px-7 py-3 md:py-4 lg:py-6 bg-black/20 backdrop-blur-sm rounded-lg">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 tracking-tight animate-float">
              SPORTS<span className="text-[#16A34A] relative">
                FIELD
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#16A34A] rounded-full animate-ping"></span>
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/90 mb-3 md:mb-4 lg:mb-6 animate-slideIn">Nền tảng đặt sân bóng trực tuyến hàng đầu Việt Nam</p>
          </div>
        </div>
        <div className="space-y-3 md:space-y-4 w-full max-w-md mt-6 md:mt-8">
          <div className="relative">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`transform transition-all duration-500 flex items-center backdrop-blur-md rounded-lg p-3 md:p-4 mb-2 group hover:bg-white/10 cursor-pointer ${
                  activeFeature === index
                    ? 'translate-x-0 opacity-100 bg-black/40'
                    : 'translate-x-[-20px] opacity-0 bg-black/20'
                }`}
              >
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#16A34A] to-emerald-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
                  <div className="relative w-8 md:w-10 h-8 md:h-10 rounded-full bg-gradient-to-br from-[#16A34A] to-emerald-600 flex items-center justify-center mr-3 transform group-hover:scale-110 transition-transform duration-300">
                    {feature.icon === 'users' ? (
                      <div className="flex items-center">
                        <i className={`fas fa-${feature.icon} text-white text-xs md:text-sm`}></i>
                        <span className="ml-1 text-white text-xs font-bold">
                          {feature.text.includes('5') ? '5' : feature.text.includes('7') ? '7' : '11'}
                        </span>
                      </div>
                    ) : (
                      <i className={`fas fa-${feature.icon} text-white text-sm md:text-base group-hover:animate-bounce`}></i>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/90 font-medium group-hover:text-white transition-colors duration-300">{feature.text}</p>
                  <div className="h-0.5 w-0 bg-[#16A34A] group-hover:w-full transition-all duration-300"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-6 animate-fadeIn">
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 md:py-2">
              <i className="fas fa-calendar-check text-[#16A34A] mr-2"></i>
              <span className="text-xs md:text-sm text-white/90">Đặt sân dễ dàng</span>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 md:py-2">
              <i className="fas fa-shield-alt text-[#16A34A] mr-2"></i>
              <span className="text-xs md:text-sm text-white/90">An toàn & Uy tín</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel; 