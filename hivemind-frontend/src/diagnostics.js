// VS Code Extension Diagnostic Script
// Run this in the Debug Console of VS Code when testing the extension

// Check if the extension is properly activated
function checkExtensionActivation() {
    console.log("Checking extension activation...");
    
    // Get all extensions
    const extensions = vscode.extensions.all;
    const hivemindExtension = extensions.find(ext => ext.id === 'hivemind-copilot' || ext.id.includes('hivemind'));
    
    if (hivemindExtension) {
        console.log("✅ HiveMind extension is installed:", hivemindExtension.id);
        console.log("Extension path:", hivemindExtension.extensionPath);
        console.log("Is active:", hivemindExtension.isActive);
        return true;
    } else {
        console.log("❌ HiveMind extension not found in installed extensions");
        return false;
    }
}

// Check if the extension's package.json has the correct icon configuration
function checkIconConfiguration() {
    console.log("Checking icon configuration...");
    
    const fs = require('fs');
    const path = require('path');
    
    // Get extension directory (assuming we're running in the extension's directory)
    const extensionDir = path.resolve(__dirname);
    const packageJsonPath = path.join(extensionDir, 'package.json');
    
    try {
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            console.log("Extension name:", packageJson.name);
            console.log("Extension display name:", packageJson.displayName);
            
            // Check icon configuration
            if (packageJson.icon) {
                console.log("✅ Icon defined in package.json:", packageJson.icon);
                
                // Check if the icon file exists
                const iconPath = path.join(extensionDir, packageJson.icon);
                if (fs.existsSync(iconPath)) {
                    console.log("✅ Icon file exists at:", iconPath);
                } else {
                    console.log("❌ Icon file not found at:", iconPath);
                }
            } else {
                console.log("❌ No icon defined in package.json");
            }
            
            // Check contribution points
            if (packageJson.contributes) {
                console.log("Contribution points:");
                
                // Check commands
                if (packageJson.contributes.commands) {
                    console.log(`- Commands: ${packageJson.contributes.commands.length} defined`);
                }
                
                // Check views
                if (packageJson.contributes.views) {
                    console.log("- Views defined for:", Object.keys(packageJson.contributes.views).join(", "));
                }
                
                // Check viewsContainers
                if (packageJson.contributes.viewsContainers) {
                    console.log("- View containers defined for:", Object.keys(packageJson.contributes.viewsContainers).join(", "));
                    
                    // Check activitybar containers specifically
                    if (packageJson.contributes.viewsContainers.activitybar) {
                        console.log(`- Activity bar containers: ${packageJson.contributes.viewsContainers.activitybar.length} defined`);
                        packageJson.contributes.viewsContainers.activitybar.forEach(container => {
                            console.log(`  - ${container.id} (icon: ${container.icon})`);
                        });
                    } else {
                        console.log("❌ No activity bar containers defined");
                    }
                } else {
                    console.log("❌ No view containers defined");
                }
            } else {
                console.log("❌ No contribution points defined");
            }
            
            return true;
        } else {
            console.log("❌ package.json not found at:", packageJsonPath);
            return false;
        }
    } catch (error) {
        console.error("Error checking icon configuration:", error);
        return false;
    }
}

// Run diagnostics
function runDiagnostics() {
    console.log("Running HiveMind Copilot extension diagnostics...");
    
    const activationResult = checkExtensionActivation();
    const iconResult = checkIconConfiguration();
    
    console.log("\nDiagnostic Summary:");
    console.log("- Extension activation:", activationResult ? "✅ OK" : "❌ Failed");
    console.log("- Icon configuration:", iconResult ? "✅ OK" : "❌ Failed");
    
    if (!activationResult || !iconResult) {
        console.log("\nRecommended fixes:");
        
        if (!activationResult) {
            console.log("1. Check extension.ts for activation errors");
            console.log("2. Verify that the extension ID in package.json is correct");
        }
        
        if (!iconResult) {
            console.log("1. Add an icon field to package.json pointing to an image file");
            console.log("2. Ensure the viewsContainers.activitybar section is properly configured");
            console.log("3. Make sure all icon files referenced in package.json exist");
        }
    }
}

// Execute diagnostics
runDiagnostics();
