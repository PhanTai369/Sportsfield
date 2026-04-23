"use client"

import { useState, useEffect } from 'react';
import { Clock, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  apiResponseTime: number;
  timeSlotRenderTime: number;
  lastUpdateTime: Date;
  errorCount: number;
  successfulRequests: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiResponseTime: 0,
    timeSlotRenderTime: 0,
    lastUpdateTime: new Date(),
    errorCount: 0,
    successfulRequests: 0
  });

  const [isVisible, setIsVisible] = useState(false);

  // Monitor API performance
  useEffect(() => {
    const originalFetch = window.fetch;
    let requestStartTime: number;

    window.fetch = async (...args) => {
      requestStartTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const responseTime = performance.now() - requestStartTime;
        
        setMetrics(prev => ({
          ...prev,
          apiResponseTime: responseTime,
          lastUpdateTime: new Date(),
          successfulRequests: prev.successfulRequests + 1
        }));
        
        return response;
      } catch (error) {
        setMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
          lastUpdateTime: new Date()
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const getPerformanceStatus = () => {
    if (metrics.apiResponseTime > 2000) return { color: 'text-red-600', icon: AlertTriangle, status: 'Chậm' };
    if (metrics.apiResponseTime > 1000) return { color: 'text-yellow-600', icon: Clock, status: 'Trung bình' };
    return { color: 'text-green-600', icon: CheckCircle, status: 'Tốt' };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-lg border transition-all duration-300 ${
        isVisible ? 'w-80 p-4' : 'w-12 h-12 p-0 cursor-pointer'
      }`}>
        {!isVisible ? (
          <div 
            className="w-full h-full flex items-center justify-center"
            onClick={() => setIsVisible(true)}
          >
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Hiệu suất hệ thống</h3>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Phản hồi API:</span>
                <div className="flex items-center gap-1">
                  <performanceStatus.icon className={`h-3 w-3 ${performanceStatus.color}`} />
                  <span className={`text-xs ${performanceStatus.color}`}>
                    {metrics.apiResponseTime.toFixed(0)}ms
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Trạng thái:</span>
                <span className={`text-xs ${performanceStatus.color}`}>
                  {performanceStatus.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Yêu cầu thành công:</span>
                <span className="text-xs text-green-600">
                  {metrics.successfulRequests}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Lỗi:</span>
                <span className="text-xs text-red-600">
                  {metrics.errorCount}
                </span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500">
                  Cập nhật: {metrics.lastUpdateTime.toLocaleTimeString('vi-VN')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
