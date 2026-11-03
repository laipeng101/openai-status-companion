# OpenAI Status Companion

Consulta el estado oficial de los servicios de OpenAI sin salir del chat. Este script de usuario independiente utiliza datos de **status.openai.com**; no es un producto de OpenAI ni mide la disponibilidad de tu cuenta personal o de un sitio de terceros.

## Sitios compatibles

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Qué muestra

- En el modo de posición automática, un botón compacto de estado se coloca junto a la barra lateral izquierda y la sigue al expandirse, contraerse o cambiar de ancho. En ventanas estrechas, el botón permanece en una esquina y el panel se mantiene dentro del área visible.
- Grupos oficiales de componentes, incidentes actuales, mantenimiento programado y la hora de la última consulta correcta.
- 13 idiomas de interfaz: inglés, chino simplificado, chino tradicional, español, hindi, portugués de Brasil, japonés, coreano, francés, alemán, indonesio, árabe y ruso. Incluye detección automática según la página o el navegador y selección manual. El árabe usa una disposición de derecha a izquierda. Los títulos y mensajes oficiales de los incidentes se conservan en su idioma original; no se utiliza ningún servicio de traducción.
- El tema claro u oscuro puede seguir al del sitio web. También hay controles manuales de tema y esquina, acceso mediante teclado y cierre con Escape.
- El estado se actualiza cada 60 segundos mientras la página está visible; las consultas periódicas se pausan en segundo plano. El tiempo de espera de las solicitudes es de 15 segundos. Si una actualización falla, se conservan los datos en caché claramente identificados.
- Los datos de compatibilidad incompletos se marcan explícitamente como sin verificar; no se muestran como una confirmación de que todo funciona correctamente.

## Instalación y uso

Instala un gestor de scripts de usuario, como Tampermonkey, y pulsa **Instalar este script** arriba. Abre un sitio compatible, pulsa el botón de estado y usa el botón del engranaje para abrir las preferencias. Si el gestor requiere configurar el navegador para ejecutar scripts de usuario, sigue sus instrucciones oficiales de instalación.

## Privacidad y permisos

Las consultas de estado son solicitudes GET anónimas a `status.openai.com`, sin cookies de cuenta. El script consulta la geometría de la barra lateral y los atributos de idioma y tema de la página; no lee ni envía mensajes, conversaciones o tokens de cuenta. Solo se guardan localmente sus preferencias y una huella para evitar avisos de estado duplicados. No incluye analítica, anuncios, dependencias ejecutables remotas ni servicios de traducción de terceros.

## Código fuente y soporte

[Código fuente, documentación y seguimiento de incidencias](https://github.com/laipeng101/openai-status-companion). Licencia MIT. El script completo y legible está alojado aquí; el código fuente y las descripciones localizadas se sincronizan automáticamente mediante un webhook de push de GitHub. Instala y actualiza a través de Greasy Fork.

Las pruebas incluyen regresiones automatizadas, comprobaciones en Chrome con páginas de prueba en tamaños de escritorio y de 390 px de ancho, e integración del diseño en el sitio real de Leopard-X reproduciendo datos públicos de estado. Consulta el [documento de validación](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) del repositorio para conocer los resultados y el alcance de las pruebas. El diseño de los sitios compatibles puede cambiar a medida que evolucionan.
