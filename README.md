# 3D Visualizer - Biblioteca y Visor de Modelos 3D

Aplicación web profesional para la **visualización, organización, subida y actualización segura de modelos 3D**, construida con Next.js (App Router), TypeScript, Tailwind CSS, Three.js, Supabase (PostgreSQL y Storage) y un subsistema desacoplado de conversión headless con Blender.

---

## 1. Características Principales

- **Biblioteca Interactiva:** Visualización en cuadrícula con miniaturas, nombres, versión activa (`v1`, `v2`, etc.), fecha de última modificación y estado de procesamiento en tiempo real.
- **Visor 3D Three.js:**
  - Carga optimizada de binarios `.glb` mediante `GLTFLoader`.
  - Rotación libre (OrbitControls) con amortiguación inercial (*damping*).
  - Zoom con rueda del ratón y desplazamiento (*pan*).
  - Soporte táctil completo para dispositivos móviles (un dedo para rotar, dos dedos para zoom/pan).
  - **Auto-encuadre (*auto-fit bounds*):** Cálculo automático del volumen del modelo (*Bounding Box*) y ajuste dinámico de cámara sin importar la escala o desplazamiento inicial de las mallas.
  - Iluminación equilibrada: luz ambiental suave, luz direccional principal con sombras suaves (PCF) y luces de relleno.
  - Cuadrícula de suelo (*floor grid*) y modo alambre (*wireframe*) conmutables.
  - Selector de color de fondo (Estudio Oscuro, Gris Grafito, Azul Medianoche, Blanco Minimal).
  - Botones de **Restablecer Vista Inicial** y **Centrar Modelo**.
  - Liberación segura de memoria Three.js (`dispose()`) al desmontar componentes.
- **Tratamiento Real de Archivos `.blend`:**
  - Validación de extensión y de cabecera mágica binaria (`BLENDER`).
  - Almacenamiento persistente en Supabase Storage (sin depender del disco efímero de Vercel).
  - Encolado de trabajos en `conversion_jobs` para un **worker desacoplado** de Blender en modo headless.
  - Conversión a `.glb` aplicando modificadores, texturas empaquetadas y coordenadas estándar Y-Up.
- **Actualización Segura de Versiones (Regla Crítica):**
  - Mantiene el identificador permanente `model_id`.
  - Bloqueo de concurrencia (`is_locked`) para evitar sobrescrituras accidentales.
  - Sube la nueva versión a una ruta aislada (`models/{id}/v{version+1}/...`).
  - **Garantía Atómica:** La versión anterior permanece activa e intacta mientras la nueva se procesa. Si la conversión falla, la versión anterior continúa disponible sin degradación.
  - Solo cuando el nuevo archivo `.glb` está generado, verificado y activo, se liberan los archivos de la versión anterior.
- **Eliminación Controlada:**
  - Diálogo de confirmación con detalle de archivos a eliminar.
  - Bloqueo de eliminación si el modelo está en proceso de actualización.
  - Eliminación sincronizada de registros en base de datos y archivos en Supabase Storage.
- **Doble Modo de Ejecución:**
  - **Modo Demostración / Mock:** Si no se han configurado credenciales de Supabase en `.env.local`, la aplicación arranca de forma inmediata con modelos 3D de muestra interactivos para pruebas y evaluación visual sin fricción.
  - **Modo Producción Supabase:** Conectado a PostgreSQL y Storage de Supabase con URLs firmadas de corta duración y Row Level Security (RLS).

---

## 2. Arquitectura del Sistema

```
                    ┌──────────────────────────────────────────────┐
                    │               Frontend Next.js               │
                    │   (App Router + Tailwind CSS + Three.js)     │
                    └───────▲──────────────────────────────▲───────┘
                            │                              │
                     Route Handlers                 Signed URLs /
                     (/api/models)                 Direct Download
                            │                              │
            ┌───────────────┴───────────────┐              │
            ▼                               ▼              │
┌─────────────────────────┐     ┌────────────────────────┐ │
│   Supabase PostgreSQL   │     │    Supabase Storage    │ │
│   - models              │     │    Bucket: models3d    ├─┘
│   - model_versions      │     │  - models/{id}/v1/...  │
│   - conversion_jobs     │     │  - models/{id}/v2/...  │
└───────────▲─────────────┘     └───────────▲────────────┘
            │                               │
            │  1. Claim Job                 │  2. Download .blend
            │  4. Update Status (Live)      │  3. Upload .glb
            │                               │
    ┌───────┴───────────────────────────────┴────────┐
    │          Worker Desacoplado de Blender         │
    │  (Python + blender -b -P export_glb.py)        │
    │  - Ejecutable localmente (Windows/macOS/Linux) │
    │  - O desplegable en Docker (Render/Fly.io/VPS) │
    └────────────────────────────────────────────────┘
```

### ¿Por qué desacoplar Blender de las funciones serverless de Vercel?
Blender requiere un entorno con binarios nativos de renderizado, OpenGL/Mesa y pesa más de 250 MB comprimido (superando los límites de empaquetado de funciones serverless de Vercel de 50 MB / 250 MB descomprimido y tiempos máximos de ejecución). Por tanto, la arquitectura sigue el patrón industrial estándar:
1. Vercel gestiona la interfaz, la autenticación, las APIs y la generación de URLs firmadas.
2. Supabase persiste metadatos, versiones y archivos en Storage de objetos.
3. El worker independiente de Blender reclama trabajos de la cola, ejecuta la conversión headless de forma aislada y sube el resultado a Supabase Storage.

---

## 3. Estructura del Proyecto

```
3dVisualizer/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Layout raíz y barra de navegación
│   │   ├── page.tsx                    # Biblioteca interactiva de modelos
│   │   ├── globals.css                 # Variables de diseño y estilos Tailwind
│   │   ├── not-found.tsx               # Página 404 personalizada
│   │   ├── models/
│   │   │   └── [id]/page.tsx           # Vista dedicada del visor 3D
│   │   └── api/
│   │       ├── models/
│   │       │   ├── route.ts            # GET (listado) y POST (subida inicial)
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET y DELETE (eliminación segura)
│   │       │       ├── update/route.ts # POST (actualización versionada atómica)
│   │       │       └── file/route.ts   # GET (stream o redirección a URL firmada)
│   │       ├── worker/jobs/route.ts    # Endpoint de la cola de trabajos para workers
│   │       └── status/route.ts         # Comprobación de salud y detección de servicios
│   ├── components/
│   │   ├── library/
│   │   │   ├── ModelCard.tsx           # Tarjeta con previsualización y acciones
│   │   │   ├── ModelSearchFilter.tsx   # Buscador, filtros de estado y botón de subida
│   │   │   ├── UploadModal.tsx         # Modal de subida de archivo .blend
│   │   │   ├── UpdateModal.tsx         # Modal de actualización segura de versión
│   │   │   ├── DeleteModal.tsx         # Diálogo de confirmación de borrado
│   │   │   ├── StatusBadge.tsx         # Etiquetas visuales de estado
│   │   │   └── SystemStatusBanner.tsx  # Banner informativo de estado de servicios
│   │   ├── viewer/
│   │   │   ├── ModelViewer.tsx         # Contenedor orquestador del visor 3D
│   │   │   ├── ModelCanvas.tsx         # Renderizador Three.js (GLTFLoader, OrbitControls)
│   │   │   ├── ViewerControls.tsx      # Barra flotante de controles y paleta de fondo
│   │   │   └── ViewerToolbar.tsx       # Barra superior con metadatos del activo
│   │   └── ui/
│   │       ├── Button.tsx              # Botón reutilizable con variantes y estados
│   │       ├── Dialog.tsx              # Componente modal accesible
│   │       ├── Input.tsx               # Campo de texto estilizado
│   │       └── Badge.tsx               # Insignia de estado
│   └── lib/
│       ├── types/models.ts             # Tipos TypeScript de modelos, versiones y jobs
│       ├── services/
│       │   └── modelService.ts         # Lógica CRUD, persistencia y mock fallback
│       ├── supabase/
│       │   ├── client.ts               # Cliente Supabase para el navegador
│       │   └── server.ts               # Cliente Supabase servidor (Service Role)
│       └── utils/
│           ├── blendValidator.ts       # Validación binaria de cabecera BLENDER
│           ├── formatters.ts           # Formateo de bytes y fechas relativas
│           └── cn.ts                   # Utilidad de combinación de clases CSS
├── supabase/
│   └── migrations/
│       └── 20261029000000_init_schema.sql # Esquema SQL completo, triggers, RLS y Storage
├── worker/
│   ├── export_glb.py                   # Script de exportación ejecutado dentro de Blender
│   ├── blender_worker.py               # Worker desacoplado (polling o CLI)
│   ├── run_local_worker.bat            # Ejecutable Windows para worker local con Blender 5.2
│   ├── requirements.txt                # Dependencias Python (supabase, storage3)
│   └── Dockerfile                      # Contenedor Linux para despliegue en la nube
├── .env.example                        # Plantilla de variables de entorno
├── next.config.mjs                     # Configuración de Next.js
├── tailwind.config.ts                  # Configuración de Tailwind CSS
├── tsconfig.json                       # Configuración de TypeScript
└── package.json
```

---

## 4. Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js 18+ (recomendado 20 o superior).
- Blender 4.x o 5.x instalado localmente (o Docker si se prefiere ejecutar en contenedor).

### 4.1. Instalación de Dependencias
```bash
cd 3dVisualizer
npm install
```

### 4.2. Ejecución Inmediata en Modo Desarrollo (con Mock)
Si no configuras variables de entorno, la aplicación arranca automáticamente en modo de demostración con modelos de muestra (Suzanne de Blender, cascos de sci-fi con texturas PBR, vehículos y robots animados):
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000).

---

## 5. Configuración de Supabase (Persistencia Real)

1. Crea un proyecto en [Supabase Dashboard](https://supabase.com).
2. Abre el **SQL Editor** en Supabase y ejecuta el contenido del archivo:
   ```
   supabase/migrations/20261029000000_init_schema.sql
   ```
   Esto creará:
   - Tabla `public.models` con índices y triggers de actualización.
   - Tabla `public.model_versions` para histórico y auditoría.
   - Tabla `public.conversion_jobs` para la cola del worker.
   - Bucket de almacenamiento `models3d` con políticas RLS para carga y descarga.
3. Copia el archivo `.env.example` como `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Rellena las credenciales obtenidas de **Project Settings > API**:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   SUPABASE_STORAGE_BUCKET=models3d
   ```

---

## 6. Ejecución del Worker de Conversión Blender

El worker es responsable de convertir archivos `.blend` a `.glb` ejecutando Blender en modo headless (`-b`).

### Opción A: Ejecutar Localmente en Windows (con Blender instalado)
El script detectará automáticamente Blender si está instalado en `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`:
```bash
# Instalar dependencias del worker Python
pip install -r worker/requirements.txt

# Ejecutar el worker en bucle de escucha (consulta cada 5 segundos)
worker\run_local_worker.bat
```
O directamente con Python:
```bash
python worker/blender_worker.py --poll 5
```

### Opción B: Conversión Manual Directa de Prueba (CLI)
Para verificar que el script de Blender funciona en tu máquina sin necesidad de configurar Supabase:
```bash
python worker/blender_worker.py --convert ruta/a/modelo.blend ruta/a/salida.glb
```

### Opción C: Despliegue en Contenedor Docker (Fly.io / Render / AWS ECS / VPS)
Construye la imagen Docker que incluye Blender headless y el worker:
```bash
docker build -t 3d-blender-worker -f worker/Dockerfile .
docker run -e NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co" \
           -e SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
           3d-blender-worker
```

---

## 7. Despliegue en Vercel

1. Sube el repositorio a GitHub o GitLab.
2. Importa el proyecto en [Vercel](https://vercel.com).
3. Añade las siguientes Variables de Entorno en el panel de Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` (opcional, valor por defecto `models3d`)
   - `WORKER_SECRET_TOKEN` (opcional, para proteger la API de jobs)
4. Haz clic en **Deploy**.
5. Ejecuta el worker de Blender en un host con Blender (tu equipo local, una instancia VPS o un contenedor en Render/Fly.io) apuntando al mismo proyecto de Supabase.

---

## 8. Verificación de Criterios de Aceptación

| Criterio | Estado | Implementación |
|---|---|---|
| 1. Biblioteca de modelos disponible | Cumplido | Grid visual con buscador por nombre, filtros de estado y estadísticas. |
| 2. Subida de archivos `.blend` | Cumplido | Formulario con zona Drag & Drop, validación de extensión y cabecera mágica binaria `BLENDER`. |
| 3. Conversión mediante servicio real | Cumplido | Script `worker/export_glb.py` para Blender headless y worker `blender_worker.py` desacoplado. |
| 4. Visualización con Three.js | Cumplido | Carga `.glb` con `GLTFLoader`, OrbitControls, encuadre automático por Bounding Box, controles de cámara, cuadrícula y fondo configurable. |
| 5. Actualización conservando ID | Cumplido | Conserva `model_id` e incrementa versión (`version + 1`). |
| 6. Actualización fallida no borra versión anterior | Cumplido | Si la conversión falla, la versión activa previa se preserva intacta y los archivos anteriores no se tocan. |
| 7. Actualización exitosa y limpieza | Cumplido | Una vez confirmado que el nuevo `.glb` está en almacenamiento y listo, se marca la versión anterior como superseded y se limpian sus archivos antiguos. |
| 8. Eliminación controlada de modelos | Cumplido | Modal de confirmación, borrado consistente de archivos en Supabase Storage y registro en base de datos. Se bloquea si el modelo está en actualización. |
| 9. Persistencia de datos | Cumplido | Esquema relacional PostgreSQL con migraciones reproducibles en Supabase. |
| 10. Independencia del disco efímero de Vercel | Cumplido | Todo el almacenamiento de archivos se delega a Supabase Storage con soporte para URLs firmadas. |
| 11. Responsive (Escritorio y Móvil) | Cumplido | Interfaz adaptable con controles táctiles en el visor Three.js. |
| 12. Mensajes claros y sin estados inconsistentes | Cumplido | Manejo explícito de estados: `pending_upload`, `processing`, `available`, `error`, `updating`. |

