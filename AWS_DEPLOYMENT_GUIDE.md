# AWS Deployment Guide - Couples' Memory App

This guide outlines step-by-step how to deploy your Couples' Memory and Planning app to AWS using a simple **EC2 instance** for the application server, **RDS PostgreSQL** for the database, and **S3** for photo storage.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │         Client            │
                          └──────────────┬────────────┘
                                         │ HTTPS (443) / HTTP (80)
                                         ▼
                          ┌───────────────────────────┐
                          │       Nginx Server        │ (AWS EC2 Instance)
                          └─────┬───────────────┬─────┘
                                │               │
        Proxy /api to Port 5001 │               │ Serve Static Build
                                ▼               ▼
                    ┌────────────────┐     ┌────────────────┐
                    │  Node.js API   │     │   React SPA    │
                    │   (via PM2)    │     │  (Vite Build)  │
                    └──────┬───┬─────┘     └────────────────┘
                           │   │
        PostgreSQL Queries │   │ Media uploads
                           ▼   ▼
     ┌───────────────────────┐ ┌───────────────────────┐
     │       AWS RDS         │ │        AWS S3         │
     │     (PostgreSQL)      │ │   (Image Storage)     │
     └───────────────────────┘ └───────────────────────┘
```

---

## Step 1: Set up AWS RDS (PostgreSQL Database)

1. Open the **AWS Console** and search for **RDS**.
2. Click **Create database**:
   - **Engine options**: PostgreSQL.
   - **Templates**: Free tier (highly cost-effective for private usage).
   - **Settings**:
     - DB instance identifier: `kuteovapemen-db`.
     - Master username: `postgres` (or your choice).
     - Master password: *Choose a strong password*.
   - **Connectivity**:
     - Public access: **No** (for maximum security, only allow connection from your EC2 instance).
     - Under Security Groups, select/create a Security Group that will allow inbound PostgreSQL traffic (Port 5432) from the EC2 instance's Security Group.
3. Once the database status is **Available**, copy the **Endpoint** under Connectivity & Security.
4. Your connection URL format will be:
   `postgresql://YOUR_USERNAME:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres?schema=public`

---

## Step 2: Set up AWS S3 (Media Storage)

1. Open the **AWS Console** and search for **S3**.
2. Click **Create bucket**:
   - Bucket name: `kuteovapemen-memories-bucket` (needs to be globally unique).
   - Region: Choose the same region as your EC2/RDS (e.g. `us-east-1`).
   - **Object Ownership**: ACLs enabled, and choose **Bucket owner preferred**.
   - **Block Public Access settings**: Uncheck "Block *all* public access" (since we want memory photos and wishlist images to be viewable by your browsers via S3 URLs). Check the acknowledgments below it.
3. Once created, go to the **Permissions** tab of the bucket:
   - Add a Bucket Policy to allow public read access for objects inside:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
         }
       ]
     }
     ```
     *(Replace `YOUR_BUCKET_NAME` with your actual bucket name)*.
4. Go to **AWS IAM** console, create a user (e.g. `kuteovapemen-s3-user`) with **Programmatic Access**.
5. Attach the policy `AmazonS3FullAccess` to this user.
6. Save the generated **AWS Access Key ID** and **AWS Secret Access Key**.

---

## Step 3: Launch AWS EC2 Instance

1. Open the **AWS Console** and search for **EC2**.
2. Click **Launch instance**:
   - Name: `kuteovapemen-web-server`.
   - OS Image: **Ubuntu Server 22.04 LTS** (Free tier eligible).
   - Instance type: `t2.micro` or `t3.micro`.
   - Key pair: Create or select an SSH key pair to access the server.
   - **Network settings**:
     - Allow SSH traffic from: My IP (or Anywhere).
     - Allow HTTP traffic from the internet (Port 80).
     - Allow HTTPS traffic from the internet (Port 443).
3. Click Launch. Once running, copy its **Public IPv4 Address**.

---

## Step 4: Provision the EC2 Server

SSH into your Ubuntu server using your terminal:
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Inside the Ubuntu terminal, run the following commands to install Node.js, Git, Nginx, and PM2:
```bash
# Update Ubuntu package repository
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node -v
npm -v

# Install PM2 globally to run Node in the background
sudo npm install pm2 -g

# Install Nginx to serve frontend and act as reverse proxy
sudo apt install nginx -y
```

---

## Step 5: Upload Project and Configure Environments

1. Clone your project code onto the EC2 server (or upload files using git or SCP):
   ```bash
   git clone https://github.com/yourusername/kuteovapemen.git /var/www/kuteovapemen
   cd /var/www/kuteovapemen
   ```
2. Set up Backend Configurations:
   ```bash
   cd backend
   npm install
   
   # Create production .env file
   cp .env.example .env
   nano .env
   ```
   Modify the values in `.env` to include your:
   - **DATABASE_URL** (your AWS RDS postgres connection link).
   - **GOOGLE_CLIENT_ID** (for Google Auth).
   - **JWT_SECRET** (a long secure random string).
   - **AWS S3 Credentials** (from Step 2).

3. Generate Prisma client & apply database migrations:
   ```bash
   # Generates schema files
   npm run prisma:generate
   
   # Applies tables to PostgreSQL RDS
   npx prisma db push
   ```

---

## Step 6: Build the Frontend

1. Go back to the root directory and navigate to `frontend`:
   ```bash
   cd /var/www/kuteovapemen/frontend
   npm install
   ```
2. Build the production React files:
   ```bash
   npm run build
   ```
   This compiles your React application into `/var/www/kuteovapemen/frontend/dist/`.

---

## Step 7: Configure Nginx Reverse Proxy

1. Create a new Nginx server block configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/kuteovapemen
   ```
2. Paste the following configuration, replacing `YOUR_EC2_PUBLIC_IP` with either your EC2's IP or your custom domain:
   ```nginx
   server {
       listen 80;
       server_name YOUR_EC2_PUBLIC_IP;

       # Serve Frontend Static files
       location / {
           root /var/www/kuteovapemen/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to Node Backend on Port 5001
       location /api/ {
           proxy_pass http://127.0.0.1:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Proxy Uploads folder (in case S3 fails or for local storage)
       location /uploads/ {
           proxy_pass http://127.0.0.1:5001;
       }
   }
   ```
3. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/kuteovapemen /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # remove default configuration
   sudo nginx -t                             # check configuration is valid
   sudo systemctl restart nginx
   ```

---

## Step 8: Start Backend Server using PM2

1. Go back to the backend directory:
   ```bash
   cd /var/www/kuteovapemen/backend
   ```
2. Start the backend app in production mode:
   ```bash
   pm2 start ecosystem.config.cjs --env production
   ```
3. Save the PM2 list and configure it to auto-launch on system reboots:
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Copy and run the shell command outputted by the `pm2 startup` command to finish service registration).*

---

🎉 **Congratulations!** Your private couples space is now deployed and running on your AWS EC2 instance. Navigate to your EC2 public IP or domain in your web browser to access it.
