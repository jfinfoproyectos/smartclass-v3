# 📚 Guía Completa de Ayuda - Profesor

Bienvenido a SmartClass. Esta guía completa te ayudará paso a paso a gestionar tus cursos, crear actividades, calificar estudiantes y aprovechar al máximo todas las herramientas disponibles.

---

## 🚀 Primeros Pasos

### Tu Panel de Inicio

Cuando inicias sesión, verás tu **Dashboard de Profesor** con:

- **Resumen de cursos activos**: Todos tus cursos en un vistazo
- **Actividades pendientes de calificar**: Número de entregas sin revisar
- **Notificaciones recientes**: Nuevas entregas y mensajes
- **Próximos eventos**: Fechas límite y eventos importantes

> [!TIP]
> Marca como favoritos los cursos que uses más frecuentemente para acceso rápido.

---

## 📖 Gestión de Cursos

### Ver Mis Cursos

**Paso 1:** Haz clic en **"Cursos"** en el menú lateral

**Paso 2:** Verás todos tus cursos con:
- Nombre del curso
- Número de estudiantes inscritos
- Actividades activas
- Próximas fechas límite

**Paso 3:** Haz clic en un curso para ver sus detalles

### Crear Nuevo Curso

**Paso 1:** En la página de Cursos, haz clic en **"Crear Curso"**

**Paso 2:** Completa el formulario:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Título del curso | Programación en Python |
| **Descripción** | Descripción detallada del curso | Curso introductorio a Python para principiantes |
| **Código** | Código identificador (opcional) | PROG-101 |
| **Fecha de inicio** | Cuándo inicia el curso | 2025-01-15 |
| **Fecha de fin** | Cuándo termina el curso | 2025-06-30 |

**Paso 3:** Haz clic en **"Crear Curso"**

> [!NOTE]
> Los estudiantes podrán inscribirse automáticamente si habilitas la inscripción abierta.

### Editar Información del Curso

**Paso 1:** Abre el curso que deseas editar

**Paso 2:** Haz clic en **"Editar Curso"** (ícono de lápiz)

**Paso 3:** Modifica los campos necesarios:
- Nombre
- Descripción
- Fechas
- Configuración de inscripción

**Paso 4:** Haz clic en **"Guardar Cambios"**

> [!TIP]
> Actualiza la descripción del curso regularmente para reflejar el progreso y temas actuales.

### Gestionar Estudiantes Inscritos

**Ver estudiantes:**

**Paso 1:** Abre el curso

**Paso 2:** Ve a la pestaña **"Estudiantes"**

**Paso 3:** Verás la lista completa con:
- Nombre del estudiante
- Email
- Fecha de inscripción
- Promedio actual
- Progreso (actividades completadas)

**Agregar estudiante manualmente:**

**Paso 1:** En la pestaña Estudiantes, haz clic en **"Agregar Estudiante"**

**Paso 2:** Busca al estudiante por nombre o email

**Paso 3:** Selecciona al estudiante y haz clic en **"Agregar"**

**Remover estudiante:**

**Paso 1:** Localiza al estudiante en la lista

**Paso 2:** Haz clic en el ícono de **eliminar**

**Paso 3:** Confirma la acción

> [!WARNING]
> Remover un estudiante eliminará todas sus entregas y calificaciones en este curso.

### Configurar Inscripción del Curso

**Habilitar inscripción abierta:**

**Paso 1:** Abre el curso

**Paso 2:** Ve a **"Configuración"** → **"Inscripción"**

**Paso 3:** Activa el interruptor **"Inscripción Abierta"**

**Paso 4:** (Opcional) Establece una fecha límite de inscripción

**Paso 5:** Guarda los cambios

**Deshabilitar inscripción:**

Desactiva el interruptor **"Inscripción Abierta"**

> [!NOTE]
> Los estudiantes ya inscritos no se verán afectados al cerrar la inscripción.

---

## 📝 Gestión de Actividades

Las actividades son el corazón de tu curso. Aquí aprenderás a crearlas y gestionarlas efectivamente.

### Tipos de Actividades

SmartClass soporta tres tipos de actividades:

| Tipo | Descripción | Mejor para |
|------|-------------|------------|
| **GitHub** | Entregas de repositorios de GitHub | Proyectos de programación |
| **Manual** | Entregas de archivos o texto | Ensayos, reportes, documentos |
| **Google Colab** | Notebooks de Jupyter | Análisis de datos, ML |

### Crear Nueva Actividad

**Paso 1:** Abre el curso

**Paso 2:** Ve a la pestaña **"Actividades"**

**Paso 3:** Haz clic en **"Nueva Actividad"**

**Paso 4:** Completa el formulario:

#### Información Básica

```
Título: Tarea 1 - Variables y Tipos de Datos
Descripción: Práctica de variables en Python
Tipo: GitHub / Manual / Google Colab
```

#### Enunciado

Escribe las instrucciones detalladas de la actividad. Puedes usar **Markdown** para formato:

```markdown
# Objetivos
- Comprender variables en Python
- Practicar tipos de datos básicos

# Instrucciones
1. Crea un archivo llamado `variables.py`
2. Declara variables de diferentes tipos
3. Imprime los valores

# Entrega
Sube tu código a GitHub y comparte el enlace.
```

#### Configuración

| Campo | Descripción | Recomendación |
|-------|-------------|---------------|
| **Fecha de apertura** | Cuándo estará disponible | Día de la clase |
| **Fecha límite** | Fecha de entrega | 1 semana después |
| **Peso** | Porcentaje de la nota final | 10% |
| **Intentos máximos** | Cuántas veces puede entregar | 3 intentos |

**Paso 5:** Haz clic en **"Crear Actividad"**

> [!TIP]
> Usa fechas de apertura para liberar actividades gradualmente y mantener el ritmo del curso.

### Ejemplos de Buenas Actividades

#### Actividad de Programación

```markdown
# Calculadora Básica en Python

## Objetivos de Aprendizaje
- Implementar funciones en Python
- Manejar entrada del usuario
- Validar datos de entrada

## Descripción
Crea una calculadora que realice operaciones básicas.

## Requisitos
1. Función `sumar(a, b)`
2. Función `restar(a, b)`
3. Función `multiplicar(a, b)`
4. Función `dividir(a, b)` con manejo de división por cero
5. Menú interactivo para el usuario

## Criterios de Evaluación
- Código funcional (40%)
- Manejo de errores (30%)
- Código limpio y comentado (20%)
- Creatividad (10%)

## Entrega
Sube tu código a GitHub con:
- Archivo `calculadora.py`
- Archivo `README.md` con instrucciones de uso
- Ejemplos de ejecución

**Fecha límite:** 2025-01-30 23:59
```

#### Actividad de Ensayo

```markdown
# Análisis de Algoritmos de Ordenamiento

## Objetivo
Comparar y analizar diferentes algoritmos de ordenamiento.

## Instrucciones
Escribe un ensayo de 1000-1500 palabras que:

1. Explique al menos 3 algoritmos de ordenamiento
2. Compare su complejidad temporal
3. Presente casos de uso apropiados
4. Incluya ejemplos visuales o diagramas

## Formato
- Documento PDF
- Fuente: Arial 12pt
- Interlineado: 1.5
- Incluir referencias bibliográficas

## Rúbrica
- Contenido técnico (40%)
- Claridad de explicación (30%)
- Formato y presentación (20%)
- Referencias (10%)

**Fecha límite:** 2025-02-15 23:59
```

### Editar Actividad

**Paso 1:** Abre el curso

**Paso 2:** Localiza la actividad en la lista

**Paso 3:** Haz clic en **"Editar"** (ícono de lápiz)

**Paso 4:** Modifica los campos necesarios

**Paso 5:** Guarda los cambios

> [!WARNING]
> Si cambias la fecha límite después de que estudiantes hayan entregado, las entregas existentes no se verán afectadas.

### Eliminar Actividad

> [!CAUTION]
> Eliminar una actividad eliminará TODAS las entregas y calificaciones asociadas. Esta acción NO se puede deshacer.

**Paso 1:** Haz clic en **"Eliminar"** (ícono de basura)

**Paso 2:** Lee la advertencia cuidadosamente

**Paso 3:** Escribe **"ELIMINAR"** para confirmar

**Paso 4:** Haz clic en **"Confirmar"**

### Reordenar Actividades

**Paso 1:** En la lista de actividades, usa los íconos de **flechas** o **arrastrar y soltar**

**Paso 2:** El orden se guarda automáticamente

> [!TIP]
> Ordena las actividades cronológicamente para que los estudiantes las vean en secuencia lógica.

---

## ✅ Calificación de Estudiantes

La calificación es una de tus tareas más importantes. Aquí te mostramos cómo hacerlo eficientemente.

### Ver Entregas Pendientes

**Opción 1 - Desde el Dashboard:**
- En tu panel de inicio verás el número de entregas pendientes
- Haz clic para ver la lista completa

**Opción 2 - Desde la Actividad:**

**Paso 1:** Abre el curso

**Paso 2:** Haz clic en la actividad

**Paso 3:** Ve a la pestaña **"Entregas"**

**Paso 4:** Verás todas las entregas con estado:
- ✅ **Calificada**: Ya tiene nota
- ⏳ **Pendiente**: Sin calificar
- ⚠️ **Tardía**: Entregada después de la fecha límite

### Calificar una Entrega Individual

**Paso 1:** Haz clic en la entrega del estudiante

**Paso 2:** Revisa el contenido:
- **Para GitHub**: Verás el enlace al repositorio
- **Para Manual**: Verás los archivos adjuntos o texto
- **Para Google Colab**: Verás el enlace al notebook

**Paso 3:** Descarga o revisa el contenido

**Paso 4:** Ingresa la calificación:

```
Calificación: 4.5 (de 0.0 a 5.0)
```

**Paso 5:** Agrega retroalimentación:

```markdown
## Puntos Fuertes
- Código bien estructurado
- Buena documentación
- Manejo correcto de errores

## Áreas de Mejora
- Falta validación en la función dividir
- Podrías agregar más comentarios

## Sugerencias
Revisa el tema de excepciones para mejorar el manejo de errores.

**Nota final: 4.5/5.0**
```

**Paso 6:** Haz clic en **"Guardar Calificación"**

> [!TIP]
> La retroalimentación detallada ayuda a los estudiantes a mejorar. Dedica tiempo a escribir comentarios constructivos.

### Mejores Prácticas para Retroalimentación

✅ **Haz:**
- Sé específico: "La función X podría optimizarse usando Y"
- Sé constructivo: "Buen intento, considera..."
- Destaca lo positivo: "Excelente manejo de..."
- Da ejemplos: "Por ejemplo, podrías hacer..."

❌ **No hagas:**
- Ser vago: "Está mal"
- Ser negativo: "Esto es terrible"
- Solo criticar sin sugerencias
- Usar lenguaje ofensivo

### Calificación con IA (Gemini)

Si el sistema tiene configurada la API de Gemini, puedes usar calificación asistida por IA:

**Paso 1:** Abre la entrega

**Paso 2:** Haz clic en **"Calificar con IA"**

**Paso 3:** La IA analizará el código y generará:
- Calificación sugerida
- Análisis del código
- Puntos fuertes y débiles
- Sugerencias de mejora

**Paso 4:** Revisa y ajusta la calificación si es necesario

**Paso 5:** Edita la retroalimentación según tu criterio

**Paso 6:** Guarda la calificación

> [!NOTE]
> La calificación por IA es una sugerencia. Siempre revisa y ajusta según tu criterio profesional.

### Calificación Masiva

Para actividades simples o cuando tienes muchas entregas:

**Paso 1:** En la lista de entregas, haz clic en **"Calificar Masivamente"**

**Paso 2:** Exporta las entregas a Excel

**Paso 3:** Califica en Excel:

```
Estudiante          | Calificación | Retroalimentación
--------------------|--------------|-------------------
Juan Pérez          | 4.5          | Excelente trabajo
María García        | 4.0          | Buen esfuerzo
```

**Paso 4:** Importa el archivo de vuelta al sistema

> [!WARNING]
> Verifica que el formato del archivo sea correcto antes de importar.

### Gestionar Entregas Tardías

**Configurar política de entregas tardías:**

**Paso 1:** Edita la actividad

**Paso 2:** Ve a **"Configuración Avanzada"**

**Paso 3:** Configura:

```
☐ Aceptar entregas tardías
☑ Aceptar con penalización
  Penalización: 10% por día de retraso
  Máximo de días: 3 días
```

**Calificar entrega tardía:**

Las entregas tardías se marcan automáticamente. Puedes:
- Aplicar la penalización configurada
- Ajustar manualmente la penalización
- No aplicar penalización (casos especiales)

> [!TIP]
> Sé consistente con tu política de entregas tardías para ser justo con todos los estudiantes.

---

## 🔔 Notificaciones

### Ver Notificaciones

**Paso 1:** Haz clic en el ícono de **campana** en el header

**Paso 2:** Verás notificaciones sobre:
- Nuevas entregas de estudiantes
- Preguntas o comentarios
- Recordatorios de fechas límite
- Anuncios del sistema

**Paso 3:** Haz clic en una notificación para ver detalles

### Configurar Preferencias de Notificaciones

**Paso 1:** Ve a tu **Perfil** → **Configuración**

**Paso 2:** En la sección **"Notificaciones"**, configura:

```
☑ Nuevas entregas
☑ Comentarios de estudiantes
☐ Recordatorios diarios
☑ Anuncios importantes
```

**Paso 3:** Configura notificaciones por email:

```
☑ Enviar resumen diario por email
  Hora de envío: 08:00 AM
```

> [!TIP]
> Activa el resumen diario para no perder ninguna entrega importante.


---

## 📊 Estadísticas y Reportes

### Ver Estadísticas del Curso

**Paso 1:** Abre el curso

**Paso 2:** Ve a **"Estadísticas"**

**Paso 3:** Analiza:

#### Rendimiento General
- **Promedio del curso**: 4.2/5.0
- **Tasa de aprobación**: 85%
- **Tasa de entrega**: 92%

#### Distribución de Calificaciones
Gráfico que muestra cuántos estudiantes tienen cada rango de notas.

#### Actividades
- Actividad con mejor rendimiento
- Actividad con peor rendimiento
- Actividades con más entregas tardías

#### Estudiantes
- Top 10 estudiantes
- Estudiantes en riesgo (promedio < 3.0)
- Estudiantes con entregas faltantes

> [!TIP]
> Usa las estadísticas para identificar temas difíciles y ajustar tu enseñanza.

### Exportar Calificaciones

**Formato Excel:**

**Paso 1:** Abre el curso

**Paso 2:** Ve a **"Calificaciones"**

**Paso 3:** Haz clic en **"Exportar a Excel"**

**Paso 4:** Selecciona qué incluir:

```
☑ Todas las actividades
☑ Promedios
☑ Estadísticas individuales
☐ Retroalimentación
```

**Paso 5:** Descarga el archivo

**Formato PDF:**

Similar al proceso de Excel, pero genera un PDF formateado para impresión o reportes oficiales.

---

## 💡 Consejos y Mejores Prácticas

### Organización del Curso

✅ **Estructura clara:**
```
Semana 1: Introducción
  - Actividad 1: Variables
  - Actividad 2: Operadores

Semana 2: Control de Flujo
  - Actividad 3: Condicionales
  - Actividad 4: Bucles
```

✅ **Nomenclatura consistente:**
```
Tarea 1 - Variables
Tarea 2 - Operadores
Examen 1 - Parcial
Proyecto 1 - Calculadora
```

### Comunicación con Estudiantes

✅ **Sé proactivo:**
- Publica anuncios antes de fechas límite
- Responde preguntas rápidamente
- Da retroalimentación oportuna

✅ **Sé claro:**
- Instrucciones detalladas en actividades
- Criterios de evaluación explícitos
- Expectativas claras desde el inicio

### Gestión del Tiempo

✅ **Planifica con anticipación:**
- Crea todas las actividades al inicio del semestre
- Usa fechas de apertura automáticas
- Programa recordatorios para calificar

✅ **Usa herramientas:**
- Calificación masiva para tareas simples
- IA para análisis inicial de código
- Exporta datos para análisis offline

---

## 🆘 Solución de Problemas

### No puedo ver un curso

**Verifica:**
- ¿Estás asignado como profesor de ese curso?
- ¿El curso está activo?

**Solución:**
Contacta al administrador para verificar la asignación.

### Estudiante no puede entregar

**Verifica:**
- ¿La fecha límite ya pasó?
- ¿El estudiante alcanzó el máximo de intentos?
- ¿La actividad está publicada?

**Solución:**
- Extiende la fecha límite si es necesario
- Aumenta el número de intentos permitidos

### Error al calificar

**Verifica:**
- ¿La calificación está en el rango válido (0.0-5.0)?
- ¿Hay conexión a internet?

**Solución:**
- Verifica el formato de la calificación
- Intenta nuevamente
- Contacta soporte si persiste

---

## 📞 Soporte

Si necesitas ayuda adicional:

1. **Documentación**: Consulta esta guía
2. **Administrador**: Contacta al administrador del sistema
3. **Soporte técnico**: Reporta problemas técnicos

---

**Última actualización:** Diciembre 2025
