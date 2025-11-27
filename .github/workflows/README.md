# CI/CD Pipeline Documentation

This document provides an overview of the CI/CD pipeline setup for the GeneTrust application.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and includes the following stages:

1. **Lint and Test**
   - Runs linters and tests
   - Uploads test coverage to Codecov

2. **Build and Push Docker Image**
   - Builds a Docker image
   - Pushes the image to Docker Hub

3. **Deploy to Staging** (on `develop` branch)
   - Deploys to the staging environment

4. **Deploy to Production** (on `main` branch)
   - Deploys to the production environment
   - Sends a notification to Slack

## Prerequisites

### GitHub Secrets

The following secrets need to be configured in your GitHub repository settings:

| Secret Name | Description |
|-------------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `STAGING_SSH_PRIVATE_KEY` | Private key for SSH access to staging server |
| `STAGING_SSH_USER` | SSH username for staging server |
| `STAGING_SERVER_IP` | IP address of staging server |
| `PRODUCTION_SSH_PRIVATE_KEY` | Private key for SSH access to production server |
| `PRODUCTION_SSH_USER` | SSH username for production server |
| `PRODUCTION_SERVER_IP` | IP address of production server |
| `SLACK_WEBHOOK_URL` | Webhook URL for Slack notifications |
| `CODECOV_TOKEN` | Token for uploading test coverage to Codecov |

### Server Setup

1. **Prerequisites**
   - Ubuntu 20.04/22.04 LTS
   - Docker and Docker Compose
   - Nginx
   - Node.js and pnpm

2. **Run the setup script**
   ```bash
   # Make the script executable
   chmod +x scripts/setup-server.sh
   
   # Run the script with sudo
   sudo ./scripts/setup-server.sh
   ```

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env` in the project root
   - Update the values in `.env` as needed

## Workflow Details

### Lint and Test

- Runs on: Every push and pull request
- Jobs:
  - Checkout code
  - Set up Node.js and pnpm
  - Install dependencies
  - Run linters
  - Run tests
  - Upload test coverage to Codecov

### Build and Push Docker Image

- Runs on: Push to `main` or `develop` branches
- Depends on: Lint and Test
- Jobs:
  - Build Docker image
  - Push to Docker Hub with appropriate tags

### Deploy to Staging

- Runs on: Push to `develop` branch
- Depends on: Build and Push Docker Image
- Jobs:
  - SSH into staging server
  - Pull latest Docker images
  - Restart containers

### Deploy to Production

- Runs on: Push to `main` branch
- Depends on: Build and Push Docker Image
- Jobs:
  - SSH into production server
  - Pull latest Docker images
  - Restart containers
  - Send deployment notification to Slack

## Manual Deployment

You can trigger a manual deployment using the GitHub Actions UI:

1. Go to the "Actions" tab in your GitHub repository
2. Select the "CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select the branch to deploy from
5. Click "Run workflow"

## Monitoring and Logs

### Application Logs

```bash
# View logs for the application
journalctl -u genetrust.service -f

# View Docker container logs
docker-compose logs -f
```

### Nginx Access/Error Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Common Issues

1. **Docker permission denied**
   - Make sure your user is in the `docker` group:
     ```bash
     sudo usermod -aG docker $USER
     newgrp docker
     ```

2. **Nginx configuration errors**
   - Test Nginx configuration:
     ```bash
     nginx -t
     ```
   - Check Nginx error logs:
     ```bash
     tail -f /var/log/nginx/error.log
     ```

3. **SSL certificate issues**
   - Renew certificates manually:
     ```bash
     certbot renew --dry-run
     ```
   - Check certificate expiration:
     ```bash
     certbot certificates
     ```

## Security Considerations

- Always use strong passwords and SSH keys
- Keep your server and dependencies up to date
- Regularly rotate your credentials and tokens
- Monitor your server logs for suspicious activities
- Use a firewall and fail2ban for additional security

## License

This project is licensed under the MIT License.
