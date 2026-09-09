import { useState, useEffect } from 'react';
import VehicleSelect from './pages/VehicleSelect';
import MaintenanceManager from './pages/MaintenanceManager';
import Settings from './components/Settings';
import Login from './components/Login';
import { getPassword, clearPassword } from './api';
import './App.css';

function App() {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [currentPage, setCurrentPage] = useState('vehicles'); // 'vehicles', 'maintenance', 'settings'
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);

    // בדיקה אם כבר מחוברים (סיסמה שמורה בדפדפן)
    useEffect(() => {
        if (getPassword()) setAuthed(true);
        setChecking(false);
    }, []);

    const handleVehicleSelected = (vehicle) => {
        setSelectedVehicle(vehicle);
        setCurrentPage('maintenance');
        console.log('✅ Selected vehicle:', vehicle);
    };

    const handleBackToVehicles = () => {
        setSelectedVehicle(null);
        setCurrentPage('vehicles');
    };

    const handleSettingsClick = () => {
        setCurrentPage('settings');
    };

    const handleBackFromSettings = () => {
        if (selectedVehicle) {
            setCurrentPage('maintenance');
        } else {
            setCurrentPage('vehicles');
        }
    };

    const handleLogout = () => {
        clearPassword();
        setAuthed(false);
        setSelectedVehicle(null);
        setCurrentPage('vehicles');
    };

    // סגנון משותף לכפתורים הצפים
    const floatingBtn = {
        position: 'fixed',
        bottom: 20,
        padding: '12px 20px',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        zIndex: 10,
        fontWeight: '600',
        fontSize: '1em',
    };

    // ===== שער כניסה =====
    if (checking) return null;

    if (!authed) {
        return <Login onSuccess={() => setAuthed(true)} />;
    }

    // ===== Settings Page =====
    if (currentPage === 'settings') {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={handleBackFromSettings}
                    style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        padding: '10px 20px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        zIndex: 10,
                        fontWeight: '600',
                    }}
                >
                    ← חזור
                </button>
                <button
                    onClick={handleLogout}
                    style={{
                        position: 'absolute',
                        top: 20,
                        left: 20,
                        padding: '10px 20px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        zIndex: 10,
                        fontWeight: '600',
                    }}
                >
                    🚪 התנתק
                </button>
                <Settings />
            </div>
        );
    }

    // ===== Maintenance Manager Page =====
    if (currentPage === 'maintenance' && selectedVehicle) {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={handleSettingsClick}
                    style={{
                        ...floatingBtn,
                        left: 20,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                >
                    ⚙️ הגדרות
                </button>
                <MaintenanceManager
                    vehicle={selectedVehicle}
                    onBack={handleBackToVehicles}
                />
            </div>
        );
    }

    // ===== Vehicle Select Page =====
    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={handleSettingsClick}
                style={{
                    ...floatingBtn,
                    left: 20,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                ⚙️ הגדרות
            </button>
            <VehicleSelect onVehicleSelected={handleVehicleSelected} />
        </div>
    );
}

export default App;