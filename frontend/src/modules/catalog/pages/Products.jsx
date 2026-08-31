import { useProducts } from '../hooks/useProducts';
import AppShell from '../../../shared/components/AppShell';

export default function Products() {
    const { products, loading, error } = useProducts();

    return (
        <AppShell title="Catálogo">
            <h1 className="page-title">Catálogo de productos</h1>

            {loading && <p>Cargando...</p>}
            {error && <p className="form-error">{error}</p>}

            {!loading && !error && (
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
                        </tbody>
                    </table>
                </div>
            )}
        </AppShell>
    );
}
