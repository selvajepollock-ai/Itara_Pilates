# Estudio Pilates — Guía paso a paso (Supabase + Vercel, todo gratis)

## 0. Qué necesitás instalado en tu computadora
- Node.js 18 o superior (https://nodejs.org, bajar la versión LTS)
- Git (https://git-scm.com)
- Una cuenta de GitHub (gratis)
- Una cuenta de Supabase (gratis) → https://supabase.com
- Una cuenta de Vercel (gratis) → https://vercel.com (podés entrar directo con tu cuenta de GitHub)

---

## 1. Crear el proyecto en Supabase
1. Entrá a https://supabase.com → "New project".
2. Elegí un nombre (ej: `estudio-pilates`), una contraseña para la base (guardala) y la región más cercana.
3. Esperá 1-2 minutos a que se cree.

## 2. Correr el schema de la base de datos
1. En el panel de Supabase, andá a **SQL Editor** (menú izquierdo).
2. Abrí el archivo `supabase/migrations/001_initial_schema.sql` de este proyecto, copiá todo su contenido.
3. Pegalo en el SQL Editor y click en **Run**.
4. Deberías ver todas las tablas nuevas en **Table Editor**.

## 3. Configurar Authentication
1. Andá a **Authentication → Providers** y confirmá que **Email** esté habilitado (viene por defecto).
2. Para probar más rápido en desarrollo: **Authentication → Settings** → desactivá "Confirm email" (así no tenés que confirmar por mail cada usuario de prueba). En producción real lo podés reactivar.

## 4. Crear tu primer usuario admin (vos)
1. Andá a **Authentication → Users → Add user** → creá tu usuario con tu email y una contraseña.
2. Copiá el **UUID** de ese usuario (aparece en la lista).
3. Volvé al **SQL Editor** y corré (reemplazando el UUID):
   ```sql
   update public.profiles set roles = array['admin'] where id = 'PEGA-ACA-EL-UUID';
   ```
4. Ese usuario ahora es admin. Para crear instructores, repetís el mismo paso pero con `array['instructor']`, o `array['admin','instructor']` si el dueño también da clases.

## 5. Obtener las API keys
1. Andá a **Project Settings → API**.
2. Copiá:
   - **Project URL**
   - **anon public key**

## 6. Configurar el proyecto localmente
1. Descomprimí el proyecto que te pasé.
2. Abrí una terminal en esa carpeta y corré:
   ```bash
   npm install
   ```
3. Creá un archivo `.env.local` (copiá `.env.local.example` y renombralo) con tus datos:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
4. Corré el proyecto:
   ```bash
   npm run dev
   ```
5. Abrí http://localhost:3000 → te debería mandar a `/login`. Iniciá sesión con el usuario admin que creaste. Te va a redirigir a `/admin`.

## 7. Subir el código a GitHub
```bash
git init
git add .
git commit -m "Primer commit: schema + auth + roles"
```
1. Creá un repo nuevo (vacío) en https://github.com/new
2. Seguí las instrucciones que te da GitHub para conectar tu carpeta local, algo como:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/estudio-pilates.git
   git branch -M main
   git push -u origin main
   ```

## 8. Deployar en Vercel (gratis)
1. Entrá a https://vercel.com → "Add New..." → "Project".
2. Elegí "Import" desde tu cuenta de GitHub y seleccioná el repo que acabás de subir.
3. En **Environment Variables**, cargá las mismas dos variables del `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click en **Deploy**. En 1-2 minutos tenés una URL pública (`https://estudio-pilates-xxxx.vercel.app`), gratis, con HTTPS.
5. Cada vez que hagas `git push` a `main`, Vercel redeploya solo.

## 9. Qué es "PWA" acá y qué falta
Ya dejé el `app/manifest.ts` configurado, así que el celular va a poder **"Agregar a pantalla de inicio"** y abrir la app como si fuera nativa. Te faltan los íconos:
- Generá dos imágenes cuadradas (192x192 y 512x512 px) con el logo del estudio.
- Guardalas como `public/icons/icon-192.png` y `public/icons/icon-512.png`.
- El soporte **offline** (que funcione sin internet) es un paso aparte que armamos después si lo necesitás — no es obligatorio para que la app funcione y sea instalable.

## 10. Qué sigue
Esto ya te deja: login, roles (admin/instructor/alumno) y cada uno viendo su propio dashboard vacío. Lo que armamos como próxima tarea:
- Gestión de horarios y alta de alumnos (admin)
- Vista de horario semanal del alumno
- Toma de asistencia del instructor

Avisame cuando esto esté funcionando en tu Vercel y seguimos con la siguiente funcionalidad.
