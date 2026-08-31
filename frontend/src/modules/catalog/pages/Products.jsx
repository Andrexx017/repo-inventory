import { useProducts } from '../hooks/useProducts';

export default function Products() {
    const { products, loading, error } = useProducts();

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <h1>Catálogo de productos</h1>

            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Nombre</th>
                        <th>Categoria</th>
                        <th>Unidad base</th>
                        <th>Precio referencia</th>
                        <th>Activo</th>
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
                            <td>{product.active ? 'Sí' : 'No'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
