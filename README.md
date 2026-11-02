# SIT-Pay Arequipa — Sistema de Pago Digital del Pasaje del Transporte Público Urbano

> **Proyecto Académico — Universidad Continental**  
> **Curso:** Programación Web  
> **Área:** Ingeniería de Software / Aplicaciones Distribuidas y Móviles  
> **Enfoque:** Coordinación de pagos accesible y auditable, sin custodia de fondos (NO incluye GPS, mapas ni rastreo).

---

## 1. Contexto del Problema y Justificación Normativa

En el transporte público urbano de Arequipa (Sistema Integrado de Transporte - SIT), el manejo manual de dinero en efectivo genera fricción, inseguridad al conducir, cobros informales sin comprobante y un recurrente incumplimiento de las tarifas preferenciales establecidas por ley.

**SIT-Pay Arequipa** busca facilitar el pago del pasaje mediante una app móvil Flutter, un panel web React y una API central. SIT-Pay **no es una billetera digital, no mantiene saldos ni custodia fondos**: en una operación real, el dinero debe ser procesado y liquidado directamente por una entidad financiera externa. El proveedor bancario todavía no está definido ni integrado, por lo que actualmente no se puede cobrar.

### Cumplimiento del Marco Legal Peruano:
1. **Ley N° 26271 (Pasaje Diferenciado Universitario y Escolar)**:
   - El valor del pasaje universitario y escolar equivale al 50 % de la tarifa regular de adulto (configurable: S/ 0.50 vs S/ 1.00).
   - Aplica reglamentariamente de **05:00 a 24:00 horas en días laborables**.
   - Requiere acreditación previa (vía correo institucional `.edu.pe` o foto del carné universitario/escolar).
   - Fuera del horario legal o sin aprobación vigente, el motor calcula la tarifa regular; el cobro sigue deshabilitado hasta integrar al banco.
2. **Ley N° 29733 (Protección de Datos Personales)**:
   - Registro de consentimiento expreso e informado en el registro de usuarios.
   - La interfaz del chofer debe recibir únicamente la confirmación de un pago validado por el proveedor externo; nunca una confirmación simulada del cliente.
   - Registro inmutable de auditoría para todas las operaciones sensibles.
3. **Ley N° 29571 (Código de Protección y Defensa del Consumidor)**:
   - La emisión del comprobante y la confirmación al chofer deben ocurrir solo después de verificar el pago con el proveedor externo.
   - Historial de transacciones descargable y módulo formal de Libro de Reclamaciones e Incidencias.
4. **Pagos externos (integración pendiente)**:
   - La entidad financiera seleccionada procesará y liquidará los fondos. SIT-Pay no recibe recargas, no ofrece saldo y no confirma pagos por cuenta propia.
   - La aplicabilidad de normas financieras y las responsabilidades de cada parte requieren validación legal con el proveedor elegido antes del despliegue.

---

## 2. Estructura del Monorepo

```text
sit-pay-arequipa/
├── backend/                  # API REST + Swagger + Knex Migrations + Socket.IO (Node.js + PostgreSQL)
├── mobile/                   # App Flutter (Dart) para celulares (Pasajeros y Choferes con enrutamiento automático)
├── web/                      # Panel Web React + Vite + Tailwind CSS (Escritorio/Tablet para Empresas y Autoridad)
├── src/                      # Prototipo visual de la raíz; no procesa pagos reales
└── README.md                 # Guía unificada de ejecución y pruebas
```

> **Regla de Integración**: Los dos frontends (móvil y web) consumen **EXACTAMENTE** la misma API REST del backend. Ningún cliente accede a la base de datos de forma directa.

---

## 3. Cuentas de Acceso y Credenciales de Prueba

Todas las cuentas de prueba sembradas en la base de datos comparten la misma contraseña:

```text
Contraseña unificada: SitPay2026!
```

| Rol | Correo Electrónico | Nombre Completo | DNI | Placa Asignada / Condición |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `superadmin@sitpay.gob.pe` | Hernán Peralta Mendoza | 29481920 | Fiscalización y configuración de tarifas (MPA) |
| **ADMIN_EMPRESA** | `admin.transcayma@sitpay.gob.pe` | Gabriela Torres Valdivia | 41298451 | Empresa Transcayma Operadora S.A. |
| **CHOFER** | `chofer.carlos@sitpay.gob.pe` | Carlos Vilca Mamani | 40192837 | **Placa V7A-890** (Transcayma / Cuenca C3 Cayma) |
| **CHOFER** | `chofer.manuel@sitpay.gob.pe` | Manuel Quispe Chambi | 42891045 | **Placa V8B-123** (AQP Masivo / Cuenca C2 Cono Norte) |
| **CHOFER** | `chofer.juan@sitpay.gob.pe` | Juan Condori Apaza | 45129834 | **Placa V9C-456** (Unión AQP / Cuenca C6 Paucarpata) |
| **PASAJERO** | `pasajero.pedro@gmail.com` | Pedro Arenas Begazo | 72918234 | Tarifa regular adulto (tarifa de referencia: S/ 1.00) |
| **PASAJERO** | `lucia.continental@continental.edu.pe` | Lucía Flores Zeballos | 74129856 | **Universitaria APROBADA (tarifa de referencia: S/ 0.50)** |
| **PASAJERO** | `rodrigo.escolar@gmail.com` | Rodrigo Pinto Cáceres | 76541298 | **Escolar PENDIENTE (tarifa de referencia: S/ 1.00)** |

---

## 4. Requisitos Previos e Instalación

### Requisitos del Sistema:
- **Node.js**: v18.0 o superior y **npm** v9 o superior.
- **PostgreSQL**: v14 o superior con base de datos creada llamada `sit_pay_arequipa`.
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

   # PostgreSQL
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=sit_pay_arequipa
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_SSL=false

   # Seguridad JWT
   JWT_SECRET=super_secret_sit_pay_jwt_key_arequipa_2026
   JWT_EXPIRES_IN=2h
   JWT_REFRESH_SECRET=refresh_super_secret_sit_pay_key_2026
   JWT_REFRESH_EXPIRES_IN=7d

   # CORS
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173

   # Dominios universitarios autorizados (Ley 26271)
   ALLOWED_EDU_DOMAINS=continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe

   # Token Migo para consulta de DNI: obtener uno nuevo y mantenerlo solo en el .env local/servidor.
   MIGO_API_TOKEN=tu_token_nuevo
   ```

   La consulta de DNI móvil usa `/api/v1/auth/lookup-dni` a través de este backend y no consulta PostgreSQL. Requiere que el servidor API esté iniciado y que `MIGO_API_TOKEN` esté configurado. No incluyas el token en Flutter, en Git ni en capturas.

3. **Ejecutar las migraciones y sembrar datos de prueba (Knex.js)**:
   ```bash
   npm run migrate
   npx knex seed:run
   ```
   La migración retira tablas de billetera/recargas y columnas de saldo, y marca como `ANULADA` las transacciones `EXITOSA` del esquema anterior porque no tienen confirmación bancaria verificable. Si hay datos que deban conservarse, respalde y revise la base antes de aplicarla.

   **Pagos:** mientras no se configure e integre una API bancaria, las rutas de cobro responden `503 PAYMENT_PROVIDER_NOT_CONFIGURED`; no crean transacciones ni comprobantes de pago.
   **Seed:** `npx knex seed:run` borra y vuelve a crear los datos del sistema; ejecútelo solo en una base desechable de desarrollo o pruebas. No genera transacciones de pago ficticias.

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

3. **Configuración de IP de Red**:
   En `lib/core/constants/api_constants.dart`:
   - Para **Emulador Android**: se usa `http://10.0.2.2:5000/api/v1`.
   - Para **Dispositivo Físico o Emulador iOS**: colocar la IP local de su computadora (ej. `http://192.168.1.50:5000/api/v1`).

4. **Ejecutar la app móvil**:
   ```bash
   flutter run
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
3. **Método A (Correo Institucional)**:
   - Seleccionar tipo "Universitario".
   - Ingresar institución: "Universidad Continental".
   - Ingresar correo: `pedro.continental@continental.edu.pe`.
   - Presionar "Enviar Código de Verificación".
   - En la consola del backend o en pantalla aparecerá el código de 6 dígitos simulado (ej. `591240`).
   - Ingresar el código OTP y presionar "Verificar".
   - **Resultado**: El pase pasa inmediatamente a **`APROBADA`** con vigencia de 6 meses. A partir de ese momento, el sistema le cobrará **S/ 0.50** dentro del horario de 05:00 a 24:00 horas.
4. **Método B (Foto del Carné)**:
   - Probar con la cuenta de Rodrigo (`rodrigo.escolar@gmail.com`).
   - Al adjuntar foto del carné, queda en estado **`PENDIENTE`**.
   - El pasajero sigue pagando tarifa regular de S/ 1.00 hasta que la concesionaria lo apruebe.

---

### Paso 3: Estado actual del pago (proveedor pendiente)
1. Consultar la tarifa estimada en la app del pasajero.
2. La app muestra que el pago no está disponible. Si se prueba directamente el endpoint de cobro, el backend responde `503 PAYMENT_PROVIDER_NOT_CONFIGURED`.
3. **Resultado esperado:** no se debita ni almacena dinero, no se crea una transacción exitosa, no se emite un comprobante y el chofer no recibe una confirmación de pago.

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
5. La vista previa muestra los datos del vehículo y la tarifa de referencia; esto **no inicia ni confirma un cobro**.
6. El botón de pago permanece deshabilitado hasta que se implemente la integración bancaria.

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
