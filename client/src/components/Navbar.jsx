import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getRoleBasedLinks = () => {
        const links = [
            { to: '/', label: 'Home' },
            { to: '/hospitals/nearby', label: 'Find Nearby Hospitals' }
        ];

        if (user) {
            switch (user.role) {
                case 'doctor':
                    links.push({ to: '/doctor/profile', label: 'My Profile' });
                    break;
                case 'staff':
                    links.push({ to: '/staff/dashboard', label: 'Dashboard' });
                    break;
                case 'patient':
                    links.push({ to: '/patient/dashboard', label: 'My Dashboard' });
                    break;
                default:
                    break;
            }
        }

        return links;
    };

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-xl font-bold text-blue-600">
                                CareBridge
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                to="/"
                                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Find Healthcare
                            </Link>
                            {user && getRoleBasedLinks().map((link, index) => (
                                <Link
                                    key={index}
                                    to={link.to}
                                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            <svg
                                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <svg
                                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Desktop menu */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {user ? (
                            <div className="ml-3 relative">
                                <div>
                                    <button
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                        className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <span className="sr-only">Open user menu</span>
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-blue-600 font-medium">
                                                {user.firstName?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                    </button>
                                </div>

                                {isProfileMenuOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                                            <p className="text-gray-500 capitalize">{user.role}</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex space-x-4">
                                <Link
                                    to="/login"
                                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        <Link
                            to="/"
                            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                        >
                            Find Healthcare
                        </Link>
                        {user && (
                            <>
                                {getRoleBasedLinks().map((link, index) => (
                                    <Link
                                        key={index}
                                        to={link.to}
                                        className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                <div className="border-t border-gray-200 pt-4 pb-3">
                                    <div className="px-4">
                                        <div className="text-base font-medium text-gray-800">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className="text-sm font-medium text-gray-500 capitalize">
                                            {user.role}
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        {!user && (
                            <div className="pt-4 pb-3 border-t border-gray-200">
                                <div className="space-y-1">
                                    <Link
                                        to="/login"
                                        className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar; 