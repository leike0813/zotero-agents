# Lector de Markdown integrado

## Descripción general

El complemento incluye un lector de Markdown ligero. Cuando haces **doble clic en cualquier archivo adjunto `.md`** en Zotero, se abre automáticamente en el lector integrado, eliminando la necesidad de cambiar a una aplicación externa.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/markdown-reader.webp" alt="Página del lector de Markdown integrado" title="Página del lector de Markdown integrado" loading="lazy" /><figcaption>Página del lector de Markdown integrado</figcaption></figure>

El lector está habilitado de forma predeterminada. Para desactivarlo (volviendo al abridor predeterminado del sistema), desmarca la opción en **Preferences → General**.

## Funciones

### Navegación por esquema

La barra lateral izquierda analiza automáticamente los niveles de encabezado (h1–h4) del documento. Haz clic en cualquier encabezado para saltar rápidamente a la sección correspondiente.

### Búsqueda de texto completo

El cuadro de búsqueda en la barra de herramientas soporta búsqueda de palabras clave con resaltado de coincidencias.

### Renderizado de Markdown

- **Bloques de código**: resaltado de sintaxis highlight.js para los principales lenguajes de programación
- **Fórmulas matemáticas**: renderizado KaTeX para fórmulas LaTeX, soportando visualización en línea y en bloque
- **Tablas, listas, citas**: soporte completo para la sintaxis estándar de Markdown
- **Imágenes**: las imágenes con rutas relativas se cargan automáticamente

### Tamaño de fuente y ancho

- **Ajuste de tamaño de fuente**: ajustable de 12px a 24px; haz clic en los botones +/- de la barra de herramientas para ajustar de forma incremental
- **Ancho de lectura**: soporta modos estrecho (860px) y ancho (1160px) para diferentes tamaños de pantalla

### Acciones de la barra de herramientas

| Botón | Función |
|-------|---------|
| Cuadro de búsqueda | Búsqueda de palabras clave en todo el texto |
| Actualizar | Relee el archivo y renderiza de nuevo |
| Copiar Markdown | Copia el contenido Markdown sin formato al portapapeles |
| Copiar ruta | Copia la ruta del archivo al portapapeles |
| Tamaño de fuente - | Reduce el tamaño de fuente |
| Tamaño de fuente + | Aumenta el tamaño de fuente |
| Alternar ancho | Cambia entre modo de lectura estrecho/ancho |
| Volver arriba | Desplazamiento suave hasta la parte superior del documento |
| Abrir externamente | Abre el archivo con la aplicación predeterminada del sistema |

### tematización automática

El lector se adapta automáticamente al tema claro/oscuro de Zotero sin necesidad de cambiarlo manualmente.

## Preferencias

En **Zotero → Settings → Zotero Agents → General**:

- **Enable Built-in Markdown Reader**: cuando está marcado, hacer doble clic en archivos adjuntos `.md` los abre en el lector integrado; cuando está desmarcado, se restaura el abridor predeterminado del sistema.

## Notas técnicas

- Motor de renderizado: `markdown-it` + KaTeX + highlight.js
- Seguridad: saneamiento integrado de HTML que elimina etiquetas no seguras y controladores de eventos como script/style/iframe
- Tipos de archivo soportados: `.md`, `.markdown` (detectados tanto por extensión de archivo como por tipo MIME)
