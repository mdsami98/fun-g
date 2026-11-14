import { useState } from 'react';
import { Icon } from './Icon';

/**
 * Labelled text input following MASTER › Forms:
 *  - visible <label>, 48px input, 16px text
 *  - persistent hint and a specific error BELOW the field, both linked with
 *    aria-describedby; the input gets aria-invalid when in error
 *  - password fields get a 44px show/hide toggle
 * Pass `inputRef` to let the form focus the first invalid field on submit.
 */
export function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  type = 'text',
  inputRef,
  ...inputProps
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const input = (
    <input
      id={id}
      ref={inputRef}
      type={isPassword && revealed ? 'text' : type}
      className="u-input"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      aria-required={optional ? undefined : 'true'}
      {...inputProps}
    />
  );

  return (
    <div className="u-form-group">
      <label className="u-label" htmlFor={id}>
        {label}
        {optional && <span className="u-label-optional">(optional)</span>}
      </label>

      {isPassword ? (
        <div className="u-input-wrap">
          {input}
          <button
            type="button"
            className="u-input-toggle"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            onClick={() => setRevealed((v) => !v)}
          >
            <Icon name={revealed ? 'eye-slash' : 'eye'} size={20} />
          </button>
        </div>
      ) : (
        input
      )}

      {hint && (
        <div className="u-input-hint" id={hintId}>
          {hint}
        </div>
      )}
      {error && (
        <div className="u-field-error" id={errorId}>
          <Icon name="warning-circle" size={16} />
          {error}
        </div>
      )}
    </div>
  );
}

/** Server / global form error — announced, placed above the form. */
export function FormAlert({ children }) {
  if (!children) return null;
  return (
    <div className="u-auth-error" role="alert">
      <Icon name="warning-circle" size={18} />
      <span>{children}</span>
    </div>
  );
}
