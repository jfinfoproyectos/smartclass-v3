import { 
  AlertCircle, BadgeCheck, Layout, Terminal as TerminalIcon, FileJson, 
  ChevronRight, Info, Type, MousePointer2, Table as TableIcon, GitBranch, 
  Image as ImageIcon, Columns, LayoutList, Video, Music, FolderTree, Activity,
  Code2, Sparkles, Map, Github, Keyboard
} from "lucide-react";

export type PropType = "text" | "number" | "boolean" | "select" | "icon" | "content" | "json";

export interface MdxComponentProp {
  name: string;
  label: string;
  type: PropType;
  default?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  description?: string;
}

export interface MdxComponentConfig {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: "Base" | "Layout" | "Interactivos" | "Multimedia" | "Científico" | "Utilidades";
  props: MdxComponentProp[];
  template: (props: Record<string, any>) => string;
}

export const MDX_REGISTRY: MdxComponentConfig[] = [
  // --- UTILIDADES (05-utilidades) ---
  {
    id: "Alert",
    title: "Alerta",
    category: "Utilidades",
    description: "Muestra un mensaje destacado con diferentes niveles de severidad.",
    iconName: "AlertCircle",
    props: [
      { name: "variant", label: "Variante", type: "select", default: "info", options: [
        { label: "Información", value: "info" },
        { label: "Éxito", value: "success" },
        { label: "Advertencia", value: "warning" },
        { label: "Error", value: "error" },
      ], description: "Define el color y el icono del mensaje." },
      { name: "title", label: "Título", type: "text", placeholder: "Ej: ¡Importante!", description: "Título opcional en negrita." },
      { name: "children", label: "Contenido", type: "content", default: "Este es un mensaje de alerta informativo.", description: "El mensaje principal de la alerta." },
    ],
    template: (p) => `<Alert variant="${p.variant}"${p.title ? ` title="${p.title}"` : ""}>\n  ${p.children}\n</Alert>`
  },
  {
    id: "Badge",
    title: "Etiqueta (Badge)",
    category: "Utilidades",
    description: "Pequeño indicador visual para estados o categorías.",
    iconName: "BadgeCheck",
    props: [
      { name: "variant", label: "Variante", type: "select", default: "default", options: [
        { label: "Default", value: "default" },
        { label: "Info", value: "info" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
        { label: "Error", value: "error" },
        { label: "Purple", value: "purple" },
        { label: "Outline", value: "outline" },
      ], description: "Color de la etiqueta." },
      { name: "children", label: "Texto", type: "text", default: "Status", description: "El texto a mostrar dentro de la etiqueta." },
    ],
    template: (p) => `<Badge variant="${p.variant}">${p.children}</Badge>`
  },
  {
    id: "Tooltip",
    title: "Información Extra (Tooltip)",
    category: "Utilidades",
    description: "Muestra un mensaje al pasar el cursor sobre un texto.",
    iconName: "MousePointer2",
    props: [
      { name: "content", label: "Mensaje", type: "text", default: "Este es el mensaje del tooltip", description: "Lo que se verá al pasar el cursor." },
      { name: "children", label: "Texto Base", type: "text", default: "Pasa el mouse aquí", description: "El texto que el usuario ve inicialmente." },
    ],
    template: (p) => `<Tooltip content="${p.content}">${p.children}</Tooltip>`
  },
  {
    id: "Kbd",
    title: "Tecla (Kbd)",
    category: "Utilidades",
    description: "Representa una tecla física o atajo de teclado.",
    iconName: "Keyboard",
    props: [
      { name: "children", label: "Tecla", type: "text", default: "Ctrl", placeholder: "Ej: Shift, Enter, A", description: "La tecla a mostrar." },
    ],
    template: (p) => `<Kbd>${p.children}</Kbd>`
  },
  {
    id: "GithubRepo",
    title: "Repositorio GitHub",
    category: "Utilidades",
    description: "Tarjeta dinámica que muestra información de un repositorio.",
    iconName: "Github",
    props: [
      { name: "url", label: "URL del Repo", type: "text", default: "https://github.com/facebook/react", description: "Enlace completo al repositorio en GitHub." },
      { name: "title", label: "Título / Alias", type: "text", placeholder: "Opcional: facebook/react", description: "Reemplaza el nombre extraído de la URL." },
      { name: "description", label: "Descripción", type: "text", placeholder: "Opcional: Descripción breve.", description: "Fuerza una descripción manual." },
      { name: "stars", label: "Estrellas (Cache)", type: "text", placeholder: "Ej: 150k", description: "Valor estático para las estrellas." },
      { name: "forks", label: "Forks (Cache)", type: "text", placeholder: "Ej: 20k", description: "Valor estático para los forks." },
    ],
    template: (p) => {
      let props = `url="${p.url}"`;
      if (p.title) props += `\n  title="${p.title}"`;
      if (p.description) props += `\n  description="${p.description}"`;
      if (p.stars) props += `\n  stars="${p.stars}"`;
      if (p.forks) props += `\n  forks="${p.forks}"`;
      return `<GithubRepo \n  ${props}\n/>`;
    }
  },

  // --- MULTIMEDIA (04-visualizacion / 05-utilidades) ---
  {
    id: "ZoomImage",
    title: "Imagen con Zoom",
    category: "Multimedia",
    description: "Imagen profesional con efectos de zoom y lightbox.",
    iconName: "ImageIcon",
    props: [
      { name: "src", label: "URL Imagen", type: "text", default: "/images/placeholder.jpg", description: "Ruta local o URL absoluta de la imagen." },
      { name: "alt", label: "Texto Alternativo", type: "text", default: "Descripción de imagen", description: "Texto para accesibilidad (SEO)." },
      { name: "caption", label: "Pie de Foto", type: "text", placeholder: "Ej: Vista aérea del proyecto", description: "Texto que aparece debajo de la imagen." },
    ],
    template: (p) => `<ZoomImage \n  src="${p.src}"\n  alt="${p.alt}"${p.caption ? `\n  caption="${p.caption}"` : ""}\n/>`
  },
  {
    id: "Video",
    title: "Video / Streaming",
    category: "Multimedia",
    description: "Reproductor de video con soporte para YouTube, Vimeo y Local.",
    iconName: "Video",
    props: [
      { name: "src", label: "URL del Video", type: "text", default: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Enlace al video." },
      { name: "type", label: "Tipo de Host", type: "select", default: "local", options: [
        { label: "Local / Directo", value: "local" },
        { label: "YouTube", value: "youtube" },
        { label: "Vimeo", value: "vimeo" },
      ], description: "Plataforma de origen del video." },
      { name: "autoplay", label: "Auto-reproducción", type: "boolean", default: false, description: "Iniciar automáticamente (sin sonido)." },
      { name: "loop", label: "Bucle", type: "boolean", default: false, description: "Repetir al finalizar." },
    ],
    template: (p) => {
      let props = `src="${p.src}" type="${p.type}"`;
      if (p.autoplay) props += ` autoplay={true}`;
      if (p.loop) props += ` loop={true}`;
      return `<Video ${props} />`;
    }
  },
  {
    id: "Audio",
    title: "Reproductor de Audio",
    category: "Multimedia",
    description: "Barra de reproducción de audio elegante.",
    iconName: "Music",
    props: [
      { name: "src", label: "URL Audio", type: "text", default: "/audio/sample.mp3", description: "Ruta del archivo de audio." },
      { name: "title", label: "Título", type: "text", placeholder: "Ej: Podcast Episodio 1", description: "Nombre de la pista." },
    ],
    template: (p) => `<Audio src="${p.src}" ${p.title ? `title="${p.title}"` : ""} />`
  },

  // --- ESTRUCTURA & LAYOUT (01-landing / 02-estructura) ---
  {
    id: "BentoGrid",
    title: "Cuadrícula Bento",
    category: "Layout",
    description: "Crea un layout moderno estilo Bento para mostrar características.",
    iconName: "Layout",
    props: [
      { name: "columns", label: "Columnas", type: "number", default: 3, description: "Número de columnas en escritorio (1-4)." },
    ],
    template: (p) => `<BentoGrid columns={${p.columns || 3}}>
  <BentoCard 
    title="Análisis Profundo" 
    description="Obtén métricas detalladas." 
    icon="BarChart" 
  />
  <BentoCard 
    title="Sincronización Rápida" 
    description="Tus datos en tiempo real." 
    icon="Zap" 
  />
</BentoGrid>`
  },
  {
    id: "Hero",
    title: "Sección Hero",
    category: "Layout",
    description: "Banner principal impactante para inicios de sección.",
    iconName: "LayoutList",
    props: [
      { name: "title", label: "Título", type: "text", default: "Título Impactante", description: "El encabezado principal." },
      { name: "description", label: "Descripción", type: "text", default: "Descripción detallada del propósito de esta sección.", description: "Subtítulo grande." },
      { name: "icon", label: "Icono", type: "icon", default: "Rocket", description: "Icono principal (Lucide)." },
      { name: "align", label: "Alineación", type: "select", default: "center", options: [{label: "Centro", value:"center"}, {label:"Izquierda", value:"left"}], description: "Alineación del texto." },
      { name: "variant", label: "Estilo", type: "select", default: "gradient", options: [{label:"Gradiente", value:"gradient"}, {label:"Cristal", value:"glass"}, {label:"Básico", value:"minimal"}], description: "Apariencia visual del fondo." },
      { name: "color", label: "Color", type: "select", default: "default", options: [
        { label: "Por Defecto (Indigo/Púrpura)", value: "default" },
        { label: "Esmeralda", value: "emerald" },
        { label: "Rosa", value: "rose" },
        { label: "Ámbar", value: "amber" },
        { label: "Cian", value: "cyan" },
        { label: "Púrpura", value: "purple" },
        { label: "Azul", value: "blue" },
      ], description: "Combinación de colores para el fondo gradiente." },
      { name: "backgroundImage", label: "Imagen Fondo", type: "text", placeholder: "URL de la imagen", description: "Imagen de fondo opcional." },
      { name: "actions", label: "Acciones (JSON)", type: "json", default: [
        { label: "Comenzar", href: "#", variant: "primary", icon: "ArrowRight" },
        { label: "GitHub", href: "#", variant: "outline", icon: "Github" }
      ], description: "Botones a mostrar bajo el texto." },
    ],
    template: (p) => {
      let actionsStr = p.actions && Array.isArray(p.actions) 
        ? JSON.stringify(p.actions, null, 2).replace(/"/g, "'").replace(/\n/g, "\n  ")
        : "[]";
      return `<Hero 
  title="${p.title}"
  description="${p.description}"
  icon="${p.icon}"
  align="${p.align}"
  variant="${p.variant}"
  color="${p.color || 'default'}"${p.backgroundImage ? `\n  backgroundImage="${p.backgroundImage}"` : ""}
  actions="${actionsStr}"
/>`;
    }
  },
  {
    id: "Roadmap",
    title: "Mapa de Ruta",
    category: "Layout",
    description: "Línea de tiempo interactiva para hitos y planes.",
    iconName: "Map",
    props: [
      { 
        name: "items", 
        label: "Hitos / Pasos (JSON)", 
        type: "json", 
        default: [
          { title: "Versión 1.0", status: "released", date: "Q4 2023", description: "Lanzamiento estable." },
          { title: "IA Assistant", status: "in-progress", date: "Q1 2024", description: "Integración de modelos de lenguaje." },
          { title: "Marketplace", status: "planned", date: "Q2 2024", description: "Plugins de terceros." }
        ], 
        description: "Lista de hitos del roadmap." 
      }
    ],
    template: (p) => {
      let itemsStr = p.items && Array.isArray(p.items) 
        ? JSON.stringify(p.items, null, 2).replace(/"/g, "'").replace(/\n/g, "\n  ")
        : "[]";
      return `<Roadmap items="${itemsStr}" />`;
    }
  },
  {
    id: "FeatureGlow",
    title: "Tarjetas con Resplandor",
    category: "Layout",
    description: "Tarjetas premium con efecto spotlight que sigue el mouse.",
    iconName: "Sparkles",
    props: [
      { name: "columns", label: "Columnas", type: "number", default: 3, description: "Columnas en vista de escritorio." },
    ],
    template: (p) => `<FeatureGlowGrid columns={${p.columns || 3}}>
  <FeatureGlowCard 
    title="Rendimiento Nativo" 
    description="Compilado en Rust." 
    icon="Zap" 
  />
  <FeatureGlowCard 
    title="Seguridad Total" 
    description="Cifrado de extremo a extremo." 
    icon="Shield" 
  />
</FeatureGlowGrid>`
  },
  {
    id: "Steps",
    title: "Lista de Pasos",
    category: "Layout",
    description: "Guía paso a paso con numeración automática y línea lateral.",
    iconName: "ChevronRight",
    props: [
      { name: "items", label: "Pasos (JSON)", type: "json", default: [
        { title: "Clonación del Repositorio", content: "Obtén el código base desde GitHub." },
        { title: "Instalación", content: "Instala las dependencias necesarias." },
        { title: "¡Listo!", content: "Lanza el servidor y comienza a editar." }
      ], description: "Lista de pasos con título y contenido." }
    ],
    template: (p) => {
      let itemsStr = p.items && Array.isArray(p.items) 
        ? JSON.stringify(p.items, null, 2).replace(/"/g, "'").replace(/\n/g, "\n  ")
        : "[]";
      return `<Steps items="${itemsStr}" />`;
    }
  },
  {
    id: "Accordion",
    title: "Acordeón (FAQ)",
    category: "Layout",
    description: "Componente para colapsar y expandir secciones de información.",
    iconName: "LayoutList",
    props: [
      { name: "items", label: "Elementos (JSON)", type: "json", default: [
        { title: "¿Cómo instalo el proyecto?", content: "Ejecuta npm install en la terminal." },
        { title: "¿Es compatible con Mac?", content: "Sí, soporta macOS, Windows y Linux." }
      ], description: "Lista de títulos y contenidos colapsables." },
    ],
    template: (p) => {
      if (p.items && Array.isArray(p.items)) {
        const itemsMapped = p.items.map(item => `  <AccordionItem title="${item.title}">\n    ${item.content || item.description || ''}\n  </AccordionItem>`).join('\n');
        return `<Accordion>\n${itemsMapped}\n</Accordion>`;
      }
      return `<Accordion>
  <AccordionItem title="¿Cómo instalo el proyecto?">
    Ejecuta \`npm install\` en la terminal.
  </AccordionItem>
  <AccordionItem title="¿Es compatible con Mac?">
    Sí, soporta macOS, Windows y Linux.
  </AccordionItem>
</Accordion>`;
    }
  },
  {
    id: "Carousel",
    title: "Carrusel",
    category: "Layout",
    description: "Muestra múltiples elementos desplazables horizontalmente.",
    iconName: "Columns",
    props: [
      { name: "items", label: "Imágenes (JSON)", type: "json", default: [
        { src: "/images/slide1.jpg", alt: "Diapositiva 1" },
        { src: "/images/slide2.jpg", alt: "Diapositiva 2" }
      ], description: "Lista de imágenes o contenido." },
    ],
    template: (p) => {
      let itemsStr = JSON.stringify(p.items || [], null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"/g, "'");
      return `<Carousel items="${itemsStr}" />`;
    }
  },

  // --- CÓDIGO Y DATOS (03-codigo-y-datos) ---
  {
    id: "PropertyTable",
    title: "Tabla de Propiedades",
    category: "Base",
    description: "Documenta APIs, props o configuraciones de forma estructurada.",
    iconName: "TableIcon",
    props: [
      { name: "items", label: "Propiedades (JSON)", type: "json", default: [
        { name: "endpoint", type: "string (URL)", required: true, description: "Dirección del microservicio." },
        { name: "retryPolicy", type: "object", default: "{ attempts: 3 }", description: "Política de reintentos." }
      ], description: "Array de objetos con name, type, required, default, y description." },
    ],
    template: (p) => {
      const itemsStr = JSON.stringify(p.items || [], null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"/g, "'");
      return `<PropertyTable items="${itemsStr}" />`;
    }
  },
  {
    id: "Terminal",
    title: "Terminal",
    category: "Multimedia",
    description: "Simula una terminal con animaciones de escritura paso a paso.",
    iconName: "TerminalIcon",
    props: [
      { name: "title", label: "Título", type: "text", default: "bash", description: "Nombre de la pestaña (ej: bash, zsh)." },
      { name: "shell", label: "Shell", type: "select", default: "bash", options: [
        { label: "Bash", value: "bash" },
        { label: "Node.js", value: "node" },
        { label: "Python", value: "python" },
      ], description: "Tipo de entorno de comandos." },
      { name: "staticText", label: "Texto Estático", type: "text", default: "Iniciando proceso...", description: "Texto que aparece inmediatamente." },
      { name: "commands", label: "Comandos (\\n)", type: "content", default: "npm install\nnpm run dev", description: "Comandos que se animarán línea por línea." },
    ],
    template: (p) => {
      const children = typeof p.commands === 'string' ? p.commands.replace(/\\n/g, '\n') : '';
      return `<Terminal \n  title="${p.title}" \n  shell="${p.shell}"${p.staticText ? `\n  staticText="${p.staticText}"` : ""}\n>\n${children}\n</Terminal>`;
    }
  },
  {
    id: "CodeTabs",
    title: "Pestañas de Código",
    category: "Interactivos",
    description: "Muestra diferentes lenguajes o archivos en un solo bloque con pestañas.",
    iconName: "Code2",
    props: [
      { name: "items", label: "Pestañas (JSON)", type: "json", default: [
        { title: "React", language: "tsx", code: "export const App = () => <div>Hello</div>" },
        { title: "Svelte", language: "html", code: "<h1>Hello</h1>" }
      ], description: "Array con title, language y code." },
    ],
    template: (p) => {
      if (p.items && Array.isArray(p.items)) {
        const itemsMapped = p.items.map(item => `  <CodeTab title="${item.title}">\n    \`\`\`${item.language || 'js'}\n    ${item.code || ''}\n    \`\`\`\n  </CodeTab>`).join('\n');
        return `<CodeTabs>\n${itemsMapped}\n</CodeTabs>`;
      }
      return `<CodeTabs>
  <CodeTab title="JavaScript">
    \`\`\`js
    // Cliente nativo en JS
    const client = new FusionClient({
      apiKey: process.env.API_KEY
    });
    
    await client.connect();
    \`\`\`
  </CodeTab>
  <CodeTab title="Python">
    \`\`\`python
    # Cliente nativo en Python
    client = FusionClient(
        api_key=os.getenv('API_KEY')
    )
    
    client.connect()
    \`\`\`
  </CodeTab>
</CodeTabs>`;
    }
  },
  {
    id: "CodeExplainer",
    title: "Explicador de Código",
    category: "Interactivos",
    description: "Anatomía de código con explicaciones línea por línea.",
    iconName: "Info",
    props: [],
    template: (p) => `<CodeExplainer>
  <CodeExplainerFile title="UserContext.tsx">
    \`\`\`tsx
    import { createContext, useContext, useState } from 'react';
    
    const UserContext = createContext(null);
    
    export function UserProvider({ children }) {
      const [user, setUser] = useState({ name: 'Alex', role: 'Admin' });
      return (
        <UserContext.Provider value={{ user, setUser }}>
          {children}
        </UserContext.Provider>
      );
    }
    \`\`\`
    <CodeExplainerStep lines="1">
      **Importaciones**: Requerimos los hooks esenciales de React para el estado y contexto.
    </CodeExplainerStep>
    <CodeExplainerStep lines="3">
      **Creación del contexto**: Creamos la instancia para centralizar los datos del usuario.
    </CodeExplainerStep>
    <CodeExplainerStep lines="6">
      **Estado local**: Inicializamos el estado del usuario con valores por defecto.
    </CodeExplainerStep>
    <CodeExplainerStep lines="8-10">
      **Proveedor**: Envolvemos los componentes hijos exponiendo los valores de contexto.
    </CodeExplainerStep>
  </CodeExplainerFile>

  <CodeExplainerFile title="UserCard.tsx">
    \`\`\`tsx
    import { useUser } from './UserContext';
    
    export function UserCard() {
      const { user } = useUser();
      return (
        <div className="card-glass">
          <h3>{user.name}</h3>
          <p>{user.role}</p>
        </div>
      );
    }
    \`\`\`
    <CodeExplainerStep lines="1">
      **Importación**: Traemos el hook personalizado para consumir el contexto de usuario.
    </CodeExplainerStep>
    <CodeExplainerStep lines="3">
      **Declaración del Componente**: Definimos la tarjeta visual para presentar al usuario.
    </CodeExplainerStep>
    <CodeExplainerStep lines="4">
      **Consumo de datos**: Extraemos las propiedades del usuario directamente.
    </CodeExplainerStep>
    <CodeExplainerStep lines="6-9">
      **Estructura del layout**: Pintamos la tarjeta aplicando una clase estilizada.
    </CodeExplainerStep>
  </CodeExplainerFile>

  <CodeExplainerFile title="UserStyles.css">
    \`\`\`css
    .card-glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    \`\`\`
    <CodeExplainerStep lines="1">
      **Selector CSS**: Definimos las propiedades de estilo para la clase card-glass.
    </CodeExplainerStep>
    <CodeExplainerStep lines="2-3">
      **Efecto Glassmorphism**: Fondo traslúcido y desenfoque de fondo.
    </CodeExplainerStep>
    <CodeExplainerStep lines="4-5">
      **Esquinas y espaciado**: Bordes redondeados y padding interno generoso.
    </CodeExplainerStep>
    <CodeExplainerStep lines="6">
      **Borde translúcido**: Borde fino y sutil que acentúa el efecto de cristal.
    </CodeExplainerStep>
  </CodeExplainerFile>
</CodeExplainer>`
  },
  {
    id: "FileTree",
    title: "Árbol de Archivos",
    category: "Layout",
    description: "Visualiza la estructura de carpetas de un proyecto con íconos.",
    iconName: "FolderTree",
    props: [
      { name: "items", label: "Árbol de Archivos (JSON)", type: "json", default: [
        { type: "folder", name: "src", open: true, children: [
          { type: "folder", name: "components", children: [
            { type: "file", name: "Button.tsx", label: "Componente Base" }
          ]},
          { type: "file", name: "index.ts" }
        ]},
        { type: "file", name: "package.json" }
      ], description: "Estructura del proyecto en formato JSON." }
    ],
    template: (p) => {
      let itemsStr = p.items && Array.isArray(p.items) 
        ? JSON.stringify(p.items, null, 2).replace(/"/g, "'").replace(/\n/g, "\n  ")
        : "[]";
      return `<FileTree items="${itemsStr}" />`;
    }
  },

  // --- VISUALIZACIÓN CIENTÍFICA (04-visualizacion) ---
  {
    id: "X6Diagram",
    title: "Diagrama Interactivo (X6)",
    category: "Científico",
    description: "Dibuja diagramas de arquitectura y flujo interactivos.",
    iconName: "GitBranch",
    props: [
      { name: "height", label: "Altura", type: "number", default: 300, description: "Altura del diagrama." },
      { name: "data", label: "Nodos y Edges (JSON)", type: "json", default: {
        nodes: [
          { id: 'user', label: 'Usuario Final', x: 40, y: 120, color: '#ec4899', width: 140 },
          { id: 'gateway', label: 'API Gateway', x: 260, y: 120, width: 140 },
          { id: 'worker', label: 'Microservicio', x: 480, y: 120, color: '#8b5cf6', width: 140 },
          { id: 'db', label: 'Postgres DB', x: 700, y: 120, color: '#3b82f6', width: 140 }
        ],
        edges: [
          { source: 'user', target: 'gateway', label: 'HTTPS/TLS', animated: true },
          { source: 'gateway', target: 'worker', label: 'gRPC', animated: true },
          { source: 'worker', target: 'db', label: 'SQL Query' }
        ]
      }, description: "Estructura del diagrama." },
    ],
    template: (p) => {
      const dataStr = JSON.stringify(p.data || {}, null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"/g, "'")
        .replace(/\n/g, "\n  ");
      return `<X6Diagram height={${p.height || 300}} data="${dataStr}" />`;
    }
  },
  {
    id: "MafsBoard",
    title: "Gráfico Matemático (Mafs)",
    category: "Científico",
    description: "Visualización matemática de alta precisión.",
    iconName: "Activity",
    props: [
      { name: "expression", label: "Expresión (KaTeX)", type: "text", placeholder: "f(x) = \\sin(x)", description: "Título opcional de la gráfica en formato matemático." },
      { name: "height", label: "Altura (px)", type: "number", default: 400, description: "Altura del contenedor del lienzo." }
    ],
    template: (p) => `<MafsBoard height={${p.height || 400}}${p.expression ? ` expression="${p.expression}"` : ""}>
  <MafsCoordinates />
  <MafsPlot y="Math.sin(x)" color="var(--primary)" weight={3} />
  <MafsPoint x={Math.PI / 2} y={1} color="#ef4444" />
</MafsBoard>`
  },
  {
    id: "JSXGraphBoard",
    title: "Geometría Dinámica (JSXGraph)",
    category: "Científico",
    description: "Tablero para construcciones geométricas interactivas avanzadas.",
    iconName: "Activity",
    props: [
      { name: "title", label: "Título", type: "text", default: "Simulador de Ondas", description: "Título que se muestra en el encabezado." },
      { name: "height", label: "Altura (px)", type: "number", default: 350, description: "Altura del contenedor del tablero." },
      { name: "code", label: "Script (JS)", type: "content", default: "var s = board.create('slider', [[-4, -3.5], [2, -3.5], [1, 5, 10]], {name: 'frecuencia'});\nboard.create('functiongraph', [function(x) { return Math.sin(s.Value() * x); }], {strokeColor: '#8b5cf6', strokeWidth: 3});", description: "Código JavaScript para generar la construcción. El objeto 'board' está inyectado." }
    ],
    template: (p) => {
      const escapedCode = (p.code || '')
        .replace(/"/g, "'")
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n');
      return `<JSXGraphBoard
  title="${p.title || 'Simulador de Ondas'}"
  height={${p.height || 350}}
  code="${escapedCode}"
/>`;
    }
  },
  {
    id: "AnimatedSVG",
    title: "SVG Animado",
    category: "Layout",
    description: "Contenedor que anima el trazado de los elementos de un SVG al entrar en pantalla.",
    iconName: "Sparkles",
    props: [
      { name: "duration", label: "Duración (ms)", type: "number", default: 2000, description: "Duración de la animación en milisegundos." },
      { name: "delay", label: "Retraso inicial (ms)", type: "number", default: 500, description: "Retraso antes de empezar la animación." },
      { name: "loop", label: "Bucle", type: "boolean", default: false, description: "Repetir la animación al finalizar." }
    ],
    template: (p) => `<AnimatedSVG duration={${p.duration || 2000}} delay={${p.delay || 500}} loop={${p.loop || false}}>
  <svg viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="40" stroke="var(--primary)" strokeWidth="4" fill="none" />
  </svg>
</AnimatedSVG>`
  },
  {
    id: "CodeEmbed",
    title: "Código Embebido (Sandboxes)",
    category: "Interactivos",
    description: "Inserta un editor interactivo de CodePen, CodeSandbox, o StackBlitz.",
    iconName: "Code2",
    props: [
      { name: "url", label: "URL del Sandbox", type: "text", default: "https://codepen.io/rachsmith/details/vEGORW", description: "Enlace completo al sandbox o snippet." },
      { name: "title", label: "Título", type: "text", default: "Demo", description: "Título opcional." },
      { name: "height", label: "Altura (px)", type: "number", default: 500, description: "Altura del contenedor embebido." },
      { name: "autoload", label: "Carga Automática", type: "boolean", default: false, description: "Cargar el iframe inmediatamente sin requerir clic." }
    ],
    template: (p) => `<CodeEmbed url="${p.url || ''}" title="${p.title || 'Demo'}" height="${p.height || 500}" autoload={${p.autoload || false}} />`
  },
  {
    id: "LatexBlock",
    title: "Bloque LaTeX",
    category: "Científico",
    description: "Renderiza fórmulas matemáticas avanzadas usando LaTeX/KaTeX.",
    iconName: "Activity",
    props: [
      { name: "title", label: "Título del Bloque", type: "text", default: "Ecuación de Schrödinger", description: "Título opcional para el encabezado." },
      { name: "math", label: "Ecuación (LaTeX)", type: "content", default: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)", description: "La expresión matemática a renderizar." }
    ],
    template: (p) => `<LatexBlock title="${p.title || 'Ecuación'}" math="${p.math ? p.math.replace(/"/g, '\\"') : ''}" />`
  },
  {
    id: "P5Sketch",
    title: "Lienzo Interactivo (p5.js)",
    category: "Científico",
    description: "Dibuja gráficos y simulaciones interactivas usando el motor p5.js.",
    iconName: "Activity",
    props: [
      { name: "title", label: "Título del Sketch", type: "text", default: "Animación en p5.js", description: "Título opcional que se muestra en la cabecera." },
      { name: "height", label: "Altura (px)", type: "number", default: 400, description: "Altura del lienzo de p5.js." },
      { name: "code", label: "Código p5.js", type: "content", default: "function setup() {\n  createCanvas(windowWidth, 400);\n}\nfunction draw() {\n  background(20);\n  fill(59, 130, 246);\n  circle(mouseX, mouseY, 50);\n}", description: "Código JavaScript nativo de p5.js. Las funciones setup, draw, etc., son capturadas." }
    ],
    template: (p) => {
      const escapedCode = (p.code || '')
        .replace(/"/g, "'")
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n');
      return `<P5Sketch\n  title="${p.title || 'p5.js Sketch'}"\n  height={${p.height || 400}}\n  code="${escapedCode}"\n/>`;
    }
  },
  {
    id: "TextReveal",
    title: "Texto Animado (Reveal)",
    category: "Layout",
    description: "Muestra texto con una elegante animación letra por letra.",
    iconName: "Type",
    props: [
      { name: "text", label: "Texto", type: "text", default: "Explora la nueva frontera de la educación.", description: "El mensaje a mostrar." },
      { name: "delay", label: "Retraso (ms)", type: "number", default: 0, description: "Retraso antes de iniciar la animación." }
    ],
    template: (p) => `<TextReveal text="${p.text || ''}" delay={${p.delay || 0}} />`
  },
  {
    id: "Timeline",
    title: "Línea de Tiempo",
    category: "Layout",
    description: "Muestra hitos, eventos o progreso cronológico.",
    iconName: "LayoutList",
    props: [],
    template: () => `<Timeline>
  <TimelineItem title="Lanzamiento Beta" date="Enero 2024" variant="active">
    Se liberaron los primeros módulos de la plataforma a un grupo selecto.
  </TimelineItem>
  <TimelineItem title="Expansión Global" date="Marzo 2024" variant="info">
    Nuevas infraestructuras en América Latina y Europa.
  </TimelineItem>
</Timeline>`
  },
  {
    id: "TimelineFlow",
    title: "Flujo de Proceso (TimelineFlow)",
    category: "Layout",
    description: "Flujo de pasos interactivo horizontal con micro-animaciones.",
    iconName: "Map",
    props: [
      { name: "steps", label: "Pasos (JSON)", type: "json", default: [
        { title: "Inicio", description: "Punto de partida." },
        { title: "Desarrollo", description: "Creación de prototipos." },
        { title: "Entrega", description: "Despliegue final." }
      ], description: "Hitos y detalles del flujo." }
    ],
    template: (p) => {
      let stepsStr = p.steps && Array.isArray(p.steps) 
        ? JSON.stringify(p.steps, null, 2).replace(/"/g, "'").replace(/\n/g, "\n  ")
        : "[]";
      return `<TimelineFlow steps="${stepsStr}" />`;
    }
  }
];
