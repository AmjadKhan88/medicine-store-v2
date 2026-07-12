import { createContext, useContext, useState } from 'react';

const AIContext = createContext(null);

/* ── Models list hardcoded on frontend — no API call needed ──
   These match MODELS in backend/controllers/aiController.js exactly.
   If you add a new model to the backend, add it here too.
── */
export const AI_MODELS = {
  'gemini-2.5-flash': { provider: 'gemini', label: 'Gemini 2.5 Flash' },
  'gemini-3.5-flash': { provider: 'gemini', label: 'Gemini 3.5 Flash' },
  'llama-3.3-70b':    { provider: 'groq',   label: 'Groq — Llama 3.3 70B' },
  'llama-3.1-8b':     { provider: 'groq',   label: 'Groq — Llama 3.1 8B'  },
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

export function AIProvider({ children }) {
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('medistore_ai_model');
    // Validate saved value is still a valid model key
    return saved && AI_MODELS[saved] ? saved : DEFAULT_MODEL;
  });

  const changeModel = (key) => {
    if (!AI_MODELS[key]) return; // ignore invalid keys
    setSelectedModel(key);
    localStorage.setItem('medistore_ai_model', key);
  };

  return (
    <AIContext.Provider value={{ selectedModel, changeModel, models: AI_MODELS }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => useContext(AIContext);

// import { createContext, useContext, useState, useEffect } from 'react';
// import API from '../utils/api';

// const AIContext = createContext(null);

// export function AIProvider({ children }) {
//   const [selectedModel, setSelectedModel] = useState(
//     () => localStorage.getItem('medistore_ai_model') || 'gemini-2.5-flash'
//   );
//   const [models, setModels] = useState({});

//   useEffect(() => {
//     API.get('/ai/models')
//       .then(({ data }) => setModels(data.models || {}))
//       .catch(() => {});
//   }, []);

//   const changeModel = (key) => {
//     setSelectedModel(key);
//     localStorage.setItem('medistore_ai_model', key);
//   };

//   return (
//     <AIContext.Provider value={{ selectedModel, changeModel, models }}>
//       {children}
//     </AIContext.Provider>
//   );
// }

// export const useAI = () => useContext(AIContext);