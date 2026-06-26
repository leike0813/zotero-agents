# Configuración del backend HTTP genérico

## Propósito

El backend HTTP genérico se utiliza para enviar solicitudes HTTP sin procesar a cualquier URL. No ejecuta skills de agente, sino que funciona como un cliente HTTP de propósito general.

## Caso de uso principal: Análisis de documentos con MinerU

El uso principal del backend HTTP genérico es dar soporte al **Workflow MinerU** — un workflow de análisis de documentos PDF.

MinerU es un servicio de análisis de documentos que convierte archivos PDF a formato Markdown. El Workflow MinerU envía solicitudes al servicio MinerU a través del backend HTTP genérico para obtener los resultados del análisis.

### Configurar MinerU

1. Visita [mineru.net](https://mineru.net) para registrar una cuenta, y obtén un API Token en la página **API → API Management**
2. Abre **Herramientas → [Backend Manager](backend-manager)**
3. Cambia a la pestaña **HTTP genérico**
4. Haz clic en **Añadir HTTP genérico**
5. Rellena:

| Campo | Valor |
|-------|-------|
| Nombre a mostrar | `MinerU Official` |
| URL base | `https://mineru.net` |
| Autenticación | `bearer` |
| Token de autenticación | Pega tu API Token |
| Tiempo de espera | `600000` (10 minutos) |

6. Haz clic en **Guardar** en la esquina inferior derecha

## Campos de configuración

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| Nombre a mostrar | Sí | Nombre visible del backend |
| URL base | Sí | Dirección base del servicio HTTP |
| Bearer Token | No | Token de autenticación |
| Tiempo de espera | No | Tiempo de espera de la solicitud (milisegundos) |

## Detalles técnicos

El backend HTTP genérico admite:
- **Solicitudes de un solo paso**: `generic-http.request.v1` — Enviar una única solicitud HTTP
- **Pipelines de múltiples pasos**: `generic-http.steps.v1` — Solicitudes encadenadas con extracción de rutas JSON (expresiones `$.*`), extrayendo valores de respuestas anteriores como parámetros para solicitudes posteriores
- **Subidas multipart**: Soporte para subida de archivos
- Mecanismos de sondeo y reintento

## Próximos pasos

- [Conocer los Workflows](../workflows/) — Los backends HTTP genéricos se utilizan principalmente para workflows específicos
