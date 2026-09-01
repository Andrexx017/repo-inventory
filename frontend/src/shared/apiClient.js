const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function request(path, options = {}) {
    const isLogin = path === '/api/auth/login';
    const isBlob = options.responseType === 'blob';

    const token = !isLogin
        ? localStorage.getItem('token')
        : null;

    let response;

    try {
        response = await fetch(API_URL + path, {
            ...options,
            headers: {
                ...(!isBlob && { 'Content-Type': 'application/json' }),

                ...(token && {
                    Authorization: `Bearer ${token}`
                }),

                ...options.headers
            }
        });
    } catch {
        throw new ApiError('No se pudo conectar con el servidor.', 0);
    }

    // Una respuesta binaria (PDF/Excel) exitosa no se puede leer como JSON —
    // sale por acá antes de intentar response.json() más abajo.
    if (response.ok && isBlob) {
        return response.blob();
    }

    // Respuestas sin body (204, 401 sin ProblemDetails, etc.)
    const data = await response.json().catch(() => null);

    // Token inválido o expirado en un endpoint autenticado (no aplica al login mismo,
    // ahí un 401 es simplemente "credenciales incorrectas")
    if (response.status === 401 && !isLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        window.location.href = '/login';

        throw new ApiError(data?.title || 'Sesión expirada', response.status);
    }

    // Otros errores
    if (!response.ok) {
        let message = 'Ha ocurrido un error.';

        if (response.status === 401) {
            message = 'Credenciales inválidas.';
        }
        // Errores de validación 400
        else if (response.status === 400 && data?.errors) {
            message = Object.values(data.errors)
                .flat()
                .join(' ');
        }
        // Otros errores que tengan title
        else if (data?.title) {
            message = data.title;
        }

        throw new ApiError(message, response.status);
    }

    return data;
}


// GET
export async function getJson(path) {
    return request(path, {
        method: 'GET'
    });
}


// POST
export async function postJson(path, body) {
    return request(path, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}


// PUT
export async function putJson(path, body) {
    return request(path, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}


// DELETE
export async function deleteJson(path) {
    return request(path, {
        method: 'DELETE'
    });
}


// GET binario (PDF/Excel u otro archivo) — devuelve un Blob en vez de JSON.
export async function getBlob(path) {
    return request(path, {
        method: 'GET',
        responseType: 'blob'
    });
}


export function setToken(token) {
    localStorage.setItem('token', token);
}

export function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
    return Boolean(localStorage.getItem('token'));
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}