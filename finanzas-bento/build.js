/* ============================================================
   Genera config.js a partir de las variables de entorno de Netlify.
   Así SUPABASE_URL y SUPABASE_ANON_KEY nunca viven en el repositorio
   ni en el HTML: se inyectan en el momento del build.

   Variables esperadas (Netlify → Site settings → Environment variables):
     SUPABASE_URL       = https://kqrzlqvlsxmevzyeeoda.supabase.co
     SUPABASE_ANON_KEY  = sb_publishable_...  (o la anon public JWT)

   La clave anon/publishable está pensada para el navegador: lo que
   protege los datos es la seguridad por filas (RLS) de Supabase.
   NUNCA uses la clave service_role aquí.
   ============================================================ */
const fs = require('fs');

const URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!URL || !KEY) {
  console.error('\n[build] FALTAN variables de entorno SUPABASE_URL y/o SUPABASE_ANON_KEY.');
  console.error('[build] Configúralas en Netlify → Site settings → Environment variables.\n');
  // No abortamos el build: escribimos un config vacío para que la app
  // muestre un mensaje claro en vez de romperse en blanco.
}

const out =
  '/* Generado automáticamente en el build de Netlify. No editar a mano. */\n' +
  'window.BENTO_SUPABASE_URL = ' + JSON.stringify(URL) + ';\n' +
  'window.BENTO_SUPABASE_KEY = ' + JSON.stringify(KEY) + ';\n';

fs.writeFileSync('config.js', out);
console.log('[build] config.js generado' + (URL ? ' para ' + URL : ' VACÍO (revisa las variables)'));
