# Local-first chat

A local-first chat application built with different frameworks. It

- Has secure user logins
- Works offline
- Loads faster than server side rendering
- Can be deployed like any static website
- Does not need a server

## Getting started

To get user logins, sign up for [Feathers Cloud Auth](https://feathers.cloud/auth/) at [app.feathers.cloud](https://app.feathers.cloud) and create a new organization and application. Make sure to copy the application id (`did:key:`) and customize the theme 🤩

Then run the following in a terminal:

```sh
git clone git@github.com:featherscloud/chat.git
cd chat
npm install
npm run init
```

When prompted, paste your application id and choose your framework. Make sure to visit the development server (default [localhost:3000](http://localhost:3000)) that will be started to finalize initialization.

## Developing

Once initialized, the development server for any framework can be started like this:

```sh
npm run dev:<framework>

npm run dev:react
npm run dev:svelte
```

## Client Configuration

### WebSocket Connection
The chat clients need to know where to connect to the sync server. Update the WebSocket URL in the client's `.env` file:

**For Svelte Chat:**
```bash
# svelte-chat/.env
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=ws://localhost:3030
```

**For React Chat:**
```bash
# react-chat/.env
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=ws://localhost:3030
```

### Environment Variables
- `VITE_CLOUD_APP_ID` - Your Feathers Cloud Auth application ID
- `VITE_AUTOMERGE_URL` - WebSocket URL for the sync server
  - Local development: `ws://localhost:3030`
  - Production HTTPS: `wss://yourdomain.com:443`
  - Custom port: `ws://localhost:8080`

### Full Development Setup
To run both client and server for development:

```bash
# Terminal 1: Start sync server
npm run dev:sync

# Terminal 2: Start client (choose one)
npm run dev:svelte
# or
npm run dev:react
```

Then open http://localhost:3000 in your browser.

## Sync Server

The sync server enables real-time synchronization between chat clients. It automatically detects SSL certificates and runs in HTTP or HTTPS mode.

### Development (HTTP)

For local development without SSL certificates:

```sh
npm run dev:sync
# or
cd sync-server && npm run dev
```

This runs the server on HTTP port 3030.

### Production (HTTPS)

For production deployment with SSL certificates:

```sh
npm run dev:sync
# or
cd sync-server && npm start
```

The server automatically detects SSL certificates and runs in HTTPS mode on port 443 (requires sudo).

### SSL Certificate Configuration

#### Automatic Detection
The server automatically uses HTTPS if SSL certificates are found at:
```
/etc/letsencrypt/live/dweb.feathers.cloud/privkey.pem
/etc/letsencrypt/live/dweb.feathers.cloud/fullchain.pem
```

#### Custom Certificate Path
Use the `CERT_PATH` environment variable for custom certificate locations:

```sh
# Custom certificate directory
CERT_PATH="/path/to/your/certs" npm start

# Self-signed certificates for development
CERT_PATH="./certs" npm run dev

# Different domain certificates
CERT_PATH="/etc/letsencrypt/live/yourdomain.com" npm start
```

#### Certificate Requirements
- `privkey.pem` - Private key file
- `fullchain.pem` - Certificate chain file  
- Standard PEM format
- Works with any certificate provider (Let's Encrypt, commercial CAs, self-signed, etc.)

#### Force HTTPS Mode
To force HTTPS mode even if certificates don't exist (useful for testing):

```sh
FORCE_HTTPS=true npm start
```

### Example Deployments

**Local Development:**
```sh
npm run dev:sync  # HTTP on port 3030
```

**Production with Let's Encrypt:**
```sh
sudo npm start  # HTTPS on port 443 (auto-detected)
```

**Production with Custom Certificates:**
```sh
CERT_PATH="/etc/ssl/private/mydomain" sudo npm start
```

## Raspberry Pi Local Network Demo

For running a local-first demo on a Raspberry Pi with HTTPS on your local network:

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install git (if not already installed)
sudo apt install -y git
```

### 2. Clone and Setup Project
```bash
# Clone the repository
git clone <your-repo-url>
cd chat

# Install dependencies
npm install

# Switch to sync branch
git checkout sync
```

### 3. Generate Self-Signed Certificate for Local Network
```bash
# Create certificate directory
sudo mkdir -p /etc/ssl/localcerts

# Find your Pi's IP address
hostname -I

# Generate self-signed certificate (replace YOUR_PI_IP with actual IP)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/localcerts/privkey.pem \
  -out /etc/ssl/localcerts/fullchain.pem \
  -subj "/C=US/ST=Local/L=Local/O=Demo/CN=YOUR_PI_IP"

# Or for hostname-based access:
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/localcerts/privkey.pem \
  -out /etc/ssl/localcerts/fullchain.pem \
  -subj "/C=US/ST=Local/L=Local/O=Demo/CN=raspberrypi.local"
```

### 4. Update Client Configuration
Update the client's `.env` file to point to your Pi:

**For Svelte Chat:**
```bash
# svelte-chat/.env
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=wss://YOUR_PI_IP:3030
# or
VITE_AUTOMERGE_URL=wss://raspberrypi.local:3030
```

**For React Chat:**
```bash
# react-chat/.env
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=wss://YOUR_PI_IP:3030
# or
VITE_AUTOMERGE_URL=wss://raspberrypi.local:3030
```

### 5. Build Client and Start Server
```bash
# Build the client
npm run build:svelte

# Start the sync server with custom certificate path
CERT_PATH="/etc/ssl/localcerts" PORT=3030 sudo -E npm run dev:sync
```

### 6. Access the Demo
1. **Find your Pi's IP**: `hostname -I`
2. **Access via browser**: `https://YOUR_PI_IP:3030` or `https://raspberrypi.local:3030`
3. **Accept security warning** (since it's self-signed certificate)
4. **Share with demo participants**: They'll also need to accept the security warning

### 7. Optional: Create Start Script
Create a `start-pi-demo.sh` script for easy startup:
```bash
#!/bin/bash
export CERT_PATH="/etc/ssl/localcerts"
export PORT=3030
sudo -E npm run dev:sync
```

Make it executable and run:
```bash
chmod +x start-pi-demo.sh
./start-pi-demo.sh
```

This setup provides HTTPS for your local-first demo while keeping everything on your local network.

## Build and deploy

The chat application can be deployed like any static website. The build can be run with

```sh
npm run build:<framework>

npm run build:react
npm run build:svelte
```

Note that in a CI environment, the `VITE_CLOUD_APP_ID` and `VITE_AUTOMERGE_URL` from the `.env` files need to be set.

Then the `<framework>-chat/dist/` folder can be deployed like any static website.
