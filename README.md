# Boo!

> [!WARNING]  
> This project is work in progress, it is not deployed anywhere and  is not ready for general use. 

Boo! is a package registry for the [Uiua](https://uiua.org) programming language. It's built to facilitate sharing and using Uiua libraries, running Uiua applications, browsing documentation.

Includes a CLI application for managing/publishing libraries and applications.

## Development

Prerequsites:
- Node 22+ must be installed in your system.
- Rust 1.86+ must be installed in your system.
- Redis 8+ (or any Redis-compatible service) must be installed and running as a background process.

Setting up development environment:
1. Clone the repostory.
2. Run `npm install` to install JavaScript dependencies.
3. Run `npm run reset` to setup storage and database.
4. Run `cd cli && cargo build` to compile the cli application (required for publishing packages).
5. Create a fine named `.env` and paste contents from `.env.example` to it.
6. Create a GitHub App (https://github.com/settings/apps/new) 
   - Set callback URL to: http://localhost:3333/login/github/callback
   - Check "Request user authorization (OAuth) during installation"
   - Disable "Webhook"
   - Set "Account permissions" > "Email addresses" to "Read-only"
   - Update the GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in `.env`
7. Run `npm run dev` to start the server.

To test the cli app, simply:
1. Use `cd cli/test-package` to open the test project in your terminal.
2. Use `cargo run -- <command>` to run the cli app in the context of the test project.

