# Comparativo de Pasarelas de Pago - WEIXTROM

## Opciones evaluadas

| Criterio | Wompi | ePayco | MercadoPago |
|----------|-------|--------|-------------|
| Comision tarjeta | 2.99% + $900 | 2.99% + $900 | 3.49% + $900 |
| Comision PSE | $3,500 fija | $3,200 fija | $3,500 fija |
| Split de pagos | Si (marketplace) | Si (split) | Si (marketplace) |
| Sandbox gratuito | Si | Si | Si |
| Documentacion | Excelente (REST) | Buena | Buena |
| Webhook | Si (firma HMAC) | Si | Si (IPN) |
| SDK Node.js | Oficial | Oficial | Oficial |
| Tiempo afiliacion | 5-10 dias habiles | 5-15 dias habiles | 3-7 dias habiles |
| Soporte Colombia | Si (Bancolombia) | Si | Si |

## Recomendacion

**Wompi** es la mejor opcion para WEIXTROM porque:
1. Documentacion mas clara y moderna (REST puro)
2. Webhook con firma HMAC (seguridad verificable)
3. Soporte nativo de split/marketplace (necesario si la plataforma cobra comision)
4. Respaldada por Bancolombia (confianza para el usuario)
5. Sandbox sin requisitos de afiliacion

## Accion requerida del titular

- [ ] Decidir pasarela (recomendamos Wompi)
- [ ] Iniciar tramite de afiliacion comercial (requiere RUT, camara de comercio)
- [ ] Definir si la plataforma cobra comision por transaccion (split de pagos)

## Sandbox (ya disponible para desarrollo)

Wompi sandbox se usa con credenciales de prueba publicas.
No requiere afiliacion para desarrollo. Solo se necesita afiliacion para produccion (Sprint 7).
