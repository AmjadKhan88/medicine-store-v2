import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(() => {
//     try { return JSON.parse(localStorage.getItem('medistore_user')); } catch { return null; }
//   });
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem('medistore_token');
//     if (token) {
//       API.get('/auth/me')
//         .then(({ data }) => setUser(data.user))
//         .catch(() => { localStorage.removeItem('medistore_token'); setUser(null); })
//         .finally(() => setLoading(false));
//     } else setLoading(false);
//   }, []);

// //   useEffect(() => {
// //   const token = localStorage.getItem('medistore_token');
// //   if (token) {
// //     API.get('/auth/me')
// //       .then(({ data }) => {
// //         setUser(data.user);
// //         localStorage.setItem('medistore_user', JSON.stringify(data.user)); // sync if changed
// //       })
// //       .catch(() => {
// //         // CRITICAL FIX: Remove both token AND user from localStorage
// //         localStorage.removeItem('medistore_token');
// //         localStorage.removeItem('medistore_user');
// //         setUser(null);
// //       })
// //       .finally(() => setLoading(false));
// //   } else {
// //     // If no token, ensure user is cleared from localStorage to prevent stale reads
// //     localStorage.removeItem('medistore_user');
// //     setUser(null);
// //     setLoading(false);
// //   }
// // }, []);

//   const logout = () => {
//     localStorage.removeItem('medistore_token');
//     localStorage.removeItem('medistore_user');
//     setUser(null);
//   };

//   const register = async (form) => {
//     const { data } = await API.post('/auth/register', form);
//     localStorage.setItem('medistore_token', data.token);
//     localStorage.setItem('medistore_user', JSON.stringify(data.user));
//     setUser(data.user);
//     return data;
//   };

//   return (
//     <AuthContext.Provider value={{ user, loading, logout, register, setUser }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // always start null — never read stale localStorage here
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medistore_token');

    if (!token) {
      // No token — clear any stale user data and stop loading
      localStorage.removeItem('medistore_user');
      setUser(null);
      setLoading(false);
      return;
    }

    // Token exists — verify it with the server
    API.get('/auth/me')
      .then(({ data }) => {
        // Always use fresh data from server, not localStorage
        setUser(data.user);
        // Keep localStorage in sync with latest user data
        localStorage.setItem('medistore_user', JSON.stringify(data.user));
      })
      .catch(() => {
        // Token is invalid or expired — clear everything
        localStorage.removeItem('medistore_token');
        localStorage.removeItem('medistore_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('medistore_token');
    localStorage.removeItem('medistore_user');
    setUser(null);
  };

  const login = (token, userData) => {
    localStorage.setItem('medistore_token', token);
    localStorage.setItem('medistore_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (form) => {
    const { data } = await API.post('/auth/register', form);
    // Register no longer auto-logs in (email verification required)
    // just return the data, don't set user
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, login, register, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
