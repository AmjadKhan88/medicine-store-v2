import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage]               = useState({});
  const [plans, setPlans]               = useState({});
  const [pendingRequest, setPendingRequest] = useState(null);
  const [loading, setLoading]           = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await API.get('/subscription');
      setSubscription(data.subscription);
      setUsage(data.usage || {});
      setPlans(data.plans || {});
      setPendingRequest(data.pendingRequest || null);
    } catch {
      // Don't crash — subscription fetch failing shouldn't block the app
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  /* ── Helpers ── */
  const isActive     = subscription?.isActive ?? true;
  const plan         = subscription?.plan || 'trial';
  const daysLeft     = subscription?.daysRemaining ?? 14;
  const isTrial      = plan === 'trial';
  const limits       = subscription?.limits || {};

  // Check if a specific resource is at/near limit
  const isAtLimit = (resource) => {
    const limit = limits[resource];
    if (limit === -1 || limit === undefined) return false;
    return (usage[resource] || 0) >= limit;
  };

  const isNearLimit = (resource) => {
    const limit = limits[resource];
    if (limit === -1 || limit === undefined) return false;
    return (usage[resource] || 0) >= limit * 0.8;
  };

  const usagePercent = (resource) => {
    const limit = limits[resource];
    if (!limit || limit === -1) return 0;
    return Math.min(100, Math.round(((usage[resource] || 0) / limit) * 100));
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription, usage, plans, pendingRequest,
      loading, isActive, plan, daysLeft, isTrial, limits,
      isAtLimit, isNearLimit, usagePercent,
      refresh: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);