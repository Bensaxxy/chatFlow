# ChatFlow

A focused, real-time chat application for private conversations, status updates, and secure audio calls.

## Overview

ChatFlow gives developers a complete foundation for a modern messaging experience. It handles everything from account creation and email verification to live message delivery, media sharing, and WebRTC audio calls. Teams can use it to ship a polished, responsive chat app without starting from scratch.

## System Architecture

```mermaid
flowchart LR
  WebClient["Web Client"]
  NextAPI["Next.js API Proxy"]
  Backend["Backend API"]
  Database[("Database")]
  WebSocket["Socket.io Server"]
  CloudStorage["Cloud Storage"]

  WebClient --> NextAPI
  NextAPI --> Backend
  Backend --> Database
  Backend --> CloudStorage
  WebClient --> WebSocket
  WebSocket --> Backend

  style WebClient fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
  style NextAPI fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style Backend fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style Database fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
  style WebSocket fill:#4c0519,stroke:#ef4444,stroke-width:2px,color:#fff
  style CloudStorage fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
```

## Installation

Clone the repository and install dependencies.

```bash
git clone https://github.com/Bensaxxy/chatFlow.git
cd chatFlow
npm install
```

Create a `.env.local` file in the project root.

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

Run the development server.

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Usage

After starting the app, you can register a new account or log in. The landing page guides new visitors to sign up, while authenticated users are taken directly to their chat list.

```bash
npm run dev
```

The main features are available at these paths once you are logged in:

- `/chats` — conversation list and search
- `/chats/:conversationId` — active conversation
- `/profile` — account and preference settings
- `/users/:userId` — public profile view

## Features

### Real-Time Messaging

Send and receive messages instantly with typing indicators, read receipts, and delivery status. Messages support text, replies, reactions, edits, and deletion for everyone or just for you.

```mermaid
sequenceDiagram
  actor Sender
  participant App as ChatFlow Client
  participant API as Backend API
  participant Socket as Socket.io
  actor Recipient

  Sender->>App: Types and sends message
  App->>API: POST message
  API->>Socket: Broadcast new message
  Socket->>Recipient: Receive message
  Recipient->>Socket: Mark as read
  Socket->>Sender: Update read receipt
```

### Media and File Sharing

Share images, videos, audio notes, documents, and link previews. The media gallery lets you browse shared files by category.

```mermaid
flowchart LR
  User["User"] --> Upload["Upload File"]
  Upload --> Preview["Preview in Composer"]
  Preview --> Send["Send Attachment"]
  Send --> Cloud["Cloud Storage"]
  Send --> Recipient["Recipient"]
  Cloud --> Recipient

  style User fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
  style Upload fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style Preview fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style Send fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style Cloud fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
  style Recipient fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
```

### Status Updates

Post text or photo statuses that disappear after 24 hours. Control who sees each update with audience settings and view replies from friends.

```mermaid
sequenceDiagram
  actor User
  participant Composer as Status Composer
  participant API as Backend API
  participant Viewers as Status Viewers

  User->>Composer: Create text/photo status
  User->>Composer: Choose audience
  Composer->>API: Submit status
  API->>Viewers: Notify eligible viewers
  Viewers->>API: View status
  API->>User: Update view count
```

### WebRTC Audio Calls

Make and receive peer-to-peer audio calls directly in the browser. The app negotiates offers and answers through Socket.io, with ICE candidate exchange and optional TURN relay support.

```mermaid
sequenceDiagram
  actor Caller
  participant CallerApp as Caller Client
  participant Signaling as Signaling Server
  participant RecipientApp as Recipient Client
  actor Recipient

  Caller->>CallerApp: Initiate call
  CallerApp->>CallerApp: Get microphone + create offer
  CallerApp->>Signaling: Send offer
  Signaling->>RecipientApp: Incoming call
  RecipientApp->>RecipientApp: Accept + create answer
  RecipientApp->>Signaling: Send answer
  Signaling->>CallerApp: Accepted
  CallerApp->>RecipientApp: ICE candidates
  RecipientApp->>CallerApp: ICE candidates
  CallerApp->>RecipientApp: WebRTC peer connection
```

### Other Capabilities

- Secure authentication with email verification and password reset
- Profile management with avatar upload
- Chat themes, wallpapers, and bubble colors
- Push and email notification preferences
- Message search within conversations
- Block and unblock users
- Forward messages to other conversations
- Bulk message selection and deletion

## Technologies Used

| Technology | Purpose |
|------------|---------|
| [Next.js](https://nextjs.org/) | React framework and API routes |
| [React](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Socket.io Client](https://socket.io/) | Real-time communication |
| [Axios](https://axios-http.com/) | HTTP client |
| [React Hook Form](https://react-hook-form.com/) | Form management |
| [Zod](https://zod.dev/) | Schema validation |
| [Lucide React](https://lucide.dev/) | Icon library |
| [React Toastify](https://fkhadra.github.io/react-toastify/) | Notifications |

## API Documentation

ChatFlow exposes a single catch-all API proxy at `src/app/api/[...path]/route.ts` that forwards requests to the configured backend. All backend endpoints are accessed through this proxy.

### GET /api/:path
### POST /api/:path
### PUT /api/:path
### PATCH /api/:path
### DELETE /api/:api/:path
### OPTIONS /api/:path
### HEAD /api/:path

**Description**

Proxies any request to the upstream backend API while preserving cookies, request bodies, and selected response headers.

**Request**

Forwarded headers include `accept`, `content-type`, and `cookie`. Request bodies are forwarded for all methods except GET and HEAD.

```json
{
  "any": "payload"
}
```

**Response**

The response from the backend is returned with status, status text, and headers.

```json
{
  "success": true,
  "data": {}
}
```

**Errors**

- 502: The upstream API could not be reached.
- 503: The chat API is not configured.

**Environment Variables**

| Variable | Example | Description |
|----------|---------|-------------|
| `BACKEND_API_URL` | `https://api.chatflow.example.com` | Upstream API base URL |
| `NEXT_PUBLIC_API_URL` | `https://api.chatflow.example.com` | Fallback public API base URL |

## Contributing

Contributions are welcome. If you would like to improve ChatFlow, please open an issue or pull request. Keep code consistent with the existing TypeScript and React patterns.

## License

No LICENSE file is present in this repository.

## Author

Built with care by Oluwasegun Benjamin.

- LinkedIn: [https://linkedin.com/in/oluwasegun-benjamin](https://linkedin.com/in/oluwasegun-benjamin)

## Badges

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://dokugen.samueltuoyo.com)