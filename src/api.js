// src/api.js
// מודול מרכזי לכל הקריאות לשרת - מטפל בסיסמה ובכתובת אוטומטית

const API_BASE = '/api';
const PASSWORD_KEY = 'car_app_password';

export function getPassword() {
    return localStorage.getItem(PASSWORD_KEY) || '';
}

export function setPassword(pw) {
    localStorage.setItem(PASSWORD_KEY, pw);
}

export function clearPassword() {
    localStorage.removeItem(PASSWORD_KEY);
}

// בדיקת סיסמה מול השרת
export async function login(password) {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    if (!res.ok) throw new Error('סיסמה שגויה');

    setPassword(password);
    return true;
}

// קריאה כללית לשרת - מוסיפה את הסיסמה אוטומטית
export async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-app-password': getPassword(),
            ...options.headers
        }
    });

    if (res.status === 401) {
        clearPassword();
        window.location.reload();
        throw new Error('נדרשת התחברות מחדש');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'שגיאה בשרת');
    }

    return res.json();
}

// ===== VEHICLES =====
export const getVehicles = () => apiFetch('/vehicles');
export const getVehicle = (id) => apiFetch(`/vehicles/${id}`);
export const addVehicle = (data) =>
    apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(data) });
export const updateVehicle = (id, data) =>
    apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteVehicle = (id) =>
    apiFetch(`/vehicles/${id}`, { method: 'DELETE' });

// ===== MAINTENANCE =====
export const getMaintenance = (vehicleId) => apiFetch(`/maintenance/${vehicleId}`);
export const addMaintenance = (data) =>
    apiFetch('/maintenance', { method: 'POST', body: JSON.stringify(data) });
export const updateMaintenance = (id, data) =>
    apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMaintenance = (id) =>
    apiFetch(`/maintenance/${id}`, { method: 'DELETE' });