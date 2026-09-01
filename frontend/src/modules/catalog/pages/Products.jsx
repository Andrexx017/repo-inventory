import { ACTIVE_OPTIONS, useProducts } from '../hooks/useProducts';
import AppShell from '../../../shared/components/AppShell';

export default function Products() {
    const {
        products, totalCount, loading, error,
        search, setSearch,
        categoryId, setCategoryId,
        baseUnitId, setBaseUnitId,
        active, setActive,
        minPrice, setMinPrice,
        maxPrice, setMaxPrice,
        resetFilters,
        categoryOptions,
        baseUnitOptions,
    } = useProducts();

    return (
        <AppShell title="Catálogo">
            <h1 className="page-title">Catálogo de productos</h1>

            {loading && <p>Cargando...</p>}
            {error && <p className="form-error">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="form-card">
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                            <div className="field">
                                <label htmlFor="filter-search">Buscar (SKU o nombre)</label>
                                <input
                                    id="filter-search"
                                    type="text"
                                    placeholder="Ej: DET-5L o Detergente"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="filter-category">Categoría</label>
                                <select id="filter-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                    <option value="">Todas</option>
                                    {categoryOptions.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="filter-unit">Unidad base</label>
                                <select id="filter-unit" value={baseUnitId} onChange={(e) => setBaseUnitId(e.target.value)}>
                                    <option value="">Todas</option>
                                    {baseUnitOptions.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="filter-active">Estado</label>
                                <select id="filter-active" value={active} onChange={(e) => setActive(e.target.value)}>
                                    {ACTIVE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="filter-min-price">Precio ref. mínimo</label>
                                <input
                                    id="filter-min-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="filter-max-price">Precio ref. máximo</label>
                                <input
                                    id="filter-max-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Sin límite"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
                            <span className="text-muted" style={{ fontSize: '13px' }}>
                                {products.length} de {totalCount} productos
                            </span>
                            <button type="button" className="btn-secondary" onClick={resetFilters}>
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Unidad base</th>
                                    <th>Precio referencia</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>{product.sku}</td>
                                        <td>{product.name}</td>
                                        <td>{product.categoryName || '—'}</td>
                                        <td>{product.baseUnitName} ({product.baseUnitAbbreviation})</td>
                                        <td>{product.referencePrice ?? '—'}</td>
                                        <td>
                                            <span className={`status-pill ${product.active ? 'status-pill-active' : 'status-pill-inactive'}`}>
                                                {product.active ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                                            Ningún producto coincide con los filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </AppShell>
    );
}
