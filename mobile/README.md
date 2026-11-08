# SIT-PAY Mobile

## Google sign-in setup

Google sign-in uses Google OAuth directly. Create an
Android OAuth client using the app package name and signing-certificate SHA-1,
and a Web OAuth client for the ID token audience. Set `GOOGLE_CLIENT_ID` in the
backend environment to the Web client ID, and pass the same ID to Flutter:

```powershell
flutter run --dart-define=GOOGLE_WEB_CLIENT_ID=<web-oauth-client-id>
```

The Android package name is currently `com.example.sit_pay_mobile` in
`android/app/build.gradle.kts`. Register each signing certificate's SHA-1 with
Google Cloud Console. Do not commit credentials or local environment files.

The backend validates the Google ID token before login or account creation.
New passenger accounts must still accept the data and DNI-query consents,
verify their DNI, may provide a phone number, and complete the app's local
face/liveness check. The verified Google email replaces the app's email-code
step for this flow. Google account status and user profiles are stored in
Supabase Auth and PostgreSQL. Run the backend migrations before using the flow.

## Backend networking

The default API and Socket.IO addresses target an Android emulator. For a
physical phone or iOS simulator, pass the reachable computer IP when launching:

```powershell
flutter run --dart-define=SITPAY_API_URL=http://192.168.1.50:5000/api/v1 --dart-define=SITPAY_SOCKET_URL=http://192.168.1.50:5000
```

Replace the example IP with the host running the backend. The phone and computer
must be able to reach each other over the network. Configure `CORS_ORIGIN` for
the web application's origin.

## Simulated payment methods

Payment methods are prototype-only. Use a fictitious 16-digit number beginning
with `9999`; never enter a real card. The backend stores only the cardholder,
expiration, and last four digits, and never saves the full number or CVV.
Payments and driver notifications are visibly marked as simulated and do not
charge money. Local demo mode stores its fake card summaries on the device.
