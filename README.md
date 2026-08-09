# Mandinka Connect

PROMPT PARA LOVABLE — TRADUCTOR Y DICCIONARIO MANDINKA DE SENEGAL



Quiero crear una aplicación web/PWA profesional especializada en Mandinka de Senegal ↔ Español.



La aplicación debe funcionar como:



1. Traductor de texto

2. Traductor de conversaciones

3. Diccionario Mandinka ↔ Español

4. Pronunciación de palabras y frases

5. Historial de traducciones

6. Favoritos

7. Modo conversación en tiempo real

8. Base de datos lingüística propia y ampliable



1. OBJETIVO PRINCIPAL



La aplicación debe traducir entre:



- 🇸🇳 Mandinka de Senegal → 🇪🇸 Español

- 🇪🇸 Español → 🇸🇳 Mandinka de Senegal



IMPORTANTE:



No quiero que el sistema trate el Mandinka como si fuera simplemente otro idioma africano genérico.



Debe diferenciar:



- Mandinka de Senegal

- Mandinka de Gambia

- Mandinka de Guinea-Bisáu

- Bambara

- Wolof

- Malinké



Cuando no exista una traducción confirmada para una palabra o expresión, la aplicación debe indicarlo claramente.



NUNCA inventar una traducción y presentarla como correcta.



---



2. PANTALLA PRINCIPAL



Crear una interfaz extremadamente sencilla.



Arriba:



Mandinka 🇸🇳 ↔ Español 🇪🇸



Selector:



[ Mandinka ] ⇄ [ Español ]



Debajo:



Campo de texto grande:



"Escribe o habla..."



Botones:



🎤 Hablar

🔊 Escuchar

📋 Copiar

⭐ Guardar



Botón principal:



TRADUCIR



Resultado:



Traducción



Texto traducido.



Pronunciación



Mostrar una pronunciación aproximada para un hispanohablante.



Ejemplo:



Mandinka:

Kini



Español:

Arroz



Pronunciación:

quí-ni



---



3. TRADUCTOR DE TEXTO



Debe permitir introducir:



- palabras

- frases

- conversaciones

- preguntas

- expresiones coloquiales



Ejemplo:



Español:

"¿Cómo estás?"



Resultado:



Mandinka:

"[traducción]"



Pronunciación:

"[pronunciación]"



Debe mostrar también:



Nivel de confianza:



- Confirmada

- Probable

- Aproximada

- No encontrada



No mostrar un resultado inventado como si fuera una traducción confirmada.



---



4. DICCIONARIO



Crear una sección:



📖 Diccionario



Buscador:



"Buscar una palabra..."



Debe permitir buscar en ambas direcciones.



Ejemplo:



Buscar:



kini



Resultado:



Kini



Español:

arroz



Pronunciación:

quí-ni



Categoría:

🍚 Alimentación



Ejemplos:

Frases donde se utiliza la palabra.



También permitir:



Español → Mandinka



Buscar:



"arroz"



Resultado:



kini



---



5. INFORMACIÓN DE CADA PALABRA



Cada entrada del diccionario debe tener:



- Palabra Mandinka

- Traducción española

- Pronunciación aproximada

- IPA si está disponible

- Categoría

- Significados alternativos

- Ejemplos

- Sinónimos

- Variantes regionales

- Fuente

- Nivel de confianza



Ejemplo:



---



KINI



Español:

Arroz



Pronunciación:

quí-ni



Categoría:

Alimentación



Variante:

Mandinka de Senegal



Fuente:

Fuente lingüística documentada



Confianza:

Confirmada



---



6. PRONUNCIACIÓN



La aplicación debe generar audio cuando sea posible.



Botón:



🔊 ESCUCHAR



Debe pronunciar la palabra o frase.



También mostrar una pronunciación escrita pensada para españoles.



Ejemplo:



Mandinka:

kini



Pronunciación:

quí-ni



No utilizar una pronunciación inglesa.



La pronunciación debe estar adaptada a un hablante de español.



---



7. MODO CONVERSACIÓN



Crear una pantalla:



🗣️ Conversación



Dos botones:



🇪🇸 ESPAÑOL



🇸🇳 MANDINKA



Ejemplo:



Usuario habla en español:



"Hola, ¿cómo estás?"



La aplicación:



1. Detecta el audio.

2. Convierte voz → texto.

3. Traduce español → Mandinka.

4. Muestra el Mandinka.

5. Muestra la pronunciación.

6. Reproduce el audio Mandinka.



Después la otra persona puede responder en Mandinka.



Flujo:



🎤 Mandinka

↓

Texto Mandinka

↓

Español

↓

🔊 Audio español



Debe funcionar como una conversación bidireccional.



---



8. BOTÓN DE MICRÓFONO



El usuario debe poder mantener pulsado:



🎤 Hablar



Al soltar:



1. Detectar voz.

2. Transcribir.

3. Detectar idioma.

4. Traducir.

5. Mostrar resultado.

6. Reproducir traducción.



Añadir animación mientras escucha.



---



9. MODO CONVERSACIÓN AUTOMÁTICO



Añadir:



Modo conversación automática



Cuando está activado:



La aplicación escucha.



Si detecta español:

→ traduce a Mandinka.



Si detecta Mandinka:

→ traduce a Español.



Debe mantener un historial visual de la conversación:



👤 Español

"¿Dónde está el mercado?"



🤖 Mandinka

"[traducción]"



🔊 Pronunciación



---



10. BASE DE DATOS LINGÜÍSTICA



NO depender exclusivamente de una IA generativa.



Crear una base de datos:



languages



entries



translations



pronunciations



examples



sources



regional_variants



categories



confidence_scores



conversation_phrases



Cada palabra debe poder tener varias traducciones.



Ejemplo:



entry:

kini



language:

mandinka



region:

senegal



meaning:

arroz



pronunciation:

quí-ni



confidence:

verified



source:

[fuente]



---



11. FUENTES



La aplicación debe permitir registrar la fuente de cada traducción.



Crear campo:



source_name



source_url



source_type



source_date



confidence



Las fuentes pueden incluir:



- diccionarios lingüísticos

- publicaciones académicas

- materiales educativos

- corpus lingüísticos

- hablantes nativos verificados



IMPORTANTE:



No copiar masivamente contenido protegido por copyright.



Utilizar fuentes legítimas y datos que podamos almacenar legalmente.



---



12. SISTEMA CONTRA ALUCINACIONES



Implementar una regla fundamental:



Si la base de datos no contiene una traducción fiable:



NO inventarla.



Mostrar:



"⚠️ No tenemos una traducción suficientemente verificada para esta expresión."



Después puede ofrecer:



"Posible traducción generada por IA"



pero debe aparecer claramente marcada como:



NO VERIFICADA



Nunca presentarla como traducción oficial.



---



13. IA



Utilizar IA para:



- interpretar frases

- detectar contexto

- elegir entre varios significados

- generar ejemplos

- detectar errores

- ayudar con traducciones que no estén literalmente en el diccionario



Pero la IA debe consultar primero la base de datos lingüística.



Prioridad:



1. Entrada verificada

2. Variante regional verificada

3. Corpus/documentación

4. IA contextual

5. Si no hay información suficiente → decir que no se sabe



---



14. DETECCIÓN DE IDIOMA



Detectar automáticamente:



🇪🇸 Español



🇸🇳 Mandinka



Si no puede identificar correctamente el idioma:



Preguntar:



"¿En qué idioma está?"



No confundir Mandinka con:



- Wolof

- Bambara

- Francés

- Inglés

- Malinké



---



15. CATEGORÍAS DEL DICCIONARIO



Crear categorías:



👋 Saludos



👨‍👩‍👧 Familia



🍚 Comida



🏠 Casa



👕 Ropa



🧍 Cuerpo



❤️ Sentimientos



🗣️ Conversación



🏃 Verbos



🔢 Números



📅 Tiempo



🌦️ Clima



🐄 Animales



🌳 Naturaleza



💰 Dinero



🛒 Compras



🏥 Salud



🚗 Transporte



📍 Lugares



💼 Trabajo



🕌 Cultura y religión



❤️ Amor



😡 Insultos y expresiones coloquiales



---



16. FRASES ÚTILES



Crear una sección:



💬 Frases



Ejemplos:



Hola



Buenos días



¿Cómo estás?



Estoy bien.



Gracias.



Por favor.



Sí.



No.



Ven aquí.



Espera.



Date prisa.



¿Dónde estás?



¿Dónde está el mercado?



¿Cuánto cuesta?



Tengo hambre.



Tengo sed.



No entiendo.



Habla más despacio.



¿Qué significa esto?



Etc.



Cada frase debe incluir:



Mandinka



Español



Pronunciación



Audio



---



17. FAVORITOS



Permitir guardar:



⭐ Palabras



⭐ Frases



⭐ Traducciones



Crear sección:



Mis favoritos



---



18. HISTORIAL



Guardar las últimas traducciones.



Cada registro:



Fecha



Texto original



Traducción



Pronunciación



Idioma



Botón escuchar



Botón favorito



Botón eliminar



Permitir borrar todo el historial.



---



19. FUNCIONAMIENTO OFFLINE



La aplicación debe funcionar parcialmente sin Internet.



Guardar localmente:



- diccionario descargado

- favoritos

- historial

- frases básicas



Cuando vuelva Internet:



Sincronizar.



La traducción avanzada por IA requiere conexión.



---



20. DISEÑO



Quiero una interfaz:



- moderna

- limpia

- rápida

- muy intuitiva

- diseñada primero para móvil

- también perfecta en ordenador

- botones grandes

- texto fácil de leer

- navegación sencilla



Menú inferior móvil:



🏠 Inicio

📖 Diccionario

🗣️ Conversación

⭐ Favoritos

⚙️ Ajustes



No llenar la pantalla de funciones innecesarias.



---



21. ADMINISTRADOR DEL DICCIONARIO



Crear panel protegido de administración.



Desde ahí poder:



- añadir palabras

- editar palabras

- eliminar palabras

- añadir traducciones

- añadir pronunciaciones

- añadir ejemplos

- añadir fuentes

- marcar traducción como verificada

- marcar traducción como no verificada

- añadir variantes de Senegal

- importar CSV

- exportar CSV

- buscar duplicados



---



22. IMPORTACIÓN MASIVA



Preparar sistema para importar un CSV con:



mandinka



spanish



pronunciation



ipa



category



example_mandinka



example_spanish



region



source



confidence



Esto permitirá ampliar el diccionario posteriormente con miles de palabras.



---



23. CALIDAD DE DATOS



Antes de guardar una palabra:



Comprobar:



- duplicados

- errores ortográficos

- traducción vacía

- pronunciación vacía

- fuente

- región

- idioma



No mezclar automáticamente variantes de otros idiomas mandé.



---



24. PRIVACIDAD



Las conversaciones del usuario deben almacenarse localmente cuando sea posible.



No guardar grabaciones de voz permanentemente sin consentimiento.



Añadir:



"Eliminar historial"



"Eliminar todos mis datos"



---



25. ARQUITECTURA



Crear una arquitectura preparada para crecer:



Frontend:

React + TypeScript



UI:

Tailwind + componentes modernos



Backend:

API segura



Base de datos:

PostgreSQL/Supabase



Autenticación:

Supabase Auth



Almacenamiento:

Supabase Storage si es necesario



IA:

API configurable mediante variables de entorno.



No colocar claves API directamente en el frontend.



---



26. PRUEBAS AUTOMÁTICAS



Antes de terminar:



Probar:



- traducción español → Mandinka

- Mandinka → español

- búsqueda de palabras

- pronunciación

- micrófono

- conversación

- favoritos

- historial

- modo oscuro

- móvil

- ordenador

- funcionamiento offline

- importación CSV

- administrador

- errores de red

- entradas desconocidas



Corregir automáticamente todos los errores encontrados.



No dar por terminada la aplicación simplemente porque compile.



---



27. REGLA MÁS IMPORTANTE



Esta aplicación NO debe intentar aparentar que sabe algo que no sabe.



Para Mandinka de Senegal:



PRECISIÓN > CANTIDAD



Si una traducción está documentada:



✅ mostrarla.



Si existen varias:



✅ mostrar las variantes.



Si solamente es una posibilidad:



⚠️ marcarla como aproximada.



Si no existe información fiable:



❌ no inventarla.



---



RESULTADO FINAL



Quiero una aplicación que se sienta como:



Google Translate + Diccionario + aplicación de conversación, pero especializada exclusivamente en:



🇸🇳 MANDINKA DE SENEGAL ↔ ESPAÑOL



Debe quedar preparada para ampliar progresivamente la base de datos hasta convertirla en un diccionario completo de Mandinka de Senegal.



Antes de terminar, revisa toda la aplicación, comprueba cada función y corrige todos los errores que encuentres.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mandinka-senegal-lingo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7b790cf-e035-496e-96e6-c42dd29badb4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
