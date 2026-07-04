import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('medistore_ai_model') || 'gemini-2.5-flash'
  );
  const [models, setModels] = useState({});

  useEffect(() => {
    API.get('/ai/models')
      .then(({ data }) => setModels(data.models || {}))
      .catch(() => {});
  }, []);

  const changeModel = (key) => {
    setSelectedModel(key);
    localStorage.setItem('medistore_ai_model', key);
  };

  return (
    <AIContext.Provider value={{ selectedModel, changeModel, models }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => useContext(AIContext);