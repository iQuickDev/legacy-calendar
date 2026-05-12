# Requirements Document

## Introduction

This document defines the requirements for adding a comprehensive, production-grade logging system to the legacy-calendar project. The system covers both the NestJS backend (Bun runtime) and the Vue 3 frontend. The logging system must provide structured, contextual log output across all application layers — authentication, events, chat, notifications, uploads, users, database access, HTTP lifecycle, WebSocket events, Firebase operations, router navigation, and store actions — while remaining lightweight and avoiding heavy new dependencies.

## Glossary

- **Logger**: The central logging utility responsible for formatting and emitting log entries.
- **Backend_Logger**: The NestJS-side Logger instance, built on top of NestJS's built-in `Logger` class extended with custom transport logic.
- **Frontend_Logger**: The frontend-side logger utility/composable that provides structured logging for Vue 3 components, stores, services, and composables.
- **Log_Level**: A severity classification for a log entry. The six levels in ascending severity are: TRACE, DEBUG, INFO, WARNING, CRITICAL, FATAL.
- **Log_Entry**: A single structured log record containing at minimum: timestamp, level, module, message, and optional context fields.
- **Log_Context**: A set of key-value metadata attached to a Log_Entry, including fields such as `userId`, `requestId`, `module`, `eventId`, `socketId`, and `durationMs`.
- **Request_ID**: A unique identifier generated per HTTP request, propagated through the request lifecycle for correlation.
- **Transport**: The output destination for log entries. Supported transports are: console (development) and file or external sink (production).
- **Structured_Log**: A Log_Entry serialized as a single-line JSON object.
- **Log_Sanitizer**: A component that removes or masks sensitive fields (passwords, tokens, authorization headers) before a Log_Entry is emitted.
- **Module_Context**: The name of the backend module or frontend feature area that produced a log entry (e.g., `AuthService`, `EventsStore`, `ChatComposable`).
- **HTTP_Interceptor**: A NestJS interceptor that logs incoming HTTP requests and outgoing responses, including method, path, status code, duration, and Request_ID.
- **Global_Error_Handler**: A NestJS exception filter that captures unhandled exceptions and emits a FATAL or CRITICAL log entry before returning an error response.
- **Vue_Error_Handler**: A Vue 3 `app.config.errorHandler` callback that captures unhandled component errors and emits a CRITICAL log entry.

---

## Requirements

### Requirement 1: Log Level Hierarchy

**User Story:** As a developer, I want a well-defined set of log levels with a clear severity hierarchy, so that I can filter log output by importance and control verbosity per environment.

#### Acceptance Criteria

1. THE Logger SHALL support exactly six log levels in ascending severity order: TRACE (0), DEBUG (1), INFO (2), WARNING (3), CRITICAL (4), FATAL (5).
2. WHEN a minimum log level is configured, THE Logger SHALL suppress all Log_Entry records whose level is below the configured minimum.
3. THE Backend_Logger SHALL default to INFO level in production and DEBUG level in development.
4. THE Frontend_Logger SHALL default to WARNING level in production and DEBUG level in development.
5. WHEN the environment variable `LOG_LEVEL` is set on the backend, THE Backend_Logger SHALL use the specified level as the minimum, overriding the environment default.
6. WHEN the Vite environment variable `VITE_LOG_LEVEL` is set on the frontend, THE Frontend_Logger SHALL use the specified level as the minimum, overriding the environment default.

---

### Requirement 2: Structured Log Format

**User Story:** As a developer and operator, I want every log entry to be a structured JSON object, so that logs can be parsed, searched, and aggregated by log management tools.

#### Acceptance Criteria

1. THE Logger SHALL serialize every Log_Entry as a single-line JSON object.
2. EVERY Log_Entry SHALL contain the following fields: `timestamp` (ISO 8601 string), `level` (string name of the Log_Level), `module` (Module_Context string), `message` (human-readable string).
3. WHEN additional context is provided, THE Logger SHALL merge the Log_Context fields into the Log_Entry JSON at the top level alongside the required fields.
4. THE Log_Sanitizer SHALL remove or mask the following fields before emission: `password`, `currentPassword`, `newPassword`, `access_token`, `token`, `authorization` (case-insensitive header key), `Authorization`.
5. WHEN a Log_Entry contains an `Error` object, THE Logger SHALL serialize the error as a nested object containing `name`, `message`, and `stack` fields.
6. THE Logger SHALL NOT emit multi-line JSON; each Log_Entry SHALL occupy exactly one line.

---

### Requirement 3: Backend Log Transport

**User Story:** As an operator, I want backend logs written to the console in development and to a persistent file in production, so that I can inspect logs locally and retain them in deployed environments.

#### Acceptance Criteria

1. WHEN `NODE_ENV` is `development`, THE Backend_Logger SHALL write all Log_Entry records to stdout as formatted, colorized output suitable for human reading in a terminal.
2. WHEN `NODE_ENV` is `production`, THE Backend_Logger SHALL write all Log_Entry records as Structured_Log lines to a rotating log file located at `logs/app.log`.
3. WHEN `NODE_ENV` is `production`, THE Backend_Logger SHALL rotate the log file daily and retain a maximum of 14 rotated files.
4. WHEN `NODE_ENV` is `production`, THE Backend_Logger SHALL also write Log_Entry records at WARNING level or above to a separate file at `logs/error.log`.
5. THE Backend_Logger SHALL implement file transport using the `winston` library with `winston-daily-rotate-file` transport, as NestJS's built-in logger does not support file rotation natively.
6. IF a log file cannot be opened or written, THEN THE Backend_Logger SHALL fall back to stdout and emit a WARNING-level entry describing the file transport failure.

---

### Requirement 4: Frontend Log Transport

**User Story:** As a developer, I want frontend logs written to the browser console in development and silenced or forwarded in production, so that I can debug locally without polluting production browser consoles.

#### Acceptance Criteria

1. WHEN `import.meta.env.DEV` is `true`, THE Frontend_Logger SHALL write Log_Entry records to the browser console using the appropriate console method per level: `console.error` for FATAL and CRITICAL, `console.warn` for WARNING, `console.info` for INFO, `console.debug` for DEBUG and TRACE.
2. WHEN `import.meta.env.PROD` is `true`, THE Frontend_Logger SHALL suppress all Log_Entry records below WARNING level.
3. WHERE a `VITE_LOG_ENDPOINT` environment variable is configured, THE Frontend_Logger SHALL batch Log_Entry records at WARNING level or above and POST them as a JSON array to the configured endpoint at most once every 5 seconds.
4. THE Frontend_Logger SHALL implement batching using an in-memory queue that is flushed on a 5-second interval or when the queue reaches 50 entries, whichever comes first.
5. IF the remote log endpoint returns a non-2xx response, THEN THE Frontend_Logger SHALL retain the failed batch and retry it on the next flush cycle, up to a maximum of 3 retries per batch.
6. THE Frontend_Logger SHALL NOT block the calling code; all transport operations SHALL be asynchronous and non-throwing from the caller's perspective.

---

### Requirement 5: Backend HTTP Request/Response Logging

**User Story:** As a developer, I want every HTTP request and response to be logged with method, path, status code, duration, and request ID, so that I can trace API calls end-to-end.

#### Acceptance Criteria

1. THE HTTP_Interceptor SHALL generate a unique Request_ID (UUID v4) for every incoming HTTP request and attach it to the request object.
2. WHEN an HTTP request is received, THE HTTP_Interceptor SHALL emit an INFO-level Log_Entry containing: `requestId`, `method`, `path`, `userAgent`, and `userId` (if the request is authenticated).
3. WHEN an HTTP response is sent, THE HTTP_Interceptor SHALL emit an INFO-level Log_Entry containing: `requestId`, `method`, `path`, `statusCode`, and `durationMs`.
4. WHEN an HTTP response has a status code of 400 or above, THE HTTP_Interceptor SHALL emit the response log at WARNING level instead of INFO.
5. WHEN an HTTP response has a status code of 500 or above, THE HTTP_Interceptor SHALL emit the response log at CRITICAL level instead of WARNING.
6. THE HTTP_Interceptor SHALL be registered as a global interceptor in `AppModule` so that it applies to all controllers without per-module configuration.
7. THE Log_Sanitizer SHALL strip the `Authorization` header value from request log entries before emission.

---

### Requirement 6: Backend Auth Module Logging

**User Story:** As a security auditor, I want all authentication events logged with user context, so that I can detect and investigate unauthorized access attempts.

#### Acceptance Criteria

1. WHEN a user successfully authenticates via the local strategy, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `AuthService` containing `userId` and `username`.
2. WHEN a user authentication attempt fails due to invalid credentials, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `AuthService` containing `username` and the reason for failure, without logging the attempted password.
3. WHEN a JWT token is validated successfully, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in the JWT strategy containing `userId`.
4. WHEN a JWT token validation fails, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in the JWT strategy containing the failure reason.
5. WHEN a password change is requested, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `AuthService` containing `userId`.
6. WHEN a password change fails due to incorrect current password, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `AuthService` containing `userId` and the reason.
7. WHEN the impersonation interceptor activates for a request, THE Backend_Logger SHALL emit a WARNING-level Log_Entry containing `requestingUserId` and `impersonatedUserId`.

---

### Requirement 7: Backend Users Module Logging

**User Story:** As a developer, I want user CRUD operations logged with relevant context, so that I can audit user management actions.

#### Acceptance Criteria

1. WHEN a new user is created, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UsersService` containing `userId` and `username`.
2. WHEN a user record is updated, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UsersService` containing `userId` and the names of the updated fields (not their values).
3. WHEN a user record is deleted, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UsersService` containing `userId`.
4. WHEN a user lookup fails because the record does not exist, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `UsersService` containing the lookup key.
5. WHEN a profile picture is uploaded, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UsersService` containing `userId` and the file MIME type.
6. WHEN a profile picture upload fails, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `UsersService` containing `userId` and the error message.

---

### Requirement 8: Backend Events Module Logging

**User Story:** As a developer, I want calendar event operations logged with event and user context, so that I can trace event lifecycle changes.

#### Acceptance Criteria

1. WHEN a calendar event is created, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId`, `creatorUserId`, and `eventTitle`.
2. WHEN a calendar event is updated, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId`, `updatingUserId`, and the names of the updated fields.
3. WHEN a calendar event is deleted, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId` and `deletingUserId`.
4. WHEN a user joins an event, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId` and `userId`.
5. WHEN a user leaves an event, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId` and `userId`.
6. WHEN a ride is assigned, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `EventsService` containing `eventId`, `passengerId`, and `driverId`.
7. WHEN an event operation fails due to a database error, THE Backend_Logger SHALL emit a CRITICAL-level Log_Entry in `EventsService` containing `eventId`, `operation`, and the serialized error.

---

### Requirement 9: Backend Chat Module Logging

**User Story:** As a developer, I want WebSocket chat events logged with room and user context, so that I can debug real-time messaging issues.

#### Acceptance Criteria

1. WHEN a WebSocket client connects to the chat gateway, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `ChatGateway` containing `socketId` and `userId`.
2. WHEN a WebSocket client disconnects from the chat gateway, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `ChatGateway` containing `socketId`, `userId`, and `reason`.
3. WHEN a user joins a chat room, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `ChatGateway` containing `socketId`, `userId`, and `eventId`.
4. WHEN a message is sent to a chat room, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `ChatGateway` containing `eventId`, `userId`, and `messageId`, without logging the message text content.
5. WHEN a WebSocket authentication error occurs, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `ChatGateway` containing `socketId` and the error reason.
6. WHEN a chat message fails to persist to the database, THE Backend_Logger SHALL emit a CRITICAL-level Log_Entry in `ChatGateway` containing `eventId`, `userId`, and the serialized error.

---

### Requirement 10: Backend Notifications Module Logging

**User Story:** As a developer, I want push notification operations logged, so that I can diagnose delivery failures.

#### Acceptance Criteria

1. WHEN a device token is registered for push notifications, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `NotificationsService` containing `userId`.
2. WHEN a device token is unregistered, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `NotificationsService` containing `userId`.
3. WHEN a push notification is dispatched via Firebase Admin, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `NotificationsService` containing `userId` and the notification topic or type.
4. WHEN a push notification dispatch fails, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `NotificationsService` containing `userId`, the notification type, and the Firebase error code.
5. WHEN Firebase Admin SDK initialization fails at application startup, THE Backend_Logger SHALL emit a FATAL-level Log_Entry in `NotificationsService` containing the error message.

---

### Requirement 11: Backend Uploads Module Logging

**User Story:** As a developer, I want file upload operations logged with file metadata, so that I can audit storage usage and diagnose upload failures.

#### Acceptance Criteria

1. WHEN a file upload begins, THE Backend_Logger SHALL emit a DEBUG-level Log_Entry in `UploadsService` containing `userId`, `originalFilename`, `mimeType`, and `fileSizeBytes`.
2. WHEN a file upload completes successfully, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UploadsService` containing `userId`, `storedFilename`, and `mimeType`.
3. WHEN a file upload fails due to a validation error (unsupported type, size exceeded), THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `UploadsService` containing `userId`, `mimeType`, `fileSizeBytes`, and the validation failure reason.
4. WHEN a file upload fails due to a storage error, THE Backend_Logger SHALL emit a CRITICAL-level Log_Entry in `UploadsService` containing `userId` and the serialized error.
5. WHEN a stored file is deleted, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `UploadsService` containing `storedFilename`.

---

### Requirement 12: Backend Prisma Module Logging

**User Story:** As a developer, I want slow and failed database queries logged, so that I can identify performance bottlenecks and data access errors.

#### Acceptance Criteria

1. THE Backend_Logger SHALL configure Prisma Client to emit query events in development and error events in all environments.
2. WHEN a Prisma query completes in development, THE Backend_Logger SHALL emit a TRACE-level Log_Entry in `PrismaService` containing `query` (the SQL string), `params`, and `durationMs`.
3. WHEN a Prisma query duration exceeds 500ms in any environment, THE Backend_Logger SHALL emit a WARNING-level Log_Entry in `PrismaService` containing `durationMs` and the query model/operation name.
4. WHEN a Prisma query fails with an error, THE Backend_Logger SHALL emit a CRITICAL-level Log_Entry in `PrismaService` containing the Prisma error code and message.
5. WHEN the Prisma Client connects to the database at startup, THE Backend_Logger SHALL emit an INFO-level Log_Entry in `PrismaService`.
6. WHEN the Prisma Client fails to connect to the database, THE Backend_Logger SHALL emit a FATAL-level Log_Entry in `PrismaService` containing the connection error.

---

### Requirement 13: Backend Global Error Handling

**User Story:** As an operator, I want all unhandled exceptions captured and logged before an error response is returned, so that no error goes unrecorded.

#### Acceptance Criteria

1. THE Global_Error_Handler SHALL be registered as a global exception filter in `AppModule`.
2. WHEN an unhandled `HttpException` is caught, THE Global_Error_Handler SHALL emit a WARNING-level Log_Entry containing `requestId`, `statusCode`, `path`, and the exception message.
3. WHEN an unhandled non-HTTP exception is caught, THE Global_Error_Handler SHALL emit a CRITICAL-level Log_Entry containing `requestId`, `path`, and the serialized error including stack trace.
4. WHEN an exception is caught at application bootstrap (outside the request lifecycle), THE Backend_Logger SHALL emit a FATAL-level Log_Entry containing the serialized error.
5. THE Global_Error_Handler SHALL NOT suppress the original HTTP response; it SHALL log and then delegate to the default NestJS error response behavior.

---

### Requirement 14: Frontend Logger Utility

**User Story:** As a frontend developer, I want a single logger utility that I can import anywhere in the Vue 3 application, so that I have consistent structured logging across all frontend code.

#### Acceptance Criteria

1. THE Frontend_Logger SHALL be implemented as a TypeScript module at `src/utils/logger.ts` that exports a `createLogger(module: string)` factory function.
2. WHEN `createLogger` is called with a module name, THE Frontend_Logger SHALL return a logger instance with methods: `trace`, `debug`, `info`, `warn`, `critical`, and `fatal`, each accepting a message string and an optional context object.
3. THE Frontend_Logger SHALL include the `module` name, `timestamp`, `level`, and `message` in every Log_Entry.
4. WHEN a context object is provided to a log method, THE Frontend_Logger SHALL merge its fields into the Log_Entry.
5. THE Frontend_Logger SHALL expose a `setUserId(id: number | null)` function that attaches `userId` to all subsequent Log_Entry records from that logger instance.
6. THE Frontend_Logger SHALL be a pure TypeScript module with no runtime dependencies beyond the browser's built-in `console` API and `fetch` API.

---

### Requirement 15: Frontend API Service Logging

**User Story:** As a developer, I want all Axios HTTP requests and responses logged on the frontend, so that I can trace API call timing and failures in the browser.

#### Acceptance Criteria

1. WHEN an Axios request interceptor fires, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `API` module containing `method`, `url`, and `requestId` (a UUID attached to the request config).
2. WHEN an Axios response interceptor fires for a successful response, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `API` module containing `method`, `url`, `statusCode`, and `durationMs`.
3. WHEN an Axios response interceptor fires for a 4xx error, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `API` module containing `method`, `url`, `statusCode`, and the error message from the response body.
4. WHEN an Axios response interceptor fires for a 5xx error, THE Frontend_Logger SHALL emit a CRITICAL-level Log_Entry in the `API` module containing `method`, `url`, `statusCode`, and the error message.
5. WHEN a 401 response triggers a session expiry redirect, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `API` module containing `userId` (if available) and the message `"Session expired, redirecting to login"`.
6. THE Frontend_Logger SHALL NOT log request or response body payloads to avoid leaking sensitive data.

---

### Requirement 16: Frontend Store Logging

**User Story:** As a developer, I want Pinia store actions logged with their outcome, so that I can trace state mutations and diagnose store-level failures.

#### Acceptance Criteria

1. WHEN a store action begins execution, THE Frontend_Logger SHALL emit a TRACE-level Log_Entry in the corresponding store module containing the action name and relevant input identifiers (e.g., `eventId`, `userId`).
2. WHEN a store action completes successfully, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the corresponding store module containing the action name and `durationMs`.
3. WHEN a store action fails with an error, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the corresponding store module containing the action name, `durationMs`, and the error message.
4. THE Frontend_Logger SHALL instrument the `session` store for login, logout, load, changePassword, uploadProfilePicture, and removeProfilePicture actions.
5. THE Frontend_Logger SHALL instrument the `events` store for createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent, fetchCalendarEvents, and assignRide actions.
6. THE Frontend_Logger SHALL instrument the `users` store for all CRUD actions.
7. THE Frontend_Logger SHALL NOT log store state values directly to avoid logging sensitive user data.

---

### Requirement 17: Frontend Router Navigation Logging

**User Story:** As a developer, I want Vue Router navigation events logged, so that I can trace user navigation flows and detect navigation failures.

#### Acceptance Criteria

1. WHEN a Vue Router `beforeEach` guard fires, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `Router` module containing `from` (route name/path) and `to` (route name/path).
2. WHEN a Vue Router `afterEach` hook fires, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `Router` module containing `to` (route name/path) and `durationMs` since the navigation started.
3. WHEN a navigation is redirected (e.g., unauthenticated user sent to login), THE Frontend_Logger SHALL emit an INFO-level Log_Entry in the `Router` module containing `from`, `to`, and `redirectedTo`.
4. WHEN a navigation guard throws an error or returns `false`, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `Router` module containing `from`, `to`, and the error message.

---

### Requirement 18: Frontend WebSocket Event Logging

**User Story:** As a developer, I want Socket.io client events logged in the chat composable, so that I can diagnose real-time connection and messaging issues.

#### Acceptance Criteria

1. WHEN the Socket.io client connects successfully, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `ChatComposable` module containing `eventId` and `socketId`.
2. WHEN the Socket.io client disconnects, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `ChatComposable` module containing `eventId`, `socketId`, and `reason`.
3. WHEN a `connect_error` event is received, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `ChatComposable` module containing `eventId` and the error message.
4. WHEN a message is sent via the socket, THE Frontend_Logger SHALL emit a TRACE-level Log_Entry in the `ChatComposable` module containing `eventId`, without logging the message text content.
5. WHEN a `newMessage` event is received, THE Frontend_Logger SHALL emit a TRACE-level Log_Entry in the `ChatComposable` module containing `eventId` and `messageId`.
6. WHEN a socket error event is received, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `ChatComposable` module containing `eventId` and the error message.

---

### Requirement 19: Frontend Firebase Operation Logging

**User Story:** As a developer, I want Firebase SDK operations logged, so that I can diagnose push notification permission and token registration issues.

#### Acceptance Criteria

1. WHEN notification permission is requested, THE Frontend_Logger SHALL emit an INFO-level Log_Entry in the `Firebase` module.
2. WHEN notification permission is granted and an FCM token is obtained, THE Frontend_Logger SHALL emit an INFO-level Log_Entry in the `Firebase` module containing the token length (not the token value itself).
3. WHEN notification permission is denied, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `Firebase` module.
4. WHEN FCM token registration on the server succeeds, THE Frontend_Logger SHALL emit an INFO-level Log_Entry in the `Firebase` module.
5. WHEN FCM token retrieval or server registration fails, THE Frontend_Logger SHALL emit a WARNING-level Log_Entry in the `Firebase` module containing the error message.
6. WHEN a foreground push message is received, THE Frontend_Logger SHALL emit a DEBUG-level Log_Entry in the `Firebase` module containing the notification type, without logging the full payload.

---

### Requirement 20: Frontend Component Error Handling

**User Story:** As a developer, I want unhandled Vue component errors captured and logged, so that runtime component failures are visible and traceable.

#### Acceptance Criteria

1. THE Vue_Error_Handler SHALL be registered on the Vue application instance in `main.ts` via `app.config.errorHandler`.
2. WHEN the Vue_Error_Handler captures an error, THE Frontend_Logger SHALL emit a CRITICAL-level Log_Entry in the `VueApp` module containing the error `name`, `message`, `stack`, and the component info string provided by Vue.
3. WHEN the Vue_Error_Handler captures an error and a `userId` is available in the session store, THE Frontend_Logger SHALL include `userId` in the Log_Entry.
4. THE Vue_Error_Handler SHALL NOT re-throw the error; it SHALL log and allow Vue's default error propagation behavior to continue.

---

### Requirement 21: Log Sanitization

**User Story:** As a security engineer, I want sensitive fields automatically stripped from all log entries, so that credentials and tokens are never written to log files or consoles.

#### Acceptance Criteria

1. THE Log_Sanitizer SHALL be applied to every Log_Entry on both the backend and frontend before the entry is emitted to any transport.
2. THE Log_Sanitizer SHALL remove or replace with `"[REDACTED]"` any field whose key (case-insensitive) matches: `password`, `currentPassword`, `newPassword`, `token`, `access_token`, `authorization`, `secret`, `apiKey`, `fcmToken`.
3. THE Log_Sanitizer SHALL perform deep sanitization on nested objects within the Log_Context.
4. THE Log_Sanitizer SHALL sanitize HTTP request header objects, replacing the value of the `Authorization` header with `"[REDACTED]"`.
5. WHEN a Log_Entry message string contains a JWT token pattern (three Base64url segments separated by dots), THE Log_Sanitizer SHALL replace the token with `"[REDACTED_JWT]"`.

---

### Requirement 22: Developer Experience and Configuration

**User Story:** As a developer, I want the logging system to be easy to configure and integrate, so that adding logging to new modules requires minimal boilerplate.

#### Acceptance Criteria

1. THE Backend_Logger SHALL be provided as a NestJS injectable service (`AppLoggerService`) that wraps `winston` and implements the NestJS `LoggerService` interface, allowing it to be injected via the standard DI system.
2. THE Backend_Logger SHALL be set as the application-wide logger via `app.useLogger(appLoggerService)` in `main.ts`, replacing NestJS's default logger for framework-level messages.
3. WHEN a backend module needs logging, a developer SHALL be able to obtain a logger by injecting `AppLoggerService` and calling `this.logger.setContext('ModuleName')`.
4. THE Frontend_Logger factory `createLogger(module)` SHALL be callable at module scope (outside Vue component lifecycle) so that it can be used in plain TypeScript service files and Pinia stores.
5. THE Backend_Logger SHALL accept an optional `context` object as the second argument to every log method, merging it into the Log_Entry alongside the module context.
6. WHEN running in development, THE Backend_Logger SHALL pretty-print log output with color-coded level labels to improve terminal readability.
