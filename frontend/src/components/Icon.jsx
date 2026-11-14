import { ICON_PATHS } from './iconPaths';

/**
 * Single icon family for the whole user panel (Phosphor, inlined — see
 * iconPaths.js). Colour is `currentColor`, so icons follow the text/token
 * colour of their context.
 *
 * Accessibility: icons are decorative by default (aria-hidden). Pass
 * `label` only when the icon carries meaning with no visible text beside it.
 *
 * Sizes follow the icon tokens: 16 (sm) · 20 (md) · 24 (lg) — larger only
 * for illustration (game posters, banner art).
 */
export function Icon({ name, weight = 'bold', size = 20, label, className, ...rest }) {
  const set = ICON_PATHS[name];
  const paths = set?.[weight] ?? set?.bold ?? set?.fill;
  if (!paths) return null;

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };

  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...a11y}
      {...rest}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
