# PocketBase v0.26.3 Migration Instructions

## Current Status

Your code has been updated to support PocketBase v0.26.3, but there are manual steps required to complete the migration:

1. The server is responding at http://34.96.211.121:8090
2. Authentication is failing with both superuser and admin methods
3. The `_superusers` collection needs to be created

## Manual Steps to Complete Migration

### 1. Access the PocketBase Admin UI

First, access the PocketBase Admin UI to set up the initial admin:

1. Go to http://34.96.211.121:8090/_/
2. You should see a setup screen if this is a fresh installation
3. If you see a login screen, try the credentials from your .env file:
   - Email: `admin@ngmt.com`
   - Password: `admin@ngmt.com`

### 2. Create a Superuser Account

1. If you're at the initial setup screen:
   - Create your superuser account using:
     - Email: `admin@ngmt.com`
     - Password: `admin@ngmt.com`
   - Complete the setup process
   
2. If you can log in with existing credentials but still see authentication errors:
   - Your PocketBase is running v0.26.3+ but may be using a database from a previous version
   - Go to "Settings" → "Import/Export" → back up your data, then reset the database
   - After reset, you'll need to create a new superuser account
   - Alternatively, if you have important data, follow the manual migration path below

### 3. Manual Migration (if you have existing data)

If you have existing data and can't reset the database:

1. Export your data from the PocketBase Admin UI
2. Modify the exported JSON file:
   - Rename any references to `admins` to `_superusers` 
   - Update the schema as needed

3. Import the modified data back into PocketBase

### 4. Verify the Migration

After completing the manual steps, run:

```
node test/check-pocketbase.js
```

You should see:
- Successful connection to the server
- Successful authentication as a superuser
- The `_superusers` collection exists
- The `user_profiles` collection exists (if not, run initialization)

### 5. Run the Initialization Script

If the check passed but the `user_profiles` collection is missing:

```
node setup/initialize-pocketbase.js
```

This will create the necessary collections and configure them properly.

### 6. Start the Application

Once the migration and initialization are complete, start your application:

```
npm start
```

## Authentication Details

Your updated codebase now has multiple authentication fallbacks:

1. First tries to authenticate with `_superusers` collection (v0.26.3+)
2. If that fails, tries legacy admin API (v0.21.1)
3. If both fail, provides clear error messages

User authentication is also updated to work with both email and username authentication.

## Troubleshooting

If you continue to experience issues:

1. Check that PocketBase is running at the URL specified in .env
2. Verify your credentials in the .env file are correct
3. Ensure you've created a superuser account in the PocketBase Admin UI
4. Check the logs for detailed error messages

For more details about the changes in v0.26.3, refer to the upgrade guide in `documentation/pocketbase-v0.26.3-upgrade-guide.md`. 