import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
}

// Tema compartido por toda la app (Login + Home), no por pantalla:
// se guarda en localStorage y se aplica como atributo en <html> para
// que las variables CSS de shared/theme.css cambien de valor global.
export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }

    return { theme, toggleTheme };
}
