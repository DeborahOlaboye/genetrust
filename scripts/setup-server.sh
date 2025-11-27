#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${YELLOW}This script must be run as root. Please use sudo.${NC}"
  exit 1
fi

# Update and upgrade system packages
echo -e "${GREEN}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${GREEN}Installing required packages...${NC}"
apt-get install -y \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  fail2ban \
  ufw \
  docker.io \
  docker-compose

# Start and enable Docker
systemctl enable --now docker

# Add current user to docker group (replace $SUDO_USER with the actual username if needed)
if ! id -nGz "$SUDO_USER" | grep -qzxF "docker"; then
  usermod -aG docker "$SUDO_USER"
  echo -e "${GREEN}Added $SUDO_USER to the docker group.${NC}"
  echo -e "${YELLOW}You may need to log out and back in for the group changes to take effect.${NC}"
fi

# Configure firewall
echo -e "${GREEN}Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow http
ufw allow https
ufw --force enable

# Create application directory
APP_DIR="/opt/genetrust"
mkdir -p "$APP_DIR"
chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR"

# Create nginx configuration
echo -e "${GREEN}Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/genetrust << 'EOL'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/genetrust /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Set up SSL with Let's Encrypt
echo -e "${GREEN}Setting up SSL with Let's Encrypt...${NC}"
echo -e "${YELLOW}Please ensure your domain is pointing to this server's IP address.${NC}"
read -p "Enter your email for Let's Encrypt: " email
read -p "Enter your domain (e.g., example.com): " domain

# Replace domain in nginx config
sed -i "s/your-domain.com/$domain/g" /etc/nginx/sites-available/genetrust
systemctl reload nginx

# Obtain SSL certificate
certbot --nginx -d "$domain" -d "www.$domain" --non-interactive --agree-tos -m "$email" --redirect

# Set up certbot auto-renewal
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null

# Set up deployment script
echo -e "${GREEN}Setting up deployment script...${NC}"
cat > /usr/local/bin/deploy-genetrust << 'EOL'
#!/bin/bash

# Exit on error
set -e

APP_DIR="/opt/genetrust"
cd "$APP_DIR" || exit 1

# Pull the latest changes
git pull

# Pull the latest Docker images
docker-compose pull

# Rebuild and restart the containers
docker-compose up -d --build --force-recreate

# Clean up unused images
docker image prune -f

echo "Deployment completed successfully!"
EOL

chmod +x /usr/local/bin/deploy-genetrust
chown "$SUDO_USER:" /usr/local/bin/deploy-genetrust

# Create systemd service for the application
echo -e "${GREEN}Creating systemd service...${NC}"
cat > /etc/systemd/system/genetrust.service << 'EOL'
[Unit]
Description=GeneTrust Application
After=network.target

[Service]
User=root
WorkingDirectory=/opt/genetrust
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable genetrust.service

# Clone the repository if not already present
if [ ! -d "$APP_DIR/.git" ]; then
  echo -e "${GREEN}Cloning the repository...${NC}"
  git clone https://github.com/DeborahOlaboye/genetrust.git "$APP_DIR"
  chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR"
fi

echo -e "${GREEN}Server setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add your environment variables to $APP_DIR/.env"
echo "2. Run 'deploy-genetrust' to start the application"
echo "3. Check the application status with: systemctl status genetrust"
