let _setToasts = null;

export const initToast = (setter) => {
  _setToasts = setter;
};

export const showToast = (message, type = 'success') => {
  if (!_setToasts) return;
  const id = Date.now();
  _setToasts(prev => [...prev, { id, message, type }]);
};