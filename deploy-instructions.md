# Deployment Instructions for Store To Door Shopify App

## Option 1: Deploy to GitHub Pages Manually

1. Go to your GitHub repository: https://github.com/dimivat/store-to-door-shopify
2. Click on "Settings"
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select the branch "feature/calendar-order-view" and folder "/public"
6. Click "Save"

GitHub will then deploy your site and provide a URL like:
`https://dimivat.github.io/store-to-door-shopify/`

## Option 2: Deploy to Surge.sh (Recommended)

Surge.sh is a simple, single-command web publishing platform that's perfect for static sites.

1. Install Surge globally:
```bash
npm install -g surge
```

2. Navigate to your project directory:
```bash
cd /Users/james/CascadeProjects/store-to-door-shopify
```

3. Deploy the public directory:
```bash
surge public/
```

4. Follow the prompts to create an account (if you don't have one)
5. You can specify a custom subdomain or use the randomly generated one

Your site will be deployed to a URL like `https://your-chosen-name.surge.sh`

## Option 3: Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize your project:
```bash
firebase init
```
   - Select "Hosting"
   - Choose "Use an existing project" or "Create a new project"
   - Set "public" as your public directory
   - Configure as a single-page app: Yes
   - Set up automatic builds and deploys with GitHub: No

4. Deploy:
```bash
firebase deploy
```

Your site will be available at `https://your-project-id.web.app`
