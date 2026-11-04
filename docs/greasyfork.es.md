# OpenAI Status Companion

Consulta el estado oficial de los servicios de OpenAI sin salir del chat. Este script de usuario independiente utiliza datos de **status.openai.com**; no es un producto de OpenAI ni mide la disponibilidad de tu cuenta personal o de un sitio de terceros.

## Sitios compatibles

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Qué muestra

- Con la posición automática, el botón de estado sigue a la barra lateral izquierda. El botón, el panel y los avisos se desplazan para dejar libres los menús, los campos de texto y otros controles. Si no hay espacio, pueden ocultarse temporalmente.
- Consulta los componentes por grupo, los incidentes en curso, el mantenimiento programado y la hora de la última consulta correcta.
- Elige el [idioma de la interfaz](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) o deja que el script siga el idioma de la página o del navegador. Los títulos y mensajes oficiales de los incidentes se muestran en su idioma original.
- El tema puede seguir al del sitio web. También puedes elegir un tema y una esquina de la pantalla. Usa el teclado para navegar y Esc para cerrar el panel.
- El estado se actualiza cada 60 segundos mientras la página está visible; las consultas periódicas se pausan en segundo plano. El tiempo de espera de las solicitudes es de 15 segundos. Si una actualización falla, se conservan los datos en caché claramente identificados.
- Si el script usa la API anterior, las secciones cuyos datos no se pudieron comprobar se marcan como no verificadas.

## Instalación y uso

Instala un gestor de scripts de usuario, como Tampermonkey, y pulsa **Instalar este script** arriba. Abre un sitio compatible, pulsa el botón de estado y usa el botón del engranaje para abrir las preferencias. Si el gestor requiere configurar el navegador para ejecutar scripts de usuario, sigue sus instrucciones oficiales de instalación.

## Privacidad y permisos

El script envía solicitudes GET anónimas a `status.openai.com` sin cookies de cuenta. Comprueba la posición, el tamaño y la visibilidad de los elementos de la página y consulta el idioma y el tema. No lee ni envía mensajes, conversaciones ni tokens de cuenta. Guarda tus preferencias y un registro para evitar avisos duplicados en el dispositivo. No incluye seguimiento de uso, anuncios, código ejecutable remoto ni servicios de traducción de terceros.

## Código fuente y soporte

[Código fuente, documentación y seguimiento de incidencias](https://github.com/laipeng101/openai-status-companion). Licencia MIT. El script completo y legible está alojado aquí; el código fuente y las descripciones localizadas se sincronizan automáticamente mediante un webhook de push de GitHub. Instala y actualiza a través de Greasy Fork.

Las pruebas incluyen comprobaciones automatizadas, revisiones del diseño en Chrome con una página de prueba local en pantalla de escritorio y a 390 px de ancho, y comprobaciones en Leopard-X con datos públicos de estado guardados previamente. Consulta los resultados y el alcance en el [documento de validación](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md). Los cambios en los sitios pueden afectar a la posición del botón y del panel.

[Registro de cambios](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Idiomas disponibles](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
