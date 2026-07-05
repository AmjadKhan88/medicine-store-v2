import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Subscribe to a socket event with automatic cleanup.
 *
 * @param {string|string[]} events  - single event or array of events
 * @param {function}        handler - called with (data) on each event
 * @param {Array}           deps    - extra dependencies for the handler
 */
export function useSocketEvent(events, handler, deps = []) {
  const { on } = useSocket();

  useEffect(() => {
    if (!on) return;
    const eventList = Array.isArray(events) ? events : [events];
    const unsubList = eventList.map(event => on(event, handler));
    return () => unsubList.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, ...deps]);
}