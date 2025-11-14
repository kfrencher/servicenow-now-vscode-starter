---
description: Instructions for integrating with ServiceNow
applyTo: '**/*.js, **/*.ts, **/*.json, **/*.scss, **/*.html'
globs: '**/*.js, **/*.ts, **/*.json, **/*.scss, **/*.html'
---

# ServiceNow Integration Instructions

## Overview
This document provides guidelines for integrating with the ServiceNow platform, focusing on best practices for JavaScript, HTML, and CSS development within the ServiceNow environment.

This workspace uses the [ServiceNow® Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ServiceNow.now-vscode) for development, which provides two-way synchronization between VS Code and ServiceNow instances, IntelliSense for Glide APIs, and other development features.

## Workspace Structure

### Understanding sn-workspace.json

The `system/sn-workspace.json` file contains configuration and metadata for all ServiceNow applications loaded in this workspace. This file is managed by the ServiceNow VS Code extension.

**Key Properties:**

- **ALL_APPLICATIONS**: Contains all ServiceNow applications loaded locally
  - Each key is the application name (e.g., "KLF", "G KLF")
  - Each application has properties including:
    - `sys_id`: The application's sys_id in ServiceNow
    - `sys_scope`: The scope name (e.g., "x_912467_klf" for scoped apps, "global" for global scope)
    - `package_type`: Usually "sys_app"
    - `PROJECT_STATE`: Current sync state (e.g., "consistent")
    - `INSTANCE_ID`: The instance this application is synced with
    - `BUILD_NAME`: The ServiceNow release version (e.g., "Tokyo")

- **ACTIVE_APPLICATION**: The currently active/selected application for development

**Example sn-workspace.json:**
```json
{
    "ALL_APPLICATIONS": {
        "KLF": {
            "sys_id": "4fd1a55197682910b2e1f97e6253af4b",
            "sys_scope": "x_912467_klf",
            "package_type": "sys_app"
        },
        "G KLF": {
            "sys_id": "fa03e59197682910b2e1f97e6253af92",
            "sys_scope": "global",
            "package_type": "sys_app"
        }
    },
    "ACTIVE_APPLICATION": "KLF"
}
```

### Finding Application Source Code

To locate the actual source code for applications in the workspace:

1. **Check sn-workspace.json**: Look at the `ALL_APPLICATIONS` property to see which applications are loaded locally
2. **Navigate to application folder**: Each application name is a top-level folder
3. **Source files location**: Application source code is in the `{ApplicationName}/src/` directory

**Examples:**
- Application "KLF" → Source code in `KLF/src/`
- Application "G KLF" → Source code in `G KLF/src/`

**Directory Structure:**
```
workspace-root/
├── system/
│   └── sn-workspace.json
├── KLF/
│   ├── app.config.json
│   └── src/
│       ├── Server Development/
│       │   ├── Script Includes/
│       │   ├── Business Rules/
│       │   └── ...
│       └── Client Development/
│           ├── Client Scripts/
│           ├── UI Scripts/
│           └── ...
└── G KLF/
    ├── app.config.json
    └── src/
        └── Server Development/
            └── Script Includes/
```

### Scoped vs Global Applications

- **Scoped Applications**: Have a specific scope (e.g., `x_912467_klf`)
  - All tables, Script Includes, and other artifacts are namespaced
  - Use the scope prefix when referencing from outside the scope
  
- **Global Applications**: Use the "global" scope
  - Accessible from all scopes
  - No namespace prefix required
  - Should be used for shared utilities and common functionality

### Working with Multiple Applications

When searching for code or creating new files:
1. Identify which application the code belongs to
2. Check `sn-workspace.json` to verify the application is loaded locally
3. Navigate to the appropriate `{ApplicationName}/src/` directory
4. Follow the ServiceNow file structure (Server Development, Client Development, etc.)

## ServiceNow Development Best Practices
1. **Use Script Includes for Reusable Code:**
   - Encapsulate reusable logic in Script Includes to promote code reuse and maintainability.
   - Script Includes run on the server side, so ensure that any client-side logic is separated appropriately. Client side code executes in the browser, while server side code runs on the ServiceNow server.
   - When querying the database with GlideRecord use a descriptive variable name for the GlideRecord object, e.g., `var userGR = new GlideRecord('sys_user');`
   - There is a common library that should be used for common operations, avoid duplicating code that already exists in the common library. It is located at `lib/dts/g_klf.js` and `lib/dts/klf.js`.