import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/**
 * "Login required" dialog. Accessible modal: role=dialog + aria-modal,
 * labelled by its title, Escape and backdrop close it, focus moves to the
 * primary action on open and returns to the trigger on close.
 */
export function AuthPromptModal({ open, onClose }) {
  const navigate = useNavigate();
  const primaryRef = useRef(null);
  /* Parents pass a fresh onClose each render; read it through a ref so the
     open/close effect runs once per opening, not on every parent render. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    primaryRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="u-modal-overlay" onClick={onClose}>
      <div
        className="u-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        aria-describedby="auth-prompt-text"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="u-modal-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
        <div className="u-modal-icon">
          <Icon name="lock-key" size={32} />
        </div>
        <h2 className="u-modal-title" id="auth-prompt-title">
          Login required
        </h2>
        <p className="u-modal-text" id="auth-prompt-text">
          Log in or create an account to continue.
        </p>
        <button ref={primaryRef} className="u-modal-btn-primary" type="button" onClick={() => goTo('/login')}>
          Log in
        </button>
        <button className="u-modal-btn-secondary" type="button" onClick={() => goTo('/register')}>
          Register
        </button>
      </div>
    </div>
  );
}
