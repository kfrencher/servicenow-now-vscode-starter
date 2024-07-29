## Features

Overwrites the default configuration files delivered with the ServiceNow Extension for VS Code

To build extension run:
```
$ cd myExtension
$ vsce package
```

Once extension is installed run `SN Starter: Init` command and the default configuration files will be overwritten.

This will configure the following files:
package.json
tsconfig.json
.eslintrc
lib/dts/updatedClientAPI.d.ts
lib/dts/updatedServerAPI.d.ts

After running `SN Starter: Init` command you must run `npm install` to install the required dependencies.
