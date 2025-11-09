# Architectural Specification AI Green Optimiser

## Project info

**Deployment URL**: https://specificationoptimiser.robota.dev
**Project Name**: specification-optimiser-hackaton

## Overview

AI-powered specification builder for sustainable architectural projects. This tool helps architects and designers create optimized specifications with a focus on environmental sustainability and green building practices.

## Development

**Local Development**

Work locally using your preferred IDE:

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Authentication Setup

This project uses Supabase for authentication with support for:
- Email/Password authentication
- Google OAuth (Social Login)
- Anonymous users

### Configuring Google OAuth in Supabase

To enable Google social login, follow these steps:

1. **Go to your Supabase project dashboard**
   - Navigate to Authentication > Providers
   - Find "Google" in the list of providers

2. **Create Google OAuth credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Copy the Client ID and Client Secret

3. **Configure Supabase**
   - In your Supabase dashboard under Authentication > Providers > Google:
   - Toggle "Enable Google provider" to ON
   - Paste your Google Client ID
   - Paste your Google Client Secret
   - Click "Save"

4. **Configure Redirect URLs** (if needed)
   - In Authentication > URL Configuration
   - Add your site URL (e.g., `https://yourdomain.com`)
   - Add redirect URLs if using custom domains

5. **Environment Variables**
   Make sure you have the following in your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
   VITE_SUPABASE_PROJECT_ID=<your-project-id>
   ```

### Authentication Settings

The following authentication settings are configured:
- **Email Confirmation**: Disabled (for simple SSO flow)
- **2FA/MFA**: Disabled
- **Anonymous Sign-ins**: Enabled
- **Session Persistence**: Enabled (localStorage)

## Deployment

The project is automatically deployed to Cloudflare Pages on push to the `main` branch.

**Deployment Pipeline:**
1. Build the project
2. Run Supabase migrations
3. Deploy to Cloudflare Pages at https://specificationoptimiser.robota.dev

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

**Required Cloudflare Pages Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
