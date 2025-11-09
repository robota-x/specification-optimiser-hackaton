# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0a7950f1-7d4e-4118-b1b0-5f22bf938f94

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0a7950f1-7d4e-4118-b1b0-5f22bf938f94) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0a7950f1-7d4e-4118-b1b0-5f22bf938f94) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
