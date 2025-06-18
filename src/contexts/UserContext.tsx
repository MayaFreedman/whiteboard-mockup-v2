
import React, { createContext, useContext, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

interface UserContextType {
  userId: string;
  userName: string;
  setUserName: (name: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Anonymous User');

  useEffect(() => {
    // Get or create user ID from localStorage
    let storedUserId = localStorage.getItem('whiteboard-user-id');
    if (!storedUserId) {
      storedUserId = nanoid();
      localStorage.setItem('whiteboard-user-id', storedUserId);
    }
    setUserId(storedUserId);

    // Get user name from localStorage
    const storedUserName = localStorage.getItem('whiteboard-user-name');
    if (storedUserName) {
      setUserName(storedUserName);
    }
  }, []);

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('whiteboard-user-name', name);
  };

  return (
    <UserContext.Provider value={{ userId, userName, setUserName: handleSetUserName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
