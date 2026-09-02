import { ACTIVE_OPTIONS, useProducts } from '../hooks/useProducts';
import AppShell from '../../../shared/components/AppShell';

function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

export default function Products() {
    const {
        products, totalCount, page, setPage, totalPages, loading, error, isGeneralAdmin,
        search, setSearch,
        categoryId, setCategoryId,
        baseUnitId, setBaseUnitId,
        active, setActive,
        minPrice, setMinPrice,
        maxPrice, setMaxPrice,
        resetFilters,
        categoryOptions,
        baseUnitOptions,
        categories,
        units,
        sku, setSku,
        name, setName,
        description, setDescription,
        formCategoryId, setFormCategoryId,
        formBaseUnitId, setFormBaseUnitId,
        referencePrice, setReferencePrice,
        formActive, setFormActive,
        editingId,
        formError,
        isProductModalOpen,
        handleProductSubmit,
        handleEditProduct,
        openCreateProductModal,
        resetProductForm,
        newUnitName, setNewUnitName,
        newUnitAbbreviation, setNewUnitAbbreviation,
        unitFormError,
        isUnitModalOpen,
        openUnitModal,
        closeUnitModal,
        handleCreateUnit,
    } = useProducts();

    return (
        <AppShell title="Catálogo">
            <div className="action-row">
                <h1 className="page-title">Catálogo de productos</h1>

                {isGeneralAdmin && (
                    <div className="btn-group">
                        <button type="button" className="btn-secondary" onClick={openUnitModal}>
                            <PlusIcon />
                            Nueva unidad de medida
                        </button>
                        <button type="button" className="btn-primary" onClick={openCreateProductModal}>
                            <PlusIcon />
                            Nuevo producto
                        </button>
                    </div>
                )}
            </div>

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
                                {totalCount} producto{totalCount === 1 ? '' : 's'} encontrado{totalCount === 1 ? '' : 's'}
                            </span>
                            <button type="button" className="btn-secondary" style={{ marginLeft: 0 }} onClick={resetFilters}>
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
                                    {isGeneralAdmin && <th></th>}
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
                                        {isGeneralAdmin && (
                                            <td>
                                                <button type="button" className="table-action" onClick={() => handleEditProduct(product)}>Editar</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}

                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={isGeneralAdmin ? 7 : 6} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                                            Ningún producto coincide con los filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="inv-pagination">
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Anterior
                        </button>
                        <span className="mono text-muted">Página {page} de {totalPages}</span>
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}

            {isProductModalOpen && (
                <div className="modal-overlay" onClick={resetProductForm}>
                    <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingId === null ? 'Nuevo producto' : 'Editar producto'}</h2>
                            <button type="button" className="modal-close" onClick={resetProductForm} aria-label="Cerrar">
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleProductSubmit}>
                            <div className="modal-body">
                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="field">
                                        <label htmlFor="product-sku">SKU</label>
                                        <input
                                            id="product-sku"
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            disabled={editingId !== null}
                                            required
                                        />
                                    </div>

                                    <div className="field">
                                        <label htmlFor="product-name">Nombre</label>
                                        <input
                                            id="product-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                                        <label htmlFor="product-description">Descripción</label>
                                        <input
                                            id="product-description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="field">
                                        <label htmlFor="product-category">Categoría</label>
                                        <select
                                            id="product-category"
                                            value={formCategoryId}
                                            onChange={(e) => setFormCategoryId(e.target.value)}
                                        >
                                            <option value="">Sin categoría</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field">
                                        <label htmlFor="product-base-unit">Unidad base</label>
                                        <select
                                            id="product-base-unit"
                                            value={formBaseUnitId}
                                            onChange={(e) => setFormBaseUnitId(e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccione una unidad</option>
                                            {units.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="field">
                                        <label htmlFor="product-price">Precio referencia</label>
                                        <input
                                            id="product-price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={referencePrice}
                                            onChange={(e) => setReferencePrice(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {editingId !== null && (
                                    <label className="field-checkbox" htmlFor="product-active">
                                        <input
                                            id="product-active"
                                            type="checkbox"
                                            checked={formActive}
                                            onChange={(e) => setFormActive(e.target.checked)}
                                        />
                                        Activo
                                    </label>
                                )}

                                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
                            </div>

                            <div className="modal-footer">
                                <button type="submit" className="btn-primary">
                                    {editingId === null ? 'CREAR PRODUCTO' : 'GUARDAR CAMBIOS'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={resetProductForm}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isUnitModalOpen && (
                <div className="modal-overlay" onClick={closeUnitModal}>
                    <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nueva unidad de medida</h2>
                            <button type="button" className="modal-close" onClick={closeUnitModal} aria-label="Cerrar">
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUnit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="field">
                                    <label htmlFor="unit-name">Nombre</label>
                                    <input
                                        id="unit-name"
                                        placeholder="Ej: Mililitro"
                                        value={newUnitName}
                                        onChange={(e) => setNewUnitName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="unit-abbreviation">Abreviatura</label>
                                    <input
                                        id="unit-abbreviation"
                                        placeholder="Ej: ML"
                                        value={newUnitAbbreviation}
                                        onChange={(e) => setNewUnitAbbreviation(e.target.value)}
                                        required
                                    />
                                </div>

                                {unitFormError && <p className="form-error" style={{ marginBottom: 0 }}>{unitFormError}</p>}
                            </div>

                            <div className="modal-footer">
                                <button type="submit" className="btn-primary">AGREGAR UNIDAD</button>
                                <button type="button" className="btn-secondary" onClick={closeUnitModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
