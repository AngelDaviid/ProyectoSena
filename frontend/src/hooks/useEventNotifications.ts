import { useContext } from 'react';
import { EventNotificationsContext, type EventNotificationsContextType } from '../context/event-notifications-context';

export function useEventNotifications(): EventNotificationsContextType {
    const context = useContext(EventNotificationsContext);
    if (!context) {
        throw new Error('useEventNotifications must be used within EventNotificationsProvider');
    }
    return context;
}