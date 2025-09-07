'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const NotificationModalContext = createContext<NotificationModalContextType | undefined>(undefined);

export const useNotificationModal = () => {
  const context = useContext(NotificationModalContext);
  if (context === undefined) {
    throw new Error('useNotificationModal must be used within a NotificationModalProvider');
  }
  return context;
};

interface NotificationModalProviderProps {
  children: ReactNode;
}

export const NotificationModalProvider: React.FC<NotificationModalProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <NotificationModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </NotificationModalContext.Provider>
  );
}; 