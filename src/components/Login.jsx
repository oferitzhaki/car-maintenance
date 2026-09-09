import { useState } from 'react';
import { login } from '../api';

export default function Login({ onSuccess }) {
    const [password, setPwd] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(password);
            onSuccess();
        } catch (err) {
            setError('סיסמה שגויה');
            setPwd('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: "'Segoe UI', Tahoma, sans-serif",
            direction: 'rtl'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: 'white',
                padding: '40px 32px',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                width: '90%',
                maxWidth: '360px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '3em', marginBottom: '8px' }}>🚗</div>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.5em', color: '#333' }}>
                    ניהול רכבים
                </h1>
                <p style={{ margin: '0 0 24px', color: '#888', fontSize: '0.9em' }}>
                    הזן סיסמה כדי להמשיך
                </p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="סיסמה"
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '1.1em',
                        border: error ? '2px solid #e74c3c' : '2px solid #e0e0e0',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        outline: 'none',
                        marginBottom: '12px'
                    }}
                />

                {error && (
                    <div style={{ color: '#e74c3c', marginBottom: '12px', fontSize: '0.9em' }}>
                        ❌ {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !password}
                    style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '1.05em',
                        fontWeight: 600,
                        color: 'white',
                        background: loading || !password
                            ? '#bbb'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: loading || !password ? 'default' : 'pointer'
                    }}
                >
                    {loading ? 'בודק...' : 'כניסה'}
                </button>
            </form>
        </div>
    );
}