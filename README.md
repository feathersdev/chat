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
VITE_AUTOMERGE_URL=wss://piradio.local:3030
```

**For React Chat:**
```bash
# react-chat/.env
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=wss://YOUR_PI_IP:3030
# or
VITE_AUTOMERGE_URL=wss://piradio.local:3030
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
2. **Access via browser**: `https://YOUR_PI_IP:3030` or `https://piradio.local:3030`
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

## Raspberry Pi Setup for piradio.local

This section provides specific instructions for setting up the Svelte chat application and sync server on a Raspberry Pi with the hostname `piradio.local`.

### Prerequisites

- Raspberry Pi with Raspberry Pi OS installed
- Network connection (WiFi or Ethernet)
- SSH access or physical access to the Pi

### 1. Initial System Setup

```bash
# SSH into your Raspberry Pi or use the terminal
ssh pi@piradio.local

# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (recommended for this project)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x

# Install git if not present
sudo apt install -y git

# Install build tools (needed for some npm packages)
sudo apt install -y build-essential python3
```

### 2. Set Hostname (if not already piradio.local)

```bash
# Set hostname to piradio
sudo hostnamectl set-hostname piradio

# Update hosts file
sudo nano /etc/hosts
# Change the line with old hostname to:
# 127.0.0.1    piradio

# Reboot to apply hostname changes
sudo reboot
```

### 3. Clone and Setup the Project

```bash
# Clone the repository
git clone https://github.com/featherscloud/chat.git
cd chat

# Install dependencies (this may take several minutes on Pi)
npm install

# Switch to the sync branch
git checkout sync

# Navigate to svelte-chat directory
cd svelte-chat
```

### 4. Configure Environment Variables

Create the environment configuration for piradio.local:

```bash
# Create/edit the .env file in svelte-chat directory
nano .env
```

Add the following content:

```bash
# Svelte Chat Environment Configuration for piradio.local
VITE_CLOUD_APP_ID=did:key:z6Mkno3UyEMfCGLcKM1ZRp9eooyrKj4VLeathb77V7nthUUw
VITE_AUTOMERGE_URL=ws://piradio.local:3030
```

### 5. Build the Svelte Chat Application

```bash
# From the svelte-chat directory
npm run build

# The built files will be in svelte-chat/dist/
```

### 6. Setup the Sync Server

```bash
# Navigate back to project root
cd ..

# Navigate to sync-server directory
cd sync-server

# Install sync server dependencies if needed
npm install
```

### 7. Create Startup Scripts

Create convenient scripts to start the services:

```bash
# Create a startup script for the sync server
cd ~/chat
nano start-sync-server.sh
```

Add this content:

```bash
#!/bin/bash
echo "Starting Sync Server for piradio.local..."
cd ~/chat/sync-server
export PORT=3030
npm run dev
```

Create a script to serve the built chat application:

```bash
nano start-chat-client.sh
```

Add this content:

```bash
#!/bin/bash
echo "Starting Chat Client Server for piradio.local..."
cd ~/chat/svelte-chat/dist
python3 -m http.server 3000
```

Make scripts executable:

```bash
chmod +x start-sync-server.sh
chmod +x start-chat-client.sh
```

### 8. Running the Services

#### Method 1: Manual Start (for testing)

```bash
# Terminal 1: Start the sync server
cd ~/chat
./start-sync-server.sh

# Terminal 2: Start the chat client server
./start-chat-client.sh
```

#### Method 2: Using PM2 (for persistent service)

Install PM2 for process management:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the sync server with PM2
cd ~/chat/sync-server
pm2 start npm --name "sync-server" -- run dev

# Start the chat client server with PM2
cd ~/chat/svelte-chat/dist
pm2 start "python3 -m http.server 3000" --name "chat-client"

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by PM2

# Check status
pm2 list
```

### 9. Configure Firewall (Optional but Recommended)

```bash
# Install ufw firewall
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow our application ports
sudo ufw allow 3000  # Chat client
sudo ufw allow 3030  # Sync server

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 10. Network Configuration

Ensure your Raspberry Pi is accessible on the local network:

```bash
# Check your Pi's IP address
hostname -I

# Test local hostname resolution
ping piradio.local
```

### 11. Access the Application

Once both services are running:

1. **From the same network**: Open a web browser and go to:
   - `http://piradio.local:3000` (Chat client)
   - The chat will automatically connect to the sync server at `piradio.local:3030`

2. **From other devices**: Make sure they're on the same network and can resolve `piradio.local`

### 12. Troubleshooting

**If piradio.local doesn't resolve:**
- Use the Pi's IP address directly: `http://192.168.1.XXX:3000`
- Update the .env file with the IP address instead of hostname
- Install Avahi for better hostname resolution: `sudo apt install avahi-daemon`

**If sync server connection fails:**
- Check firewall settings: `sudo ufw status`
- Verify the sync server is running: `pm2 list` or check terminal output
- Test WebSocket connection manually from browser console

**Performance optimization for Raspberry Pi:**
```bash
# Increase swap space if needed (for building)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 13. Automatic Startup on Boot

To make services start automatically when the Pi boots:

```bash
# Create systemd service for sync server
sudo nano /etc/systemd/system/piradio-sync.service
```

Add:

```ini
[Unit]
Description=PiRadio Chat Sync Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/chat/sync-server
Environment=PORT=3030
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create service for chat client:

```bash
sudo nano /etc/systemd/system/piradio-chat.service
```

Add:

```ini
[Unit]
Description=PiRadio Chat Client Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/chat/svelte-chat/dist
ExecStart=/usr/bin/python3 -m http.server 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
# Enable services to start on boot
sudo systemctl enable piradio-sync.service
sudo systemctl enable piradio-chat.service

# Start services immediately
sudo systemctl start piradio-sync.service
sudo systemctl start piradio-chat.service

# Check status
sudo systemctl status piradio-sync.service
sudo systemctl status piradio-chat.service
```

Your Raspberry Pi is now configured to run the chat application at `http://piradio.local:3000` with automatic startup and the sync server running in the background!

## Build and deploy

The chat application can be deployed like any static website. The build can be run with

```sh
npm run build:<framework>

npm run build:react
npm run build:svelte
```

Note that in a CI environment, the `VITE_CLOUD_APP_ID` and `VITE_AUTOMERGE_URL` from the `.env` files need to be set.

Then the `<framework>-chat/dist/` folder can be deployed like any static website.
