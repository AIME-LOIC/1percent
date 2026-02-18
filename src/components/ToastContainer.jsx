function ToastContainer({ toasts, onDismiss }) {
  const iconForType = (type) => {
    if (type === 'success') return 'fa-solid fa-check';
    if (type === 'error') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-info';
  };

  return (
    <div id="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type || 'info'}`} key={toast.id} onClick={() => onDismiss(toast.id)}>
          <div className="icon">
            <i className={iconForType(toast.type)} aria-hidden="true"></i>
          </div>
          <div>{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
