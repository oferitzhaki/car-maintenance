import React, { useState, useEffect, useMemo } from 'react';
import EmailNotifications from '../components/EmailNotifications';
import NotificationsCenter from '../components/NotificationsCenter';
import RemindersList from '../components/RemindersList';
import {
    updateVehicle,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
} from '../api';
import '../styles/MaintenanceManager.css';

const CATEGORIES = [
    { value: 'oil_change', label: '🛢️ החלפת שמן' },
    { value: 'tires', label: '🛞 גלגלים' },
    { value: 'brakes', label: '🛑 בלמים' },
    { value: 'battery', label: '🔋 סוללה' },
    { value: 'filters', label: '🌊 מסננים' },
    { value: 'inspection', label: '🔍 בדיקה' },
    { value: 'wash', label: '🧼 ניקיון' },
    { value: 'repair', label: '🔧 תיקון' },
    { value: 'other', label: '📝 אחר' },
];

export default function MaintenanceManager({ vehicle, onBack }) {
    const [maintenance, setMaintenance] = useState(vehicle.maintenance || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [currentMileage, setCurrentMileage] = useState(vehicle.current_mileage || 0);
    const [insuranceExpiry, setInsuranceExpiry] = useState(vehicle.insurance_expiry || '');
    const [testExpiry, setTestExpiry] = useState(vehicle.test_expiry || '');
    const [editingInsurance, setEditingInsurance] = useState(false);
    const [editingTest, setEditingTest] = useState(false);

    const userEmail = localStorage.getItem('userEmail');

    const [formData, setFormData] = useState({
        category: 'oil_change',
        description: '',
        cost: '',
        mileage: vehicle.current_mileage || '',
        service_date: new Date().toISOString().split('T')[0],
        workshop_name: '',
        notes: '',
        image_path: null,
    });

    // התראות לשליחה במייל
    const alerts = useMemo(() => {
        const notifications = [];
        const today = new Date();

        if (insuranceExpiry) {
            const expiryDate = new Date(insuranceExpiry);
            const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) {
                notifications.push({
                    priority: 3, type: 'urgent', emoji: '🛡️',
                    title: 'חידוש ביטוח', message: '⚠️ הביטוח פג תוקף!', daysLeft: 0,
                });
            } else if (daysLeft <= 7) {
                notifications.push({
                    priority: 2, type: 'critical', emoji: '🛡️',
                    title: 'חידוש ביטוח', message: `בעוד ${daysLeft} ימים`, daysLeft,
                });
            }
        }

        if (testExpiry) {
            const expiryDate = new Date(testExpiry);
            const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) {
                notifications.push({
                    priority: 3, type: 'urgent', emoji: '✅',
                    title: 'הטסט', message: '⚠️ הטסט פג תוקף!', daysLeft: 0,
                });
            } else if (daysLeft <= 7) {
                notifications.push({
                    priority: 2, type: 'critical', emoji: '✅',
                    title: 'הטסט', message: `בעוד ${daysLeft} ימים`, daysLeft,
                });
            }
        }

        return notifications;
    }, [insuranceExpiry, testExpiry]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            setError('❌ גודל התמונה גדול מדי (מקסימום 3MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            setFormData((prev) => ({ ...prev, image_path: imageData }));
            setPreviewImage(imageData);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setFormData((prev) => ({ ...prev, image_path: null }));
        setPreviewImage(null);
    };

    const startEdit = (item) => {
        setFormData({
            category: item.category,
            description: item.description || '',
            cost: item.cost || '',
            mileage: item.mileage || '',
            service_date: item.service_date,
            workshop_name: item.workshop_name || '',
            notes: item.notes || '',
            image_path: item.image_path || null,
        });
        setPreviewImage(item.image_path || null);
        setEditingId(item.id);
        setShowAddForm(true);
    };

    const resetForm = () => {
        setFormData({
            category: 'oil_change',
            description: '',
            cost: '',
            mileage: currentMileage || '',
            service_date: new Date().toISOString().split('T')[0],
            workshop_name: '',
            notes: '',
            image_path: null,
        });
        setPreviewImage(null);
        setEditingId(null);
    };

    const vehiclePayload = (overrides = {}) => ({
        license_plate: vehicle.license_plate,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        current_mileage: currentMileage,
        insurance_expiry: insuranceExpiry || null,
        test_expiry: testExpiry || null,
        ...overrides,
    });

    const handleAddMaintenance = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.service_date) {
            setError('❌ אנא בחר תאריך');
            return;
        }

        setLoading(true);
        try {
            const newMileage = parseInt(formData.mileage) || currentMileage;

            await updateVehicle(vehicle.id, vehiclePayload({ current_mileage: newMileage }));
            setCurrentMileage(newMileage);

            const payload = {
                category: formData.category,
                description: formData.description,
                cost: formData.cost ? parseFloat(formData.cost) : null,
                mileage: newMileage,
                service_date: formData.service_date,
                workshop_name: formData.workshop_name,
                notes: formData.notes,
                image_path: formData.image_path,
            };

            if (editingId) {
                const updated = await updateMaintenance(editingId, payload);
                setMaintenance(maintenance.map((m) => (m.id === editingId ? updated : m)));
            } else {
                const created = await addMaintenance({ vehicle_id: vehicle.id, ...payload });
                setMaintenance([created, ...maintenance]);
            }

            resetForm();
            setShowAddForm(false);
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaintenance = async (id) => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את הטיפול?')) return;

        setLoading(true);
        try {
            await deleteMaintenance(id);
            setMaintenance(maintenance.filter((m) => m.id !== id));
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInsurance = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await updateVehicle(vehicle.id, vehiclePayload({ insurance_expiry: insuranceExpiry }));
            setEditingInsurance(false);
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await updateVehicle(vehicle.id, vehiclePayload({ test_expiry: testExpiry }));
            setEditingTest(false);
        } catch (err) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryLabel = (value) =>
        CATEGORIES.find((c) => c.value === value)?.label || value;

    // פונקציית עזר לחישוב ימים לטסט
    const getDaysUntilTest = () => {
        if (!testExpiry) return null;
        const expiryDate = new Date(testExpiry);
        const today = new Date();
        return Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    };

    // פונקציית עזר לחישוב ימים לביטוח
    const getDaysUntilInsurance = () => {
        if (!insuranceExpiry) return null;
        const expiryDate = new Date(insuranceExpiry);
        const today = new Date();
        return Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    };

    // סגנון לקובייה
    const cubeStyle = {
        width: '70px',
        padding: '10px',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '0.85em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px',
    };

    const cubeContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '12px',
    };

    return (
        <div className="maintenance-manager">
            {userEmail && (
                <EmailNotifications vehicle={vehicle} alerts={alerts} userEmail={userEmail} />
            )}

            <div className="maintenance-header">
                <button onClick={onBack} className="btn-back">← חזור</button>
                <h1>🚗 {vehicle.make} {vehicle.model}</h1>
                <div className="current-mileage">
                    {Number(currentMileage || 0).toLocaleString('he-IL')} ק"מ
                </div>
            </div>

            <div className="maintenance-content">
                {error && <div className="error-message">{error}</div>}

                <NotificationsCenter vehicle={vehicle} maintenance={maintenance} />

                {!showAddForm ? (
                    <button onClick={() => setShowAddForm(true)} className="btn-add-maintenance">
                        ➕ הוסף טיפול חדש
                    </button>
                ) : (
                    <form onSubmit={handleAddMaintenance} className="add-maintenance-form">
                        <h2>{editingId ? '✏️ עדכן טיפול' : 'הוסף טיפול חדש'}</h2>

                        <div className="form-group">
                            <label>קטגוריה *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>תיאור</label>
                            <input
                                type="text"
                                placeholder="לדוגמה: החלפה מלאה + סינון"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>תאריך *</label>
                                <input
                                    type="date"
                                    value={formData.service_date}
                                    onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>קילומטראז'</label>
                                <input
                                    type="number"
                                    value={formData.mileage}
                                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>שם מוסך</label>
                                <input
                                    type="text"
                                    placeholder="לדוגמה: מוסך דלק, סרוג"
                                    value={formData.workshop_name}
                                    onChange={(e) => setFormData({ ...formData, workshop_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>עלות</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="₪"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>הערות</label>
                            <input
                                type="text"
                                placeholder="הערות נוספות"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>📸 תמונה או קבלה (אופציונלי)</label>
                            <div className="image-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageSelect}
                                    className="file-input"
                                    id="image-input"
                                />
                                <label htmlFor="image-input" className="file-label">
                                    📸 בחר תמונה או צלם
                                </label>
                            </div>

                            {previewImage && (
                                <div className="image-preview">
                                    <img src={previewImage} alt="Preview" />
                                    <button type="button" onClick={removeImage} className="btn-remove-image">
                                        🗑️ הסר תמונה
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={loading} className="btn-submit">
                                {loading ? '⏳ שמירה...' : editingId ? '✏️ עדכן' : '💾 הוסף'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    resetForm();
                                }}
                                className="btn-cancel"
                            >
                                ביטול
                            </button>
                        </div>
                    </form>
                )}

                {maintenance.length > 0 ? (
                    <div className="maintenance-list">
                        <h2>📋 היסטוריית טיפולים ({maintenance.length})</h2>
                        <div className="table-wrapper">
                            <table className="maintenance-table">
                                <thead>
                                    <tr>
                                        <th>תאריך</th>
                                        <th>קטגוריה</th>
                                        <th>תיאור</th>
                                        <th>מוסך</th>
                                        <th>קילומטראז'</th>
                                        <th>עלות</th>
                                        <th>קבלה</th>
                                        <th>פעולות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenance.map((m) => (
                                        <tr key={m.id}>
                                            <td>{new Date(m.service_date).toLocaleDateString('he-IL')}</td>
                                            <td>{getCategoryLabel(m.category)}</td>
                                            <td>{m.description || '-'}</td>
                                            <td className="workshop-cell">{m.workshop_name || '-'}</td>
                                            <td>{m.mileage ? Number(m.mileage).toLocaleString('he-IL') : '-'}</td>
                                            <td>{m.cost ? `₪${Number(m.cost).toFixed(2)}` : '-'}</td>
                                            <td className="image-cell">
                                                {m.image_path ? (
                                                    <a
                                                        href={m.image_path}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="image-link"
                                                        title="הצג קבלה"
                                                    >
                                                        📸
                                                    </a>
                                                ) : '-'}
                                            </td>
                                            <td className="actions-cell">
                                                <button onClick={() => startEdit(m)} className="btn-edit" title="עדכן">
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMaintenance(m.id)}
                                                    className="btn-delete"
                                                    title="מחק"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="no-maintenance">
                        <p>📭 אין טיפולים עדיין</p>
                        <p className="hint">הוסף את הטיפול הראשון שלך!</p>
                    </div>
                )}

                {/* תזכורות - ביטוח וטסט */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginTop: '20px',
                }}>
                    {/* ביטוח */}
                    <div style={{
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: '#f9f9f9',
                    }}>
                        <h3 style={{ textAlign: 'center', marginTop: 0 }}>🛡️ ביטוח</h3>

                        {!editingInsurance ? (
                            <div>
                                {insuranceExpiry ? (
                                    <div style={cubeContainerStyle}>
                                        <div style={{
                                            ...cubeStyle,
                                            background: getDaysUntilInsurance() <= 7 ? '#ff6b6b' : '#90EE90',
                                            color: getDaysUntilInsurance() <= 7 ? 'white' : '#333',
                                        }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1em' }}>
                                                {new Date(insuranceExpiry).toLocaleDateString('he-IL')}
                                            </div>
                                            <div style={{ fontSize: '0.75em' }}>
                                                {getDaysUntilInsurance() <= 0
                                                    ? 'פג!'
                                                    : `${getDaysUntilInsurance()} ימים`}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: '#999' }}>📭 לא הוגדר</p>
                                )}

                                <button
                                    onClick={() => setEditingInsurance(true)}
                                    style={{
                                        width: '100%',
                                        marginTop: '10px',
                                        padding: '8px',
                                        background: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✏️ {insuranceExpiry ? 'עדכן' : 'הוסף'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveInsurance}>
                                <input
                                    type="date"
                                    value={insuranceExpiry}
                                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#667eea',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        💾
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingInsurance(false)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#ddd',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ❌
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* טסט */}
                    <div style={{
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: '#f9f9f9',
                    }}>
                        <h3 style={{ textAlign: 'center', marginTop: 0 }}>✅ טסט</h3>

                        {!editingTest ? (
                            <div>
                                {testExpiry ? (
                                    <div style={cubeContainerStyle}>
                                        <div style={{
                                            ...cubeStyle,
                                            background: getDaysUntilTest() <= 7 ? '#ff6b6b' : '#90EE90',
                                            color: getDaysUntilTest() <= 7 ? 'white' : '#333',
                                        }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1em' }}>
                                                {new Date(testExpiry).toLocaleDateString('he-IL')}
                                            </div>
                                            <div style={{ fontSize: '0.75em' }}>
                                                {getDaysUntilTest() <= 0
                                                    ? 'פג!'
                                                    : `${getDaysUntilTest()} ימים`}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: '#999' }}>📭 לא הוגדר</p>
                                )}

                                <button
                                    onClick={() => setEditingTest(true)}
                                    style={{
                                        width: '100%',
                                        marginTop: '10px',
                                        padding: '8px',
                                        background: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✏️ {testExpiry ? 'עדכן' : 'הוסף'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveTest}>
                                <input
                                    type="date"
                                    value={testExpiry}
                                    onChange={(e) => setTestExpiry(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#667eea',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        💾
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTest(false)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#ddd',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ❌
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}