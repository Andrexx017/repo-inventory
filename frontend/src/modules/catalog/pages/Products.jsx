import { ACTIVE_OPTIONS, useProducts } from '../hooks/useProducts';
import AppShell from '../../../shared/components/AppShell';
import './Products.css';

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

function PencilIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
        newCategoryName, setNewCategoryName,
        newCategoryDescription, setNewCategoryDescription,
        categoryFormError,
        isCategoryModalOpen,
        openCategoryModal,
        closeCategoryModal,
        handleCreateCategory,
    } = useProducts();

    return (
        <AppShell title="Catálogo">
            {loading && <p>Cargando...</p>}
            {error && <p className="form-error">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="form-card">
                        <div className="pcat-filter-row">
                            <div className="pcat-filter-fields">
                                <div className="field pcat-field-search">
                                    <label htmlFor="filter-search">Buscar</label>
                                    <input
                                        id="filter-search"
                                        type="text"
                                        placeholder="SKU o nombre — ej: DET-5L"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <div className="field pcat-field-sm">
                                    <label htmlFor="filter-category">Categoría</label>
                                    <select id="filter-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                        <option value="">Todas</option>
                                        {categoryOptions.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field pcat-field-sm">
                                    <label htmlFor="filter-unit">Unidad</label>
                                    <select id="filter-unit" value={baseUnitId} onChange={(e) => setBaseUnitId(e.target.value)}>
                                        <option value="">Todas</option>
                                        {baseUnitOptions.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field pcat-field-xs">
                                    <label htmlFor="filter-active">Estado</label>
                                    <select id="filter-active" value={active} onChange={(e) => setActive(e.target.value)}>
                                        {ACTIVE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field pcat-field-xs">
                                    <label htmlFor="filter-min-price">Mín. $</label>
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

                                <div className="field pcat-field-xs">
                                    <label htmlFor="filter-max-price">Máx. $</label>
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

                            {isGeneralAdmin && (
                                <div className="btn-group pcat-filter-actions">
                                    <button type="button" className="btn-secondary btn-secondary-success" onClick={openCategoryModal}>
                                        <PlusIcon />
                                        Nueva categoría
                                    </button>
                                    <button type="button" className="btn-secondary btn-secondary-success" onClick={openUnitModal}>
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

                        <div className="pcat-filter-footer">
                            <span className="text-muted" style={{ fontSize: '13px' }}>
                                {totalCount} producto{totalCount === 1 ? '' : 's'} encontrado{totalCount === 1 ? '' : 's'}
                            </span>
                            <button type="button" className="btn-secondary" style={{ marginLeft: 0 }} onClick={resetFilters}>
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="table-card pcat-table-card">
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
                                                <button type="button" className="btn-icon-square" onClick={() => handleEditProduct(product)} aria-label="Editar producto" title="Editar">
                                                    <PencilIcon />
                                                </button>
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
                                <button type="button" className="btn-secondary btn-secondary-danger" onClick={resetProductForm}>Cancelar</button>
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
                                <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeUnitModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <div className="modal-overlay" onClick={closeCategoryModal}>
                    <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nueva categoría</h2>
                            <button type="button" className="modal-close" onClick={closeCategoryModal} aria-label="Cerrar">
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="field">
                                    <label htmlFor="category-name">Nombre</label>
                                    <input
                                        id="category-name"
                                        placeholder="Ej: Panadería"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="category-description">Descripción (opcional)</label>
                                    <input
                                        id="category-description"
                                        placeholder="Ej: Panes, tortas y pastelería"
                                        value={newCategoryDescription}
                                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                                    />
                                </div>

                                {categoryFormError && <p className="form-error" style={{ marginBottom: 0 }}>{categoryFormError}</p>}
                            </div>

                            <div className="modal-footer">
                                <button type="submit" className="btn-primary">AGREGAR CATEGORÍA</button>
                                <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeCategoryModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
