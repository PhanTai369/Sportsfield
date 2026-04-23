import React, { Component, ErrorInfo, ReactNode } from 'react';
import logger from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('React component error caught', {
      context: 'ErrorBoundary',
      data: { 
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 m-4 border border-red-200 bg-red-50 rounded-md">
          <h2 className="text-lg font-medium text-red-800 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-sm text-red-600 mb-2">
            Chúng tôi đã ghi nhận lỗi và sẽ khắc phục sớm nhất có thể
          </p>
          <details className="text-xs text-red-500 mt-2">
            <summary className="cursor-pointer font-medium">Chi tiết lỗi</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 