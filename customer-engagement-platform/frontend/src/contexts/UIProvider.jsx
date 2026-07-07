import { useCallback, useMemo, useState } from 'react';
import UIContext from './uiContext';

function UIProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const value = useMemo(
    () => ({ isSidebarOpen, toggleSidebar, closeSidebar }),
    [isSidebarOpen, toggleSidebar, closeSidebar],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export default UIProvider;
