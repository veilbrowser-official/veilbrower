# VeilBrowser 2.0 UI/UX Design Specification

> **Type**: Product Design
> **Version**: v2.0
> **Date**: 2026-02-18
> **Status**: Draft

## 1. Design Philosophy: The "Operator Console"

VeilBrowser 2.0 is not a browser; it is a **Mission Control Center**. The user is not a "surfer" but an "Operator" managing a fleet of AI Agents.

- **Aesthetic**: "Cyberpunk / Industrial". Dark mode default. High contrast data visualization.
- **Layout**: Fixed Sidebar (Navigation) + Main Content Area + Collapsible Inspector (Details).
- **Interaction**: Keyboard-first (Command Palette `Ctrl+K`), Bulk Actions, Real-time Status.

---

## 2. Global Navigation (Sidebar)

We divide the application into four distinct zones:

```text
[ DASHBOARD ]   -- Overview & Status
   |
[ MISSIONS ]    -- The "Run" Runtime
   |-- Active Sessions (The Fleet)
   |-- History (Flight Recorder)
   |
[ ASSETS ]      -- The "Build" Resources
   |-- Identities (Profiles)
   |-- Proxies (Network)
   |-- Extensions (Tools)
   |-- Vault (Credentials)
   |
[ DATA ]        -- The "Output" Results
   |-- Artifacts (Downloads/Files)
   |-- Logs (System Events)
```

---

## 3. Core Modules Design

### 3.1 Identities (Profiles) List

- **View**: Data Grid.
- **Columns**: Name, Status (Running/Idle), Binder (Group), Proxy, Last Used.
- **Actions**: "Launch", "Edit", "Quick Clone".
- **Inspector**: When selected, shows quick stats (Cookies count, Storage size).

### 3.2 Proxy Manager (Network Hub)

- **View**: Split View (Groups List | Nodes List).
- **Visuals**:
  - **Health Indicators**: Green/Red dots for connectivity.
  - **Latency Sparkline**: Real-time ping latency graph for each node.
- **Actions**: "Import (Clipboard/File)", "Test Connection", "Auto-Prune Dead Nodes".
- **Key Feature**: "Rotation Policy" dropdown (Sticky vs. Random).

### 3.3 Extension Store (The Armory)

- **View**: Card Grid (App Store style).
- **Card Content**: Icon, Name, Version, "Linked Policies" (e.g., "Global", "Tag:Social").
- **Actions**: "Upload .crx", "Force Update", "Manage Policies".
- **Detail View**: Shows which Profiles are effectively using this extension.

### 3.4 The Vault (Secure Storage)

- **View**: Encrypted List (Password Manager style).
- **Categories**: Credentials, API Keys, Notes.
- **Security**: Values are masked (`*****`) until "Reveal" is clicked (requires master verification).
- **Feature**: "Domain Mapping". E.g., Map "user:admin" to "\*.twitter.com".

### 3.5 Artifacts (The Loot)

- **View**: File Explorer / Gallery.
- **Filters**: By Session ID, By File Type (PDF/IMG), By Date.
- **Preview**: Integrated PDF Viewer / Image Viewer / Code Editor.
- **Action**: "Open in Finder", "Copy Path (for MCP)".

---

## 4. The "Active Sessions" View (Mission Control)

This is the most critical view when Agents are running.

- **Layout**: Grid of "Live Previews" (Thumbnail of the browser content).
- **Overlay**:
  - **Status Badge**: "Navigating", "Waiting for Captcha", "Idle".
  - **Resource Usage**: CPU/RAM usage of that CEF process.
- **Intervention**:
  - **"Takeover" Button**: Agent pauses, Human takes mouse/keyboard control.
  - **"Terminate" Button**: Kill process.
  - **"Debug" Button**: Open DevTools.

---

## 5. User Interaction Flows

### Flow A: Onboarding a New Purpose

1.  **ASSETS -> Proxies**: User imports 100 residential IPs.
2.  **ASSETS -> Extensions**: User uploads "uBlock Origin".
3.  **ASSETS -> Identities**: User creates a "Social Media" Group, links it to "uBlock" and the Proxy Group.
4.  **RESULT**: Any Profile created in "Social Media" automatically gets clean IPs and AdBlock.

### Flow B: AI Agent Execution (Visualized)

1.  **MISSIONS -> Active**: User sees a new card appear: "Agent-007".
2.  **Status**: "Acquiring Proxy..." -> "Launching CEF..." -> "Navigating to X.com".
3.  **Visual**: Thumbnail updates in real-time (1fps).
4.  **Artifacts**: A "Screenshot" icon appears in the card as the Agent takes snapshots.

---

## 6. Theme & Design System (Shadcn + Tailwind)

- **Primary Color**: `Violet-600` (Veil Purple).
- **Background**: `Slate-950` (Deep Space).
- **Surface**: `Slate-900` (Panel Background).
- **Border**: `Slate-800`.
- **Typography**: `Inter` (UI), `JetBrains Mono` (Data/Logs).
- **Icons**: Lucide React.
