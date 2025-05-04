/**
 * Utility to detect if the app is running in Tauri or web environment
 */
export const isTauri = (): boolean => {
  // Check if window.__TAURI__ exists, which is only present in Tauri context
  return (
    typeof window !== "undefined" &&
    typeof (window as any).__TAURI__ !== "undefined"
  );
};
