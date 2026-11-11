# SIT-Pay Arequipa — Sistema de Pago Digital del Pasaje del Transporte Público Urbano

> **Proyecto Académico — Universidad Continental**  
> **Curso:** Programación Web  
> **Área:** Ingeniería de Software / Aplicaciones Distribuidas y Móviles  
> **Enfoque:** Coordinación de pagos accesible y auditable, sin custodia de fondos (NO incluye GPS, mapas ni rastreo).

---

## 1. Contexto del Problema y Justificación Normativa

En el transporte público urbano de Arequipa (Sistema Integrado de Transporte - SIT), el manejo manual de dinero en efectivo genera fricción, inseguridad al conducir, cobros informales sin comprobante y un recurrente incumplimiento de las tarifas preferenciales establecidas por ley.

**SIT-Pay Arequipa** busca facilitar el pago del pasaje mediante una app móvil Flutter, un panel web React y una API central. SIT-Pay **no es una billetera digital, no mantiene saldos ni custodia fondos**: en una operación real, el dinero debe ser procesado y liquidado directamente por una entidad financiera externa. El proveedor bancario todavía no está definido ni integrado. El prototipo permite probar el recorrido con tarjetas ficticias; esos pagos se marcan como simulados y no generan cargos.

### Cumplimiento del Marco Legal Peruano:
1. **Ley N° 26271 (Pasaje Diferenciado Universitario y Escolar)**:
   - El valor del pasaje universitario y escolar equivale al 50 % de la tarifa regular de adulto (configurable: S/ 0.50 vs S/ 1.00).
   - Aplica reglamentariamente de **05:00 a 24:00 horas en días laborables**.
   - Requiere acreditación previa (vía correo institucional `.edu.pe` o foto del carné universitario/escolar).
   - Fuera del horario legal o sin aprobación vigente, el motor calcula la tarifa regular. El prototipo solo simula el pago.
2. **Ley N° 29733 (Protección de Datos Personales)**:
   - Registro de consentimiento expreso e informado en el registro de usuarios.
   - Las notificaciones del prototipo se identifican explícitamente como simulaciones; no equivalen a una confirmación bancaria.
   - Registro inmutable de auditoría para todas las operaciones sensibles.
3. **Ley N° 29571 (Código de Protección y Defensa del Consumidor)**:
   - Las boletas del prototipo indican que el pago es simulado. En producción, solo se deben emitir comprobantes después de verificar el pago con el proveedor externo.
   - Historial de transacciones descargable y módulo formal de Libro de Reclamaciones e Incidencias.
4. **Pagos externos (integración pendiente)**:
   - La entidad financiera seleccionada procesará y liquidará los fondos. SIT-Pay no recibe recargas, no ofrece saldo y no confirma pagos por cuenta propia.
   - La aplicabilidad de normas financieras y las responsabilidades de cada parte requieren validación legal con el proveedor elegido antes del despliegue.

---

## 2. Estructura del Monorepo

```text
sit-pay-arequipa/
├── backend/                  # API REST + Swagger + Socket.IO (Node.js + Supabase Auth/PostgreSQL)
├── mobile/                   # App Flutter (Dart) para celulares (Pasajeros y Choferes con enrutamiento automático)
├── web/                      # Panel Web React + Vite + Tailwind CSS (Escritorio/Tablet para Empresas y Autoridad)
├── src/                      # Prototipo visual de la raíz; no procesa pagos reales
└── README.md                 # Guía unificada de ejecución y pruebas
```

> **Regla de Integración**: Los dos frontends (móvil y web) consumen **EXACTAMENTE** la misma API REST del backend. Ningún cliente accede a la base de datos de forma directa.

---

## 3. Cuentas de Acceso

El backend ya no crea cuentas demo con contraseñas conocidas. El primer `SUPER_ADMIN` se establece con variables locales `INITIAL_SUPER_ADMIN_*` y se crea con `npm run seed:supabase`. Los modos de demostración locales de los frontends no crean cuentas en Supabase.

---

## 4. Requisitos Previos e Instalación

### Requisitos del Sistema:
- **Node.js**: v18.0 o superior y **npm** v9 o superior.
- **Proyecto Supabase** con Auth habilitado, PostgreSQL y un bucket público de Storage llamado `profile-photos`. Obtén las claves desde Project Settings y la cadena PostgreSQL desde Database > Connect; crea el bucket antes de usar la carga de fotos.
- **Flutter SDK**: v3.16 o superior con Dart SDK.

---

### 4.1. Configuración y Ejecución del Backend (`backend/`)

1. **Navegar a la carpeta del backend e instalar dependencias**:
   ```bash
   cd sit-pay-arequipa/backend
   npm install
   ```

2. **Configurar el archivo `.env`**:
   Crear un archivo `.env` en la raíz de `backend/` basándose en `.env.example`:
   ```env
   PORT=5000
   NODE_ENV=development

   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=clave-anonima
   SUPABASE_SERVICE_ROLE_KEY=clave-service-role-solo-en-backend
   DATABASE_URL=postgresql://usuario:contraseña@host:5432/postgres
   DATABASE_SSL=true
   SUPABASE_STORAGE_BUCKET=profile-photos
   GOOGLE_CLIENT_ID=tu-id-de-cliente-oauth-web

   # CORS
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173

   # Dominios universitarios autorizados (Ley 26271)
   ALLOWED_EDU_DOMAINS=continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe

   # Usa los mismos datos SMTP configurados en Supabase Dashboard > Authentication > SMTP Settings.
   # Supabase Auth envía confirmación y recuperación; el backend usa SMTP para el OTP institucional.
   SMTP_HOST=smtp.example.edu.pe
   SMTP_PORT=587
   SMTP_USER=cuenta-de-correo
   SMTP_PASSWORD=contraseña-de-aplicación
   SMTP_FROM=SIT-Pay <no-reply@example.edu.pe>

   # Token Migo para consulta de DNI: obtener uno nuevo y mantenerlo solo en el .env local/servidor.
   MIGO_API_TOKEN=tu_token_nuevo

   # Cuenta inicial de administración, usada solo por seed:supabase
   INITIAL_SUPER_ADMIN_EMAIL=admin@example.com
   INITIAL_SUPER_ADMIN_PASSWORD=una-contraseña-segura
   INITIAL_SUPER_ADMIN_NAMES=Nombre
   INITIAL_SUPER_ADMIN_SURNAMES=Apellido
   ```

   En Supabase, configura SMTP en **Authentication > SMTP Settings** y ajusta las plantillas de confirmación y recuperación para mostrar el código OTP (`{{ .Token }}`), no solo un enlace. Configura la vigencia OTP de Auth en 15 minutos o menos: la API limita el registro a 5 minutos y la recuperación a 15. La app valida ambos códigos contra Supabase Auth; el OTP de acreditación institucional lo envía el backend usando las mismas credenciales SMTP. En desarrollo puede habilitarse el autofill simulado de registro con `REGISTRATION_EMAIL_DEV_AUTOFILL=true`; en producción los correos de registro y recuperación los envía Supabase Auth. La verificación del correo institucional activa automáticamente la tarifa universitaria y no requiere aprobación de la empresa.

   Para habilitar el inicio administrativo con Google, configura un cliente OAuth 2.0 de tipo aplicación web en Google Cloud Console. Copia el mismo Client ID en `backend/.env` como `GOOGLE_CLIENT_ID` y en `web/.env` como `VITE_GOOGLE_CLIENT_ID`; agrega los orígenes autorizados de la web. El botón permite entrar solo con correos ya registrados como `ADMIN_EMPRESA` o `SUPER_ADMIN`; no crea cuentas automáticamente.

   La API valida los JWT de Supabase Auth. Mantén `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` y `MIGO_API_TOKEN` únicamente en el entorno privado del backend. El bucket de fotos debe configurarse como público para servir las URL persistidas por la API; el cliente móvil y web no deben conectarse directamente a PostgreSQL.

3. **Crear las tablas e inicializar datos**:
   ```bash
   npm run migrate:latest
   npm run seed:supabase
   ```
   Las migraciones crean el esquema PostgreSQL desde cero. El seed agrega roles, unidades de negocio, tarifas base y el `SUPER_ADMIN` indicado por el entorno; no elimina datos existentes.

   La tabla `metodos_pago` guarda los métodos ficticios del pasajero. La migración de detalles del comprobante conserva placa, empresa, unidad de transporte y motivo de tarifa tal como estaban al pagar, aunque luego cambien los datos del vehículo. Después de desplegar nuevas migraciones, ejecuta `npm run migrate:latest` para aplicarlas al PostgreSQL de ese entorno; `npm start` no ejecuta migraciones automáticamente.

   **Pagos de prototipo:** la app acepta únicamente tarjetas ficticias de 16 dígitos que comiencen con `9999`. Se guardan en PostgreSQL solo el titular, los últimos cuatro dígitos y el vencimiento; el número completo y el CVV no se almacenan. Las transacciones y avisos al chofer quedan marcados como simulados. No ingreses tarjetas reales ni uses este flujo para cobrar dinero.

4. **Iniciar el servidor backend**:
   ```bash
   npm run dev
   ```
   - El servidor iniciará en: `http://localhost:5000`
   - La documentación interactiva Swagger UI estará lista en: `http://localhost:5000/api/docs`

---

### 4.2. Configuración y Ejecución de la App Móvil Flutter (`mobile/`)

1. **Navegar a la carpeta mobile**:
   ```bash
   cd sit-pay-arequipa/mobile
   ```

2. **Descargar paquetes de Flutter**:
   ```bash
   flutter pub get
   ```

3. **Configurar el backend para el dispositivo**:
   - MOBILE usa por defecto el backend desplegado en Render.
   - Para probar un backend local, pasa `SITPAY_API_URL` y `SITPAY_SOCKET_URL`; en emulador Android usa `10.0.2.2`, y en un teléfono físico usa la IP local de la computadora.
   - El backend permite orígenes `localhost` y `127.0.0.1` para Flutter Web en desarrollo, incluso cuando Flutter asigna un puerto dinámico; los demás orígenes deben estar en `CORS_ORIGIN`.

4. **Ejecutar la app móvil**:
   ```bash
   flutter run --dart-define=SITPAY_API_URL=http://10.0.2.2:5000/api/v1 --dart-define=SITPAY_SOCKET_URL=http://10.0.2.2:5000
   ```

---

### 4.3. Configuración y Ejecución del Panel Web React (`web/`)

1. **Navegar a la carpeta web e instalar dependencias**:
   ```bash
   cd sit-pay-arequipa/web
   npm install
   ```

2. **Iniciar el servidor de desarrollo Vite**:
   ```bash
   npm run dev
   ```
   - El panel abrirá en: `http://localhost:5173`

---

## 5. Verificación inicial

1. Ejecuta las migraciones y `seed:supabase`. El seed crea roles, unidades de negocio, tarifas base y únicamente la cuenta `SUPER_ADMIN` definida en el entorno; no hay cuentas de demostración ni empresas, vehículos o choferes precargados.
2. Inicia sesión en el panel con las credenciales locales del superadministrador. Registra una empresa y crea sus cuentas administrativas; desde los módulos correspondientes registra vehículos y vincula choferes.
3. Registra un pasajero desde la app. Para verificar el DNI y enviar el enlace de confirmación, configura `MIGO_API_TOKEN` y el correo de Supabase Auth. Agrega `sitpay://auth-callback` a las Redirect URLs permitidas en Supabase. Google OAuth requiere además configurar `GOOGLE_CLIENT_ID`.
4. Prueba la acreditación universitaria usando un correo de un dominio permitido. La verificación del correo institucional activa automáticamente el beneficio; no requiere aprobación de la empresa.
5. Si pruebas los métodos de pago, usa únicamente tarjetas ficticias que empiecen con `9999`. Los pagos del prototipo y sus avisos se marcan como simulados y no generan cargos.
6. Prueba reclamos, pagos y notificaciones después de crear usuarios y datos relacionados. El backend usa PostgreSQL; no se proporcionan contraseñas compartidas ni datos seed de empresas o pasajeros.

El proveedor financiero todavía no está integrado. Antes de habilitar pagos reales se deben implementar la autorización del proveedor, la verificación de sus notificaciones, la conciliación e idempotencia y la emisión de comprobantes solo después de confirmar el pago.

---

## 6. Licencia y Créditos Académicos

- **Autores**: Estudiantes de la **Universidad Continental** — Carrera de Ingeniería de Sistemas e Informática.
- **Asignatura**: Programación Web.
- **Licencia**: Código libre bajo licencia permisiva MIT. Desarrollado con librerías 100% open source y recursos gráficos libres de regalías.
