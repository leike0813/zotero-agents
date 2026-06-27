# Guía de instalación

## Requisitos del sistema

- **Zotero**: 7.0 o posterior (se recomienda Zotero 9)
- **Plataforma**: Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **Sobre las versiones de Zotero**: Este complemento se desarrolla y prueba en Zotero 9. Zotero 8 está teóricamente soportado en su totalidad (el marco de complementos no tiene cambios significativos entre Zotero 8/9); Zotero 7 también debería estar soportado en teoría, pero no ha sido probado exhaustivamente debido a recursos limitados. El mantenimiento futuro se centrará en Zotero 9. Si encuentras problemas en Zotero 7, por favor repórtalos en [Issues](https://github.com/leike0813/zotero-agents/issues).

## Instalación del complemento

### Desde GitHub/Gitee Release (recomendado)

1. Visita [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) o [Gitee Releases Mirror](https://gitee.com/leike0813/zotero-agents/releases)
2. Descarga el archivo `.xpi` más reciente
3. En Zotero, abre **Tools → Add-ons**
4. Haz clic en el icono de engranaje y selecciona **Install Add-on From File...**
5. Selecciona el archivo `.xpi` descargado

### A través del Zotero Plugin Marketplace

Si tienes instalado el complemento [Zotero Plugin Marketplace](https://github.com/syt2/zotero-addons), puedes buscar e instalar Zotero Agents directamente desde el marketplace:

1. Haz clic en el icono ![](/img/zotero-addons_icon.png) en la barra de herramientas de Zotero para abrir el marketplace
2. Busca **Zotero Agents**
3. Haz clic en instalar

### Compilación desde el código fuente

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

El resultado de la compilación se encuentra en el directorio `.scaffold/build/`.

## Instalación de paquetes de flujo de trabajo oficiales

El complemento se distribuye **sin lógica de negocio integrada**. Todos los flujos de trabajo se proporcionan a través de paquetes de flujo de trabajo oficiales separados.

### Método 1: Instalación desde el menú (recomendado)

1. Después de reiniciar Zotero, haz clic derecho en cualquier elemento → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. El complemento descarga automáticamente los paquetes oficiales más recientes desde GitHub / Gitee
3. Una notificación de éxito aparece al completar; todos los flujos de trabajo oficiales serán visibles en el Dashboard

### Método 2: Instalación desde Preferencias

1. Abre **Zotero → Settings → Zotero Agents**
2. En la sección **Workflow Settings**, haz clic en **Install Official Workflow Packages**
3. También puedes cambiar el canal de actualización (stable / beta / dev) aquí y buscar actualizaciones

### Mecanismo de actualización

- El complemento busca automáticamente nuevas versiones de los paquetes oficiales al iniciarse
- Un cuadro de diálogo de confirmación aparece cuando hay una nueva versión disponible
- La lista de flujos de trabajo se recarga automáticamente después de la actualización

Repositorio de paquetes de flujo de trabajo oficiales: [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Espejo en Gitee](https://gitee.com/leike0813/zotero-agents-workflows)

## Verificación de la instalación

1. Reinicia Zotero
2. Deberías ver el icono de **Zotero Agents** en la barra de herramientas de Zotero
3. Haz clic derecho en cualquier elemento — el submenú **Zotero Agents** debería aparecer (con los flujos de trabajo disponibles)

Si el menú de clic derecho solo muestra la opción **📦 Install Official Workflow Packages**, los paquetes oficiales aún no han sido instalados — sigue las instrucciones anteriores para instalarlos. Después de una instalación exitosa, dirígete a [Primeros pasos](/getting-started) para configurar un backend y ejecutar tu primer flujo de trabajo.
