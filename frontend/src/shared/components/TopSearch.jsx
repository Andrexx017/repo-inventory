import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../modules/catalog/api/productsApi';
import './TopSearch.css';

function normalize(text) {
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

// Búsqueda global simple: solo productos (SKU/nombre), reusando el mismo
// endpoint que ya carga Catálogo — sin backend nuevo. Un resultado navega a
// Catálogo con la búsqueda preseleccionada, mismo patrón que ya usa el
// Dashboard para preseleccionar el producto al ir a Inventario.
export default function TopSearch() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        getProducts().then(setProducts).catch(() => {});
    }, []);

    useEffect(() => {
        function onClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const term = normalize(query);
    const matches = term
        ? products.filter((p) => normalize(p.sku).includes(term) || normalize(p.name).includes(term)).slice(0, 6)
        : [];

    function goToProduct(product) {
        setQuery('');
        setOpen(false);
        navigate('/products', { state: { search: product.sku } });
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!query.trim()) return;
        setOpen(false);
        navigate('/products', { state: { search: query.trim() } });
    }

    return (
        <div className="top-search" ref={ref}>
            <form onSubmit={handleSubmit} className="top-search-form">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="app-icon-muted">
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar producto (SKU o nombre)"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                />
            </form>

            {open && matches.length > 0 && (
                <div className="top-search-dropdown">
                    {matches.map((p) => (
                        <button type="button" key={p.id} className="top-search-item" onClick={() => goToProduct(p)}>
                            <span className="top-search-item-name">{p.name}</span>
                            <span className="top-search-item-sku mono">{p.sku}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
