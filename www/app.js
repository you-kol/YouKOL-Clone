import { Capacitor } from '@capacitor/core';

document.addEventListener('DOMContentLoaded', function () {
  // Check if running in Capacitor
  const isNative = Capacitor.isNativePlatform();

  // You can use this to detect if the app is running on a device and handle platform-specific logic
  if (isNative) {
    console.log('Running on device as native app');
    const platform = Capacitor.getPlatform();
    console.log(`Current platform: ${platform}`); // 'ios' or 'android'
  } else {
    console.log('Running in browser');
  }

  // Add event listeners for app lifecycle events if needed
  document.addEventListener('pause', () => {
    console.log('App paused');
  });

  document.addEventListener('resume', () => {
    console.log('App resumed');
  });
});
