# Estrategia de Pruebas - WEIXTROM

## Tipos de prueba

### Unitarias (Jest)
- Logica de negocio critica: calculos de cotizacion, totales de factura, hitos de alertas legales
- Validadores: placa colombiana, password, email
- Guards y middlewares de autorizacion (RBAC)
- Cobertura minima: 80% en logica de negocio

### Integracion (Supertest + Jest)
- Endpoints de la API con base de datos de prueba
- Flujos criticos: registro -> verificacion -> login -> refresh token
- RBAC: verificar que cada rol solo accede a lo permitido
- Concurrencia: dos talleres no toman la misma solicitud

### E2E (Playwright)
- Flujos completos por rol en el navegador
- Responsive: 3 tamaños (mobile 375px, tablet 768px, desktop 1280px)
- Flujo de pago en sandbox

### Manuales
- Exploratorio en cada demo de sprint
- Usabilidad con el titular
- Revision de seguridad OWASP basica (Sprint 8)

## Herramientas

| Herramienta | Uso |
|-------------|-----|
| Jest | Unitarias + integracion backend |
| Supertest | Tests HTTP de la API |
| Playwright | E2E web |
| Detox (opcional) | E2E mobile |

## Ambientes de prueba

- **CI**: base de datos efimera en GitHub Actions (PostgreSQL service)
- **QA**: ambiente persistente para demos con el titular
- **Local**: Docker Compose con volumen persistente

## Definicion de terminado (DoD)

Una tarjeta solo se mueve a 'Hecho' cuando cumple:

1. Cumple todos sus criterios de aceptacion
2. El codigo esta en la rama principal y el CI esta en verde
3. Tiene pruebas automatizadas si toca logica de negocio critica
4. Fue revisada (code review)
5. Funciona en el ambiente de QA
6. Es responsive y accesible por teclado si incluye interfaz
7. Esta documentada si cambia la API o el modelo de datos
8. No deja defectos criticos abiertos

## Convencion de archivos de prueba

- Backend: `src/**/*.spec.ts` (unitarias), `test/**/*.e2e-spec.ts` (e2e)
- Web: `src/**/*.test.tsx`
- Shared: `src/**/*.test.ts`
