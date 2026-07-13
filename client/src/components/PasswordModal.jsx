import React, { useState } from 'react';
import './PasswordModal.css';

const PasswordModal = ({ isOpen, onSubmit, onCancel, title, description }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(password);
        setPassword('');
    };

    const handleCancel = () => {
        onCancel();
        setPassword('');
    };

    return (
        <div className="password-modal-overlay">
            <div className="password-modal-content">
                <div className="password-modal-header">
                    <h2>{title || "Enter Master Password"}</h2>
                    <button className="close-btn" onClick={handleCancel}>&times;</button>
                </div>
                <div className="password-modal-body">
                    <p>{description || "Please enter your master password to continue."}</p>
                    <form onSubmit={handleSubmit}>
                        <input 
                            type="password" 
                            placeholder="Master Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                        />
                        <div className="password-modal-actions">
                            <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                            <button type="submit" className="submit-btn">Confirm</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
