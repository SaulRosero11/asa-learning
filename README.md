# ASA E-Learning — Frontend

> **Plataforma de gestión de aprendizaje (LMS)** desarrollada para la ONG **Solidaridad y Acción (ASA)** como proyecto de vinculación con la comunidad de la Universidad de las Américas (UDLA).

## Descripción del proyecto

ASA E-Learning es el frontend de un sistema de gestión de aprendizaje (LMS) que permite a la ONG Solidaridad y Acción gestionar sus programas de capacitación de forma digital. Proporciona interfaces diferenciadas según el rol del usuario: los beneficiarios (estudiantes) acceden a su contenido y evaluaciones, los coordinadores gestionan sus programas, y los administradores tienen visibilidad global del sistema.

La interfaz fue diseñada con énfasis en usabilidad, accesibilidad y consistencia visual, siguiendo la identidad de marca de ASA.

## Stack Tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| Lenguaje | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 |
| Estado servidor | TanStack Query (React Query) | 5 |
| Formularios | React Hook Form + Zod | 7.x / 4.x |
| HTTP Client | Axios | 1.x |
| Iconos | Lucide React | — |
| Editor de texto | Tiptap | 3.x |
| Drag & Drop | dnd-kit | 6.x |
| Gráficos | Recharts | 3.x |
| Testing | Jest + React Testing Library | — |

## Requisitos previos

- **Node.js 20+**
- **npm 10+** (o yarn/pnpm)
- **Backend ASA E-Learning** corriendo en `http://localhost:8080`

## Configuración

### Variables de entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```env
# URL del backend accesible desde el servidor Next.js
BACKEND_URL=http://localhost:8080

# URL del backend accesible desde el navegador
NEXT_PUBLIC_API_URL=http://localhost:8080

# Google OAuth2 Client ID (para el botón de login con Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

> Copia `.env.example` como punto de partida: `cp .env.example .env.local`

## Ejecución local

```bash
# 1. Clonar e instalar dependencias
git clone <url-del-repo>
cd asa-elearning
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo con hot reload
npm run build     # Build de producción
npm run start     # Servidor de producción (requiere build previo)
npm run lint      # Verificar código con ESLint
npm test          # Ejecutar tests con Jest
npm run test:watch # Tests en modo observación
```

## Rutas de la aplicación

### Públicas (sin autenticación)
| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión (email/contraseña + Google) |
| `/forgot-password` | Recuperación de contraseña |
| `/reset-password` | Completar reset de contraseña |
| `/change-password` | Cambiar contraseña (primer login) |
| `/invite/[token]` | Aceptar invitación a un programa |

### Protegidas — Todos los usuarios
| Ruta | Descripción |
|---|---|
| `/onboarding` | Formulario de datos iniciales (primer acceso) |
| `/dashboard` | Panel principal con KPIs y actividades pendientes |
| `/profile` | Perfil del usuario |
| `/profile/history` | Historial de aprendizaje |
| `/programs` | Lista de programas |
| `/programs/[id]` | Detalle del programa |
| `/programs/[id]/content` | Módulos y lecciones |
| `/programs/[id]/assessments` | Lista de evaluaciones |
| `/programs/[id]/assessments/[id]/play` | Resolver evaluación |
| `/programs/[id]/assessments/[id]/result` | Resultado propio |
| `/programs/[id]/community` | Noticias y foro |

### Protegidas — Líderes y Administradores
| Ruta | Descripción |
|---|---|
| `/programs/new` | Crear programa |
| `/programs/[id]/assessments/new` | Crear/editar evaluación |
| `/programs/[id]/assessments/[id]/results` | Resultados grupales + calificación manual |

### Protegidas — Solo Administradores
| Ruta | Descripción |
|---|---|
| `/admin/users` | Gestión de administradores y líderes |
| `/admin/users/[id]` | Detalle de usuario admin |
| `/admin/students` | Lista de beneficiarios |
| `/admin/students/[id]` | Perfil completo de beneficiario |
| `/admin/onboarding-questions` | Configurar preguntas de onboarding |

## Funcionalidades principales

### Para beneficiarios (STUDENT)
- Login con email/contraseña o Google OAuth2
- Onboarding guiado al primer acceso
- Dashboard con programas activos y actividades pendientes
- Acceso a módulos y lecciones (video, PDF, texto, enlace)
- Marcado de lecciones como completadas con seguimiento de progreso
- Realización de exámenes, encuestas y evaluaciones
- Visualización de resultados con retroalimentación por pregunta
- Foro de discusión y noticias del programa

### Para líderes de programa (PROGRAM_LEADER)
- Todo lo anterior
- Creación y edición de programas
- Gestión de módulos y lecciones con drag & drop para reordenar
- Invitación de estudiantes por correo electrónico
- Creación de evaluaciones (exámenes, encuestas) con preguntas de opción múltiple y texto abierto
- Publicación y configuración de fechas y límites de intentos
- Vista de resultados grupales con detalle por estudiante e intento
- Calificación manual de preguntas de texto abierto

### Para administradores (ADMIN / SUPER_ADMIN)
- Todo lo anterior
- Gestión de usuarios del sistema (crear, asignar roles, resetear contraseña)
- Visualización de todos los beneficiarios con su perfil demográfico
- KPIs globales: total de estudiantes, programas activos, tasa de completitud, evaluaciones completadas
- Configuración de preguntas de onboarding personalizadas

## Autenticación

- Autenticación basada en cookies **HttpOnly** (seguras, no accesibles desde JavaScript)
- El middleware de Next.js verifica la sesión en cada ruta protegida
- Renovación automática de tokens de sesión
- Soporte para "recordar dispositivo" (sesión extendida)

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/              # Rutas públicas de autenticación
│   ├── (dashboard)/         # Rutas protegidas del dashboard
│   │   ├── admin/           # Sección de administración
│   │   ├── programs/        # Gestión de programas
│   │   ├── profile/         # Perfil de usuario
│   │   └── dashboard/       # Dashboard principal
│   ├── onboarding/          # Flujo de onboarding
│   └── invitations/         # Canje de invitaciones
├── components/              # Componentes reutilizables
├── lib/
│   ├── axios.ts             # Cliente HTTP configurado
│   ├── query-client.ts      # Configuración de TanStack Query
│   ├── dates.ts             # Utilidades de fechas
│   └── scores.ts            # Cálculo y formato de calificaciones
└── middleware.ts            # Guard de autenticación
```

## Build de producción

```bash
# Generar build optimizado
npm run build

# Iniciar servidor de producción
npm run start
```

Para despliegue en Vercel, Railway, o cualquier plataforma compatible con Next.js, configura las variables de entorno en el panel de la plataforma.
