import { useNavigate } from 'react-router-dom';

export function AuthPromptModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="u-modal-overlay" onClick={onClose}>
      <div className="u-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="u-modal-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="u-modal-icon">🔒</div>
        <h2 className="u-modal-title">Login required</h2>
        <p className="u-modal-text">Please login or create an account to continue.</p>
        <button className="u-modal-btn-primary" type="button" onClick={() => goTo('/login')}>
          Login
        </button>
        <button className="u-modal-btn-secondary" type="button" onClick={() => goTo('/register')}>
          Register
        </button>
      </div>
    </div>
  );
}
