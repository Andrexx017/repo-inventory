import './ThemeToggle.css';

export default function ThemeToggle({ theme, onToggle }) {
    const dark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={onToggle}
            className="theme-toggle"
            aria-pressed={dark}
            aria-label={dark ? 'Desactivar modo oscuro' : 'Activar modo oscuro'}
        >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 3v1.5M12 19.5V21M4.6 4.6l1 1M18.4 18.4l1 1M3 12h1.5M19.5 12H21M4.6 19.4l1-1M18.4 5.6l1-1" />
            </svg>

            <span className="theme-toggle-track" data-on={dark}>
                <span className="theme-toggle-knob" />
            </span>

            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
            </svg>
        </button>
    );
}
