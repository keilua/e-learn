/**
 * Utility for handling Desktop/Browser Notifications
 */

export const requestBrowserPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export const sendBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/vite.svg', // Default icon
        badge: '/vite.svg',
        ...options
      });
    } catch (e) {
      console.error('Error sending browser notification:', e);
    }
  }
};