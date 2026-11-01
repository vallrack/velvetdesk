# 📋 VelvetDesk — Historial Completo del Proyecto

> Última actualización: 2026-10-21

---

## 🏗️ FASE 1 — Arquitectura base del sistema

### Lo que se construyó desde cero

| Módulo | Descripción |
|--------|-------------|
| **`server.ts`** | Servidor Express con ~1,160 líneas. Maneja todos los endpoints REST del panel |
| **`src/App.tsx`** | Aplicación React principal. Gestión de estado global, realtime, routing entre vistas |
| **`src/integrations/whatsapp.ts`** | Integración Baileys (WhatsApp Web multi-device). QR, sesión, mensajes entrantes/salientes, notas de voz |
| **`src/integrations/telegram.ts`** | Bot de Telegram con polling. Mensajes, notas de voz, auto-reply |
| **`src/integrations/fansly.ts`** | Poller de mensajes de Fansly |
| **`src/integrations/manyvids.ts`** | Poller de mensajes de ManyVids |
| **`src/integrations/pornhub.ts`** | Poller de mensajes de Pornhub |
| **`src/integrations/scatbook.ts`** | Poller de mensajes de Scatbook |
| **`src/integrations/vipweb.ts`** | Poller de mensajes de VIPweb |
| **`src/services/apiService.ts`** | Capa centralizada de fetch. Todas las llamadas al backend desde React |
| **`src/services/geminiService.ts`** | Cliente de Gemini AI para generar respuestas del bot |
| **Supabase DB** | Base de datos completa con 8 tablas: `channels`, `threads`, `messages`, `fans`, `vault_items`, `bot_persona`, `bot_rules`, `faqs`, `payment_gateways`, `purchase_records` |

### Vistas del panel implementadas

| Vista | Funciones |
|-------|-----------|
| **Inbox (Bandeja unificada)** | Conversaciones de 7 plataformas, modo bot/manual, envío de PPV, unlock de contenido, notas de voz |
| **Bot Engine** | Configuración de persona del bot, reglas, FAQs, tono, emojis, delay humano |
| **Vault (Bóveda)** | Biblioteca de contenido multimedia, precios, tags, envío a chat |
| **Channels (Canales)** | Conexión/desconexión de 7 canales, QR de WhatsApp, token Telegram, estado en tiempo real |
| **CRM (Fans)** | Perfiles de fans, tier (curioso/recurrente/VIP), historial de compras, notas privadas |
| **Payments** | Configuración de métodos de pago (PayPal, Wise, Crypto, USDT) |
| **Analytics** | Resumen de revenue del día, fans activos, mensajes no leídos, canales conectados |
| **VoiceStudio** | Clonación de voz, perfiles de voz, síntesis TTS, asignación por género |

---

## 🔧 FASE 2 — Correcciones críticas y mejoras de sesión

### Fixes de WhatsApp y Sesión

| Fix | Descripción |
|-----|-------------|
| **QR de WhatsApp** | Auto-detección de sesiones muertas (`registered: false`) → limpieza automática y re-generación de QR |
| **Botón de desconexión segura** | Endpoint `/api/channels/:id/disconnect` que hace logout limpio + borra `wa-session/` del disco |
| **Despacho manual de mensajes** | Lo que escribe la creadora en el panel se envía al WhatsApp/Telegram real del fan |
| **Lock `isWhatsAppStarting`** | Previene múltiples instancias paralelas de Baileys al hacer polling del QR |

### VoiceStudio — Clonación de Voz

| Feature | Descripción |
|---------|-------------|
| **Endpoint `/api/bot/tts`** | Sintetiza audio con VoiceStudio local (puerto 3900), con fallback a Google TTS |
| **Timeout extendido** | 60s para síntesis en CPU sin GPU |
| **Cache de `ref_text`** | Evita round-trip extra a VoiceStudio por nota de voz |
| **Selección por género** | `femaleVoiceId` / `maleVoiceId` para voz clonada de la creadora |
| **Pre-warming** | Endpoint `/api/bot/voice/warm` calienta el modelo al arrancar |

---

## 🚀 FASE 3 — Lanzador `.bat` y portabilidad

| Archivo | Descripción |
|---------|-------------|
| **`iniciar_sistema.bat`** | Un solo doble clic: libera puertos, lanza VoiceStudio en background, espera, abre browser, arranca Node.js |
| **`detener_sistema.bat`** | Cierra limpiamente todos los procesos en puertos 3000 y 3900 |

---

## 🐛 FASE 4 — Auditoría y corrección masiva (sesión actual)

### Bugs críticos corregidos ✅

| # | Bug | Archivo | Fix |
|---|-----|---------|-----|
| 1 | Voice notes WhatsApp enviaban **JSON** corrupto como audio | `whatsapp.ts` | Parsea `{audioUrl}` → descarga el MP3 real → lo envía como `ptt: true` |
| 2 | Modelo Gemini `gemini-3.5-flash` no existe → 500 siempre | `server.ts` | Cambiado a `gemini-1.5-flash` |
| 3 | Telegram **nunca** enviaba notas de voz | `telegram.ts` | Agregada lógica `isVoice` + `sendVoice()` con fallback a texto |

### Bugs altos corregidos ✅

| # | Bug | Archivo | Fix |
|---|-----|---------|-----|
| 4 | Sin autenticación en ninguna ruta | `server.ts` | **Auth middleware JWT** con Supabase, cache de 5 min por token |
| 5 | Browser se abría antes del servidor (ERR_CONNECTION_REFUSED) | `.bat` | PowerShell en background con `Start-Sleep 10` |
| 6 | `today_revenue` hacía overwrite en lugar de sumar | `server.ts` | Lée valor actual + incrementa |

### Bugs medios corregidos ✅

| # | Bug | Archivo | Fix |
|---|-----|---------|-----|
| 7 | Reconexión infinita de WhatsApp (memory leak) | `whatsapp.ts` | Contador `reconnectAttempts`, máx. 5, backoff 5s→30s |
| 8 | MP3 de notas de voz nunca se borraban del disco | `server.ts` | Job `scheduleAudioCleanup()`: cada 6h borra archivos de +24h |

### 🔐 Autenticación multiusuario implementada ✅

| Archivo | Rol |
|---------|-----|
| `src/services/authService.ts` ✨ | `login()`, `register()`, `logout()`, `onAuthStateChange()` |
| `src/components/auth/LoginView.tsx` ✨ | Pantalla login/registro con diseño glassmorphism premium |
| `src/services/apiService.ts` | Inyecta `Authorization: Bearer <token>` en cada request |
| `src/App.tsx` | Verifica sesión al boot, bloquea el panel si no autenticado |
| `src/components/layout/Navbar.tsx` | Avatar del usuario + botón de logout |
| `server.ts` | Middleware que valida el JWT de Supabase en todas las rutas `/api/*` |

---

---

## 🚀 FASE 5 — Auditoría, Analytics Avanzado y Expansión CRM (Sesión 2026-11-01)

### Features y Mejoras Completadas ✅

| # | Feature / Fix | Archivos | Descripción |
|---|---------------|----------|-------------|
| **P1** | **Paginación & Optimización de memoria** | `server.ts`, `apiService.ts`, `App.tsx` | Endpoints con `?page=X&limit=Y` para mensajes, threads y fans. Cache con TTL de 60s. |
| **B1** | **Web Push Notifications** | `App.tsx` | Notificaciones nativas de escritorio del navegador cuando llega un mensaje de un fan y la pestaña está oculta/minimizada. |
| **B3** | **Analytics con gráficas y cohortes** | `AnalyticsView.tsx` | Gráficas SVG interactivas (tendencia de área, barras por día), KPIs de revenue, desglose por canal, embudo PPV y matriz de retención. |
| **B6** | **Feedback visual en error de envío** | `App.tsx`, `ChatConversation.tsx` | Icono de alerta rojo con estado `failed` y sugerencia de reintento cuando falla un despacho. |
| **B2** | **Logs de Auditoría del Bot (RF-Audit)** | `botEngine.ts`, `server.ts`, `apiService.ts`, `BotEngineView.tsx` | Registro histórico de cada respuesta generada por la IA, modelo utilizado, intención detectada, sugerencia PPV, uso de voz clonada y latencia (ms). Pestaña dedicada con filtros y KPI cards. |
| **B5** | **Backup automático de voz activa** | `server.ts` | Al guardar configuración de voz, crea respaldo versionado en `voice_config_backups/voice_config_YYYYMMDD_HHMMSS.json`. |
| **B10** | **CRM Avanzado & Estadísticas por Fan** | `CrmView.tsx`, `App.tsx`, `UnifiedInbox.tsx` | Estadísticas por fan (LTV, ticket promedio, antigüedad), edición en tiempo real de notas de la creadora, cambio de tier dinámico, gestión de etiquetas (#tags), botón directo de apertura de chat en Inbox y exportación completa a CSV. |

---

## ⏳ PENDIENTES — Backlog priorizado

### 🟡 MEDIO — Próxima iteración
| # | Problema | Impacto | Esfuerzo |
|---|----------|---------|----------|
| P2 | **`refreshChannel`** conectividad real | Probar ping HTTP/red real por canal en vez de número aleatorio | Bajo |
| P3 | **Simulación persistente** | Guardar en Supabase al simular mensajes de prueba en sandbox | Medio |
| B4 | **Encriptar tokens sensibles** | Cifrado AES-256 para tokens de plataformas en base de datos | Medio |
| B8 | **Mensajes programados** | Cola de mensajes diferidos con selector de fecha/hora | Medio |

---

## 📊 Estado general del sistema

```
Infraestructura         ████████████████████ 100%
Backend API             ████████████████████ 100%
WhatsApp Integration    ████████████████████ 100%
Telegram Integration    ████████████████░░░░  85%  (sin stickers/GIFs)
Autenticación           ████████████████████ 100%
Bot IA (Gemini)         ████████████████████ 100%  (con auditoría + fallback)
Voice Cloning           ████████████████████ 100%  (con backup automático)
CRM Omnicanal           ████████████████████ 100%  (estadísticas, edición viva, CSV)
Analytics               ████████████████████ 100%  (gráficas históricas + cohortes)
Seguridad               ████████████████░░░░  85%  (JWT verificado, tokens pendientes de AES)
Portabilidad (.bat)     ████████████████████ 100%
```

---

## 🗂️ Archivos clave del proyecto

| Archivo | Tamaño | Rol |
|---------|--------|-----|
| `server.ts` | ~1,160 líneas | Servidor Express completo |
| `src/App.tsx` | ~640 líneas | React app principal |
| `src/integrations/whatsapp.ts` | ~455 líneas | Baileys WhatsApp |
| `src/integrations/telegram.ts` | ~235 líneas | Bot Telegram |
| `src/services/apiService.ts` | ~240 líneas | Capa de API |
| `src/services/authService.ts` | ~80 líneas | Auth Supabase ✨ |
| `src/components/auth/LoginView.tsx` | ~130 líneas | Pantalla de login ✨ |
| `iniciar_sistema.bat` | 62 líneas | Lanzador one-click |
| `detener_sistema.bat` | 28 líneas | Stopper limpio |
| `.env` | 46 líneas | Variables de entorno |
