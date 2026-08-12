# Finanzas Bento · integrado al ecosistema Bento

Finanzas Bento ahora usa **la misma cuenta y la misma base de datos** que Bento App y
Proyectos Bento. No hay usuarios duplicados, no hay una segunda base de datos y no hay
datos simulados: Supabase es la única fuente de verdad.

---

## Qué cambió (resumen)

| Antes | Ahora |
|---|---|
| Entraba con una sola **clave compartida** | Entra con tu **cuenta Bento** (Supabase Auth, mismo `user_id` que Bento App y Proyectos) |
| Guardaba en **Netlify Blobs** (`/api/estado`) | Guarda en **Supabase** (tabla `public.bento_kv`), la misma que Bento App |
| Registro de proyectos propio en Netlify Blobs | Lee los proyectos de la llave **`bento:projects`** (fuente única compartida) |
| Movimientos en un JSON aparte | Movimientos en **`bento:fin:AAAA-MM`**, la misma llave que la sección de finanzas de Bento App |
| `localStorage` como fuente principal | `localStorage`/IndexedDB **solo como caché**; la verdad vive en Supabase |

No se creó ninguna tabla nueva. **No hace falta correr SQL**: se reutilizan las tablas y las
políticas de seguridad (RLS) que ya existen. La política `mis datos` (`user_id = auth.uid()`)
ya permite que cada usuario lea y escriba lo suyo desde el navegador.

---

## Cómo se comparten los datos

```
CUENTA (Supabase Auth)  →  user_id  (el mismo en las 3 apps)
        │
        ▼
public.bento_kv          (una fila por llave y usuario)
  ├─ bento:projects           → proyectos    (Bento App / Proyectos Bento / Finanzas)
  ├─ bento:fin:2026-08        → ingresos y gastos del mes (Bento App ↔ Finanzas)
  ├─ bento:fin:2026-08:<id>   → movimientos de un proyecto compartido (espacios)
  ├─ bento:finx:equipo        → equipo / nómina  (solo Finanzas)
  └─ bento:finx:ajustes       → saldo inicial de caja (solo Finanzas)
```

- **Proyecto creado en Proyectos Bento → aparece en Finanzas** (misma llave `bento:projects`, mismo `id`).
- **Gasto/ingreso creado en Finanzas → lo ve Bento App** (misma llave `bento:fin:*`, con `proj = id` del proyecto).
- Cada movimiento se guarda con la forma exacta que usa Bento App:
  `{ id, d, type:'in'|'out', c, amt, cat, met, proj }` (Finanzas añade `factura`, `fijo`,
  `prov`, `nota` sin romper la compatibilidad).

Un ingreso ligado a un proyecto actualiza automáticamente su **cobrado** en `bento:projects`.

---

## Desplegar en Netlify

**Opción recomendada — desde Git (el build inyecta las llaves):**

1. Sube esta carpeta a un repositorio (GitHub/GitLab).
2. En Netlify: **Add new site → Import from Git** y elige el repo.
3. Netlify leerá `netlify.toml` (build `node build.js`, publish `.`).
4. En **Site settings → Environment variables** agrega:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://kqrzlqvlsxmevzyeeoda.supabase.co` |
   | `SUPABASE_ANON_KEY` | `sb_publishable_Smta9FzvTgxeN1-BS2pNqw_8kogmOye` |

5. **Deploy**. El build genera `config.js` con esas variables. Nada queda escrito en el HTML.

> La clave `anon`/`publishable` está pensada para el navegador; lo que protege tus datos es
> la seguridad por filas (RLS) de Supabase. **Nunca** uses la clave `service_role` aquí.

**Despliegue manual (arrastrar carpeta):** el arrastre *no* corre el build, así que copia
`config.example.js` como `config.js` (con tu URL y tu llave) e incluye ese archivo en la carpeta.

### En Supabase (una sola vez)
En **Authentication → URL Configuration** agrega la URL de tu sitio de Netlify a
**Site URL** y a **Redirect URLs** (p. ej. `https://finanzas.bento.mx`). Así funcionan los
enlaces de correo (código, recuperar clave) y la sesión al refrescar.

### Rutas y refresco
`netlify.toml` y `_redirects` incluyen el *fallback* SPA (`/* → /index.html 200`), por lo que
**refrescar cualquier sección no da 404**.

---

## Una sola plataforma, varios dominios

Como las tres apps usan el mismo proyecto de Supabase, entrar con el mismo correo te da
**la misma cuenta, el mismo `user_id` y los mismos datos** en `app.bento.mx`,
`proyectos.bento.mx` y `finanzas.bento.mx`. Finanzas además reaprovecha la sesión guardada de
Bento cuando corre en el mismo origen.

Para un **inicio de sesión único de verdad** (entrar una vez y pasar entre subdominios sin
volver a escribir la clave) el siguiente paso es alojar las apps bajo el mismo dominio padre y
compartir la sesión con una cookie de `.bento.mx`. Hoy basta con usar el mismo correo en cada app.

---

## Endurecimiento opcional (no bloquea nada)

Los *advisors* de Supabase marcan avisos que **ya existían** en el proyecto (no los introdujo
Finanzas): `search_path` mutable en varias funciones, algunas funciones `SECURITY DEFINER` de
espacios/invitaciones ejecutables por el rol público, y la protección de contraseñas filtradas
desactivada. Son mejoras recomendadas de seguridad, no errores. Se pueden atender después sin
afectar el funcionamiento.

---

## Archivos

```
index.html          La app (un solo archivo: diseño + lógica).
config.js           Se genera en el build desde las variables de entorno (gitignored).
config.example.js   Plantilla para probar en local.
build.js            Genera config.js a partir de SUPABASE_URL / SUPABASE_ANON_KEY.
netlify.toml        Build + redirects SPA + cabeceras.
_redirects          Respaldo del fallback SPA.
.env.example        Ejemplo de variables de entorno.
```
