import React, { createContext, useContext, useState } from 'react';
import PasswordModal from '../components/PasswordModal';

const PasswordContext = createContext();

export const usePasswordModal = () => useContext(PasswordContext);

export const PasswordProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState({ 
        isOpen: false, 
        resolve: null, 
        title: '', 
        description: '' 
    });

    const requestPassword = (title, description) => {
        return new Promise((resolve) => {
            setModalConfig({ isOpen: true, resolve, title, description });
        });
    };

    const handleSubmit = (pwd) => {
        if (modalConfig.resolve) modalConfig.resolve(pwd);
        setModalConfig({ isOpen: false, resolve: null, title: '', description: '' });
    };

    const handleCancel = () => {
        if (modalConfig.resolve) modalConfig.resolve(null);
        setModalConfig({ isOpen: false, resolve: null, title: '', description: '' });
    };

    return (
        <PasswordContext.Provider value={{ requestPassword }}>
            {children}
            <PasswordModal 
                isOpen={modalConfig.isOpen}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                title={modalConfig.title}
                description={modalConfig.description}
            />
        </PasswordContext.Provider>
    );
};
