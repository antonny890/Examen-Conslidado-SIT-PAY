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
├── backend/                  # API REST + Swagger + Socket.IO (Node.js + Firebase Admin)
├── mobile/                   # App Flutter (Dart) para celulares (Pasajeros y Choferes con enrutamiento automático)
├── web/                      # Panel Web React + Vite + Tailwind CSS (Escritorio/Tablet para Empresas y Autoridad)
├── src/                      # Prototipo visual de la raíz; no procesa pagos reales
└── README.md                 # Guía unificada de ejecución y pruebas
```

> **Regla de Integración**: Los dos frontends (móvil y web) consumen **EXACTAMENTE** la misma API REST del backend. Ningún cliente accede a la base de datos de forma directa.

---

## 3. Cuentas de Acceso

El backend ya no crea cuentas demo con contraseñas conocidas. El primer `SUPER_ADMIN` se establece con variables locales `INITIAL_SUPER_ADMIN_*` y se crea con `npm run seed:firebase`. Los modos de demostración locales de los frontends no crean cuentas en Firebase.

---

## 4. Requisitos Previos e Instalación

### Requisitos del Sistema:
- **Node.js**: v18.0 o superior y **npm** v9 o superior.
- **Proyecto Firebase** con Authentication (Email/Password), Cloud Firestore y Cloud Storage habilitados.
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

   # Firebase: conserva la clave privada solo en backend/credentials/ (ignorada por Git)
   FIREBASE_SERVICE_ACCOUNT_PATH=
   FIREBASE_WEB_API_KEY=clave-web-del-proyecto
   FIREBASE_STORAGE_BUCKET=nombre-del-bucket-de-storage
   GOOGLE_CLIENT_ID=tu-id-de-cliente-oauth-web

   # CORS
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173

   # Dominios universitarios autorizados (Ley 26271)
   ALLOWED_EDU_DOMAINS=continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe

   # Resend: proveedor principal para códigos de registro, recuperación y medio pasaje.
   RESEND_API_KEY=tu_clave_de_resend
   RESEND_FROM=SIT-Pay <onboarding@resend.dev>
   RESEND_TEST_TO=tu_correo_autorizado_en_resend

   # SMTP opcional como alternativa si Resend no está configurado.
   SMTP_HOST=smtp.example.edu.pe
   SMTP_PORT=587
   SMTP_USER=cuenta-de-correo
   SMTP_PASSWORD=contraseña-de-aplicación
   SMTP_FROM=SIT-Pay <no-reply@example.edu.pe>

   # Token Migo para consulta de DNI: obtener uno nuevo y mantenerlo solo en el .env local/servidor.
   MIGO_API_TOKEN=tu_token_nuevo

   # Cuenta inicial de administración, usada solo por seed:firebase
   INITIAL_SUPER_ADMIN_EMAIL=admin@example.com
   INITIAL_SUPER_ADMIN_PASSWORD=una-contraseña-segura
   INITIAL_SUPER_ADMIN_NAMES=Nombre
   INITIAL_SUPER_ADMIN_SURNAMES=Apellido
   ```

   Resend se usa cuando `RESEND_API_KEY` y `RESEND_FROM` están configurados; si no, se usa SMTP cuando está configurado. Para probar el envío, establece `RESEND_TEST_TO` con un destinatario permitido por Resend y ejecuta `npm run test:resend` desde `backend/`. Con el dominio de prueba `onboarding@resend.dev`, Resend puede limitar los destinatarios permitidos. No guardes claves reales en `.env.example` ni en Git.

   La recuperación/cambio de contraseña y la verificación de correo requieren un proveedor de correo configurado y no exponen códigos en la respuesta. En producción, las solicitudes fallan explícitamente si el envío no se completa. En desarrollo, si no hay proveedor configurado, el OTP universitario se muestra solo para pruebas. La confirmación de ese OTP activa automáticamente la tarifa universitaria; no requiere aprobación de la empresa.

   Para habilitar el inicio administrativo con Google, configura un cliente OAuth 2.0 de tipo aplicación web en Google Cloud Console. Copia el mismo Client ID en `backend/.env` como `GOOGLE_CLIENT_ID` y en `web/.env` como `VITE_GOOGLE_CLIENT_ID`; agrega los orígenes autorizados de la web. El botón permite entrar solo con correos ya registrados como `ADMIN_EMPRESA` o `SUPER_ADMIN`; no crea cuentas automáticamente.

   La API valida Firebase ID tokens; el refresh token se intercambia en el backend. `FIREBASE_WEB_API_KEY` es la clave pública de configuración web necesaria para intercambiar credenciales con Firebase Authentication. No incluyas la clave privada de Admin ni `MIGO_API_TOKEN` en los frontends o en Git.

   **Reglas de Firebase:** los frontends acceden a Firestore y Storage exclusivamente a través del backend. Las reglas raíz `firestore.rules` y `storage.rules` deniegan el acceso directo desde clientes; Firebase Admin SDK del backend no está sujeto a estas reglas. Vincula el proyecto correcto con Firebase CLI y despliega solo después de comprobar que es el proyecto esperado:
   ```bash
   firebase use <project-id>
   firebase deploy --only firestore:rules,storage
   ```
   No despliegues estas reglas si en el futuro agregas lecturas/escrituras directas desde un frontend; define primero reglas específicas para ese flujo.

3. **Inicializar Firestore y la cuenta de primer acceso**:
   ```bash
   npm run seed:firebase
   ```
   El seed no borra documentos: crea las unidades de negocio y tarifas base si faltan, además del `SUPER_ADMIN` indicado por el entorno. Las migraciones Knex existentes son solo historial; no se ejecutan en el backend actual.

   **Pagos de prototipo:** la app acepta únicamente tarjetas ficticias de 16 dígitos que comiencen con `9999`. Se guarda en Firestore solo el titular, los últimos cuatro dígitos y el vencimiento; el número completo y el CVV no se almacenan. Las transacciones y avisos al chofer quedan marcados como simulados. No ingreses tarjetas reales ni uses este flujo para cobrar dinero.
   **Seed:** no ejecutes seeds Knex antiguos; pertenecen al esquema PostgreSQL histórico y no al backend Firebase actual.

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
   - El valor predeterminado `http://10.0.2.2:5000/api/v1` sirve para un emulador Android.
   - Para un teléfono físico o iOS, pasa la IP accesible de la computadora que ejecuta el backend.

4. **Ejecutar la app móvil**:
   ```bash
   flutter run --dart-define=SITPAY_API_URL=http://192.168.1.50:5000/api/v1 --dart-define=SITPAY_SOCKET_URL=http://192.168.1.50:5000
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

## 5. Guía de Pruebas del Flujo Completo Paso a Paso

Esta guía cubre funciones disponibles y deja explícito el límite del flujo de pago mientras no exista proveedor financiero.

### Paso 1: Inicio de Sesión y Enrutamiento Automático por Rol
1. Abrir la app móvil Flutter.
2. Ingresar con la cuenta de chofer `chofer.carlos@sitpay.gob.pe` y contraseña `SitPay2026!`.
3. **Resultado**: La app detecta el rol `CHOFER` y lo redirige automáticamente a la pantalla **"Cero Distracción"** con su placa `V7A-890` y su código QR fijo grande, activando la conexión WebSocket en la sala de su bus.
4. En otro emulador o teléfono (o cerrando sesión), ingresar como pasajero `lucia.continental@continental.edu.pe`.
5. **Resultado**: La app detecta el rol `PASAJERO` y abre la pantalla con su distintivo **"Universitaria Acreditada (50 %)"**. No existe saldo de usuario.

---

### Paso 2: Acreditación de Medio Pasaje (Ley N° 26271)
1. Iniciar sesión como pasajero regular `pasajero.pedro@gmail.com`.
2. Tocar la opción **"Medio Pasaje (Ley 26271)"** en el inicio.
3. **Correo institucional**:
   - Ingresar institución: "Universidad Continental".
   - Ingresar correo: `pedro.continental@continental.edu.pe`.
   - Presionar "Enviar Código de Verificación".
   - En desarrollo, el código de prueba aparece en pantalla y en la consola; con SMTP configurado se envía al correo.
   - Ingresar el código OTP y presionar "Verificar".
   - **Resultado**: El pase pasa inmediatamente a **`APROBADA`** con vigencia de 6 meses. A partir de ese momento, el sistema le cobrará **S/ 0.50** dentro del horario de 05:00 a 24:00 horas.
4. No hay envío de foto de carné ni aprobación por parte de la concesionaria. Mientras el correo no se verifique, se aplica la tarifa normal.

---

### Paso 3: Métodos de pago simulados
1. En el perfil del pasajero, abre **Métodos de pago** y agrega una tarjeta ficticia, por ejemplo `9999999999999999`, con un vencimiento futuro y CVV de prueba.
2. La aplicación conserva solo los datos enmascarados; no ingreses datos de tarjetas reales.
3. **Resultado esperado:** los métodos de pago se guardan por usuario en Firestore para las cuentas conectadas al backend. El modo demo local los guarda solo en el dispositivo.

---

### Paso 4: Preparación de pago por QR o placa
1. Colocar ambas pantallas a la vista:
   - Dispositivo 1: Chofer Carlos en su pantalla con la placa `V7A-890`.
   - Dispositivo 2: Pasajera Lucía (`lucia.continental@continental.edu.pe`).
2. En la app de Lucía, presionar el botón grande **`PAGAR PASAJE`**.
3. Seleccionar **"Escanear QR del Bus"** y enfocar el QR del chofer (o seleccionar **"Digitar Placa"** e ingresar `V7A-890`).
4. **Previsualización de Tarifa**: La app muestra:
   - Placa: `V7A-890`
   - Empresa: `Transcayma Operadora S.A.`
   - Tarifa calculada: **Medio Pasaje Acreditado S/ 0.50** (Ley 26271).
5. Si no tiene tarjeta, SIT-Pay le ofrece agregar una y regresa al flujo de pago.
6. Elige una de sus tarjetas, confirma el importe y recibe una boleta marcada como **simulada**. El chofer puede ver un aviso igualmente marcado como simulación.
7. **No se realiza ningún cargo real.** La integración bancaria sigue pendiente.

---

### Paso 5: Idempotencia y confirmación
La idempotencia bancaria y la conciliación no están implementadas porque aún no existe proveedor. Antes de habilitar pagos se deben verificar firmas de notificaciones bancarias, impedir duplicados y emitir comprobantes únicamente tras confirmar el estado con el banco.

---

### Paso 6: Libro de Reclamaciones e Incidencias (Ley N° 29571)
1. En la app del pasajero, ingresar al ícono de reclamos en la barra superior.
2. Tocar **"Nuevo Reclamo"**.
3. Seleccionar tipo de incidencia: *Cobro Indebido*, *Negativa de Medio Pasaje* o *Maltrato*.
4. Ingresar la descripción de los hechos y presionar "Registrar Reclamo".
5. Se generará un código único formal (ej. `REC-20261030-A1B2`).

---

### Paso 7: Fiscalización y Aprobación en el Panel Web de la Empresa (`ADMIN_EMPRESA`)
1. Abrir en el navegador de la computadora: `http://localhost:5173`.
2. Iniciar sesión con `admin.transcayma@sitpay.gob.pe` y contraseña `SitPay2026!`.
3. **Módulo Dashboard**: La recaudación bancaria no está disponible hasta integrar el proveedor; no se deben interpretar datos de demostración como pagos reales.
4. **Módulo Flota y QR**: Ver los vehículos de Transcayma. Al presionar **"Ver / Imprimir Cartel QR"**, se abre el cartel oficial listo para imprimir y colocar en el bus.
5. **Módulo Medio Pasaje**: Revisar la solicitud escolar de Rodrigo (`rodrigo.escolar@gmail.com`). Ver la foto del carné, fijar la fecha de vencimiento y presionar **"Aprobar Medio Pasaje"**.
6. **Módulo Reclamos**: Revisar el reclamo interpelado en el Paso 6, escribir la respuesta formal de la concesionaria y cambiar el estado a **`RESUELTO`**.
7. **Módulo Reportes**: La exportación de pagos queda pendiente hasta que existan transacciones verificadas por el proveedor bancario.

---

### Paso 8: Supervisión Global en el Panel Web del Super Administrador (`SUPER_ADMIN`)
1. Iniciar sesión con `superadmin@sitpay.gob.pe` y contraseña `SitPay2026!`.
2. **Dashboard Macro**: Consultar los indicadores disponibles; la recaudación consolidada requiere pagos bancarios verificados y actualmente no está disponible.
3. **Cuencas del SIT**: Consultar las 10 unidades de negocio (C2 a C11) con sus nombres y zonas oficiales de Arequipa.
4. **Configuración de Tarifas**: Modificar las tarifas de adulto o estudiante, o ajustar los horarios legales sin reiniciar el servidor ni alterar código.
5. **Auditoría (Ley 29733)**: Verificar la traza inmutable de todas las operaciones realizadas durante la sesión de pruebas con usuario, acción, IP y fecha/hora.

---

## 6. Licencia y Créditos Académicos

- **Autores**: Estudiantes de la **Universidad Continental** — Carrera de Ingeniería de Sistemas e Informática.
- **Asignatura**: Programación Web.
- **Licencia**: Código libre bajo licencia permisiva MIT. Desarrollado con librerías 100% open source y recursos gráficos libres de regalías.
