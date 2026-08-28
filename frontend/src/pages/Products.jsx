import { useEffect, useState } from 'react';
import { getJson } from '../apiClient';

export default function Products() 
{
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');  

    async function load()
    {
        try
        {
            const data = await getJson('/api/products');
            setProducts(data);
        } 
        catch(err)
        {
            setError(err.message || 'No se pudieron cargar los productos.')
        }
        finally
        {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

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
    )
}