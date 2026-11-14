# iMessage

iMessage is a real-time messaging application with a .NET API, an Angular web client, and an Expo/React Native mobile client. The API uses SQL Server for application data and S3-compatible object storage for conversation attachments.

## Technologies

- C#
- TypeScript
- JavaScript
- ASP.NET Core
- Entity Framework Core
- SQL Server
- Docker
- Angular
- React Native
- SignalR

## Feature catalog

### Accounts and security

- Create an account with display name, email, password, and client type. Email confirmation is supported through email links for web and a six-digit email OTP flow for mobile.
- Sign in with email and password. Accounts can require an authenticator code or a one-time recovery code as a second factor.
- Issue short-lived JWT access tokens and refresh sessions; refresh tokens are hashed and can be revoked. The web client stores auth state and sends credentials with API requests; the mobile client stores its access token with Expo SecureStore and retries an expired session through the refresh endpoint.
- Sign out and revoke the current refresh session.
- Request a password reset by email and submit a reset token with a replacement password. Password changes from an authenticated session are also supported.
- Configure authenticator-based two-factor authentication: request authenticator setup details, enable or disable two-factor authentication, and generate or regenerate recovery codes.
- Retrieve and update the signed-in user's profile, including display name, username, and profile picture URL; view two-factor status and remaining recovery-code count.
- Delete an account after password confirmation and, when enabled, a two-factor code.
- Enumerate user summaries for starting conversations. Authentication endpoints apply ASP.NET Identity validation and lockout behavior.

### Conversations and messaging API

- Create private conversations and group conversations with a title and participants; list conversations available to the signed-in user.
- Fetch conversation message history with cursor-based pagination.
- Send messages with a client-generated message ID, message type, optional text or structured JSON content, optional reply target, and uploaded attachment references.
- Message type values declared by the API are `Text`, `Image`, `Video`, `Audio`, `VoiceNote`, `Document`, `Location`, `Contact`, `Sticker`, `Gif`, `Link`, and `System`; `System` is reserved and cannot be sent through the normal send-message endpoint. File uploads are implemented for image, video, audio/voice note, document, sticker, and GIF content, with MIME type and configured size checks.
- Store attachments in S3-compatible object storage. Uploads are associated with a conversation and expire if not attached to a message; authorized participants can request time-limited download URLs.
- Edit and delete messages, forward a message to another conversation, set or clear a pin, toggle emoji reactions, search messages within a conversation, and mark selected messages as read.
- Message responses include sender, timestamps, edit/deletion state, reply reference, pinned/forwarded state, attachments, reactions, and per-recipient delivery/read receipt data.
- Conversation and message endpoints validate participant access. Message changes, receipts, reactions, and pin updates can be broadcast to connected clients.

### Web client

- Public routes for registration, login, email confirmation, forgot-password, and reset-password; authenticated routes for conversations and profile. Route guards separate signed-in and guest pages.
- Conversation sidebar with conversation list, private conversation creation by searching available people, and conversation navigation. Existing group conversations can be displayed.
- Chat view with message history and older-message loading, in-conversation message search, and links to matching messages.
- Send text and link messages; reply to a message; upload and send supported attachments; record and send voice notes; share a location or a contact; send stickers.
- Render text, image, video, audio, voice note, document, sticker, GIF, location, contact, and link messages. Download documents through signed attachment URLs.
- React to messages, edit or delete the signed-in user's text messages, and pin or unpin messages. Show edit, deletion, reply, pinned, and forwarded state when present.
- Connect to SignalR for live incoming, edited, and deleted messages, reactions, pins, online/offline presence, and typing indicators. Automatically reconnect the hub.
- Profile page to update profile details, change password, set up or disable two-factor authentication, regenerate recovery codes, and delete the account.
- English, French, and Arabic translations; responsive chat layout, loading/error feedback, and toast notifications.

### Mobile client

- Expo Router screens for welcome, registration, login, email OTP verification, conversations, an individual conversation, and profile.
- Registration leads into email OTP verification. Login supports authenticator codes and recovery codes when two-factor authentication is requested.
- Persist and restore the session using secure token storage, refresh access tokens after an authorization failure, and clear local auth state on sign out.
- Load and refresh the conversation list; search conversations locally; search people by name or email and start a private conversation.
- Load and refresh text message history, compose and send text messages, and view sender names and timestamps.
- View the signed-in user's profile details and two-factor status, then sign out.

Mobile currently does not include group creation, attachment sending, message editing/reactions/pinning/search, read receipts, or a SignalR connection. The web message UI also does not currently wire its displayed Forward control to an action or render read-receipt state, although forwarding and read-receipt endpoints exist in the API. Voice and video call icons in the web header are visual controls only; calling is not implemented.

### Realtime and platform services

- Authenticated SignalR hub at `/hubs/chat` tracks user connections and online state, returns online status for requested users, and relays typing events after checking conversation membership.
- SignalR events cover online/offline status, typing start/stop, new/edited/deleted messages, receipt changes, reaction changes, and pin changes.
- ASP.NET Core minimal REST endpoints are grouped under `/api`; Development exposes OpenAPI and Swagger UI.
- SQL Server persistence through Entity Framework Core, with checked-in migrations for users, conversations, messages, attachments, reactions, receipts, refresh tokens, and email OTPs.
- Email delivery for confirmation and password recovery, configurable OTP generation/verification, and S3-compatible attachment storage.
- Docker Compose development and production stacks include the API, SQL Server, RustFS object storage, and Nginx-served Angular web app. Named volumes persist database and object-storage data.

## Requirements

- .NET 10 SDK and SQL Server.
- Node.js and npm for the web and mobile clients.
- Docker Compose for the containerized stack.
- Runtime configuration for the database, JWT, email, OTP, and S3-compatible object storage integrations.

## Run locally

### API

Configure the API's required settings, including `ConnectionStrings:Default`, `JwtSettings`, `ObjectStorage`, `OtpSettings`, `EmailSettings`, and `AngularClient`. Supply secrets through .NET user secrets or environment variables; do not commit credentials. SQL Server and an S3-compatible storage service must be available. Then run:

Apply the checked-in Entity Framework migrations to the configured database before the first run (the API does not apply migrations automatically):

```powershell
dotnet ef database update --project Api
```

The `dotnet-ef` tool must be installed for this command.

```powershell
dotnet run --project Api --launch-profile https
```

The HTTPS launch profile listens on `https://localhost:7005` (and HTTP on port 5000). In Development, Swagger UI is available at `/swagger`.

### Web

The development environment points to the API at `https://localhost:7005`. The development start script uses the local TLS files in `certs/`:

```powershell
cd web
npm install
npm run start:dev
```

### Mobile

Create `mobile/.env.local` and set `EXPO_PUBLIC_API_URL` to the API origin, for example `https://localhost:7005` for a compatible local setup. The value should be the API origin without the `/api` suffix. For a simulator or physical device, use an API host address that device can reach.

```powershell
cd mobile
npm install
npm start
```

Expo CLI will show options for opening the app in a simulator, device, or web browser.

## Run docker

Set the environment variables referenced by `compose.dev.yml` in a local `.env` file, and provide the local TLS certificates under `certs/`. Start the development stack with:

```powershell
docker compose -f compose.dev.yml up -d --build
```

The development web client is exposed on `https://localhost:3000`; the API is reachable by the web container through the Compose network. RustFS exposes its S3 API on port `9000` and its console on port `9001`. Compose persists SQL Server and object data in named volumes.

For deployment, `compose.prod.yml` expects production secrets, a public web origin and object-storage endpoint, and production TLS certificate files. Review and populate its environment variables before starting it.
