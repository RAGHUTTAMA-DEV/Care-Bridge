import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service here
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-red-600 mb-4">
                                Something went wrong
                            </h2>
                            <p className="text-gray-600 mb-4">
                                We apologize for the inconvenience. Please try refreshing the page.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Refresh Page
                            </button>
                            {process.env.NODE_ENV === 'development' && (
                                <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
                                    <p className="text-sm font-mono text-red-600">
                                        {this.state.error?.toString()}
                                    </p>
                                    <details className="mt-2">
                                        <summary className="text-sm text-gray-600 cursor-pointer">
                                            Component Stack Trace
                                        </summary>
                                        <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                                            {this.state.errorInfo?.componentStack}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 