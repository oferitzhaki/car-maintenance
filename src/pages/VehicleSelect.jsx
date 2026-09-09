import React, { useState, useEffect } from 'react';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '../api';
import '../styles/VehicleSelect.css';

const EMPTY_FORM = {
    license_plate: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    current_mileage: 0,
};

export default function VehicleSelect({ onVehicleSelected }) {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const data = await getVehicles();
            setVehicles(data);
            setError('');
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const closeForm = () => {
        setShowAddForm(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setError('');
    };

    // פתיחת הטופס במצב עריכה
    const startEdit = (e, vehicle) => {
        e.stopPropagation();
        setFormData({
            license_plate: vehicle.license_plate || '',
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year || '',
            vin: vehicle.vin || '',
            current_mileage: vehicle.current_mileage || 0,
        });
        setEditingId(vehicle.id);
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (e, vehicle) => {
        e.stopPropagation();

        const ok = window.confirm(
            `למחוק את ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})?\n\n` +
            `כל היסטוריית הטיפולים של הרכב תימחק גם היא. הפעולה בלתי הפיכה.`
        );
        if (!ok) return;

        setLoading(true);
        try {
            await deleteVehicle(vehicle.id);
            setVehicles(vehicles.filter((v) => v.id !== vehicle.id));
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.license_plate || !formData.make || !formData.model) {
            setError('❌ אנא מלא את השדות הנדרשים (רישום, מותג, דגם)');
            return;
        }

        const payload = {
            license_plate: formData.license_plate,
            make: formData.make,
            model: formData.model,
            year: formData.year ? parseInt(formData.year) : null,
            vin: formData.vin || null,
            current_mileage: parseInt(formData.current_mileage) || 0,
        };

        setLoading(true);
        try {
            if (editingId) {
                const existing = vehicles.find((v) => v.id === editingId);
                const updated = await updateVehicle(editingId, {
                    ...payload,
                    insurance_expiry: existing?.insurance_expiry || null,
                });
                setVehicles(
                    vehicles.map((v) =>
                        v.id === editingId ? { ...updated, maintenance: v.maintenance } : v
                    )
                );
                closeForm();
            } else {
                const newVehicle = await addVehicle(payload);
                setVehicles([newVehicle, ...vehicles]);
                closeForm();
                onVehicleSelected(newVehicle);
            }
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getLastService = (maintenance) => {
        if (!maintenance || maintenance.length === 0) return null;
        return maintenance[0];
    };

    const handleSelectVehicle = (vehicle) => {
        onVehicleSelected(vehicle);
    };

    // סגנון לכפתורי הפעולה הקטנים בכרטיס
    const iconBtn = {
        background: 'transparent',
        border: 'none',
        fontSize: '1.1em',
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: '6px',
        lineHeight: 1,
    };

    return (
        <div className="vehicle-select">
            <div className="header">
                <h1>🚗 ניהול רכבים</h1>
                <div className="subtitle">בחר או הוסף רכב</div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!showAddForm ? (
                <button onClick={() => setShowAddForm(true)} className="btn-add-new">
                    ➕ הוסף רכב חדש
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="add-vehicle-form">
                    <h2>{editingId ? '✏️ עריכת פרטי רכב' : 'הוסף רכב חדש'}</h2>

                    <div className="form-group">
                        <label>מספר רישום *</label>
                        <input
                            type="text"
                            value={formData.license_plate}
                            onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                            placeholder="לדוגמה: 32544904"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>מותג *</label>
                            <input
                                type="text"
                                value={formData.make}
                                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                placeholder="ניסן, פיג'ו, וכו'"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>דגם *</label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                placeholder="קשקאי, 208GT, וכו'"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>שנה</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                placeholder="2015"
                                min="1990"
                                max={new Date().getFullYear() + 1}
                            />
                        </div>
                        <div className="form-group">
                            <label>VIN</label>
                            <input
                                type="text"
                                value={formData.vin}
                                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                placeholder="מספר זיהוי הרכב (אופציונלי)"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>קילומטראז' נוכחי</label>
                        <input
                            type="number"
                            value={formData.current_mileage}
                            onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })}
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" disabled={loading} className="btn-submit">
                            {loading ? '⏳ שמירה...' : editingId ? '💾 שמור שינויים' : '💾 הוסף רכב'}
                        </button>
                        <button type="button" onClick={closeForm} className="btn-cancel">
                            ביטול
                        </button>
                    </div>
                </form>
            )}

            {vehicles.length > 0 ? (
                <div className="vehicles-list">
                    <h2>הרכבים שלך ({vehicles.length})</h2>
                    <div className="vehicles-grid">
                        {vehicles.map((vehicle) => {
                            const lastService = getLastService(vehicle.maintenance);
                            return (
                                <div
                                    key={vehicle.id}
                                    className="vehicle-card"
                                    onClick={() => handleSelectVehicle(vehicle)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') handleSelectVehicle(vehicle);
                                    }}
                                >
                                    <div className="vehicle-header">
                                        <div className="license-plate">{vehicle.license_plate}</div>
                                        <div className="vehicle-year">{vehicle.year}</div>
                                    </div>

                                    <div className="vehicle-info">
                                        <h3>{vehicle.make} {vehicle.model}</h3>
                                        <p className="mileage">
                                            📍 {Number(vehicle.current_mileage || 0).toLocaleString('he-IL')} ק"מ
                                        </p>
                                    </div>

                                    {lastService && (
                                        <div className="last-service">
                                            <div className="service-label">טיפול אחרון:</div>
                                            <div className="service-date">
                                                {new Date(lastService.service_date).toLocaleDateString('he-IL')}
                                            </div>
                                            {lastService.workshop_name && (
                                                <div className="workshop-name">
                                                    מוסך: {lastService.workshop_name}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        marginTop: '10px',
                                    }}>
                                        <button
                                            className="btn-select"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectVehicle(vehicle);
                                            }}
                                        >
                                            בחר רכב →
                                        </button>

                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button
                                                onClick={(e) => startEdit(e, vehicle)}
                                                style={iconBtn}
                                                title="ערוך פרטי רכב"
                                                aria-label="ערוך פרטי רכב"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, vehicle)}
                                                style={iconBtn}
                                                title="מחק רכב"
                                                aria-label="מחק רכב"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                !showAddForm && !loading && (
                    <div className="no-vehicles">
                        <p>📭 אין רכבים עדיין</p>
                        <p className="hint">הוסף רכב חדש כדי להתחיל</p>
                    </div>
                )
            )}
        </div>
    );
}