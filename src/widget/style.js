export const desktopWrapperStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 2147483647,
    borderRadius: '16px',
    boxSizing: 'border-box',
    boxShadow: '0 18px 48px rgba(20, 32, 56, 0.22), 0 4px 14px rgba(20, 32, 56, 0.12)',
    overflow: 'hidden',
    background: '#fff'
};

export const desktopClosedWrapperStyleChat = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 2147483647,
    minWidth: '400px',
    boxSizing: 'border-box',
    overflow: 'visible',
    minHeight: '120px'
};

export const mobileClosedWrapperStyle = {
    position: 'fixed',
    bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
    right: 'calc(18px + env(safe-area-inset-right, 0px))',
    zIndex: 2147483647,
    borderRadius: '50%',
    overflow: 'visible',
    boxSizing: 'border-box'
};

export const mobileOpenWrapperStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2147483647,
    width: '100%',
    height: '100vh',
    height: '100dvh',
    overflow: 'hidden',
    boxSizing: 'border-box',
    background: '#fff'
};

export const desktopTitleStyle = {
    height: '52px',
    lineHeight: '52px',
    fontSize: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 18px 0 20px',
    fontFamily: 'Inter, Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#fff',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,.14)',
};

export const mobileTitleStyle = {
    height: 56,
    width: 56,
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 10px 24px rgba(20,32,56,.24), 0 3px 8px rgba(20,32,56,.14)',
    border: '0',
    outline: 'none',
    padding: 0,
    transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 120ms ease'
};
