const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const dockerComposeCmd = isWindows ? 'docker-compose.exe' : 'docker-compose';

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`\n> Running: ${command} ${args.join(' ')}`);
        const child = spawn(command, args, { cwd, stdio: 'inherit', shell: isWindows });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

function spawnBackground(command, args, cwd, name) {
    console.log(`\n> Starting background service [${name}]: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: isWindows });
    child.on('error', (err) => console.error(`Error in ${name}:`, err));
    return child;
}

async function checkDocker() {
    try {
        execSync('docker info', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

async function main() {
    let frontend;
    try {
        console.log("==================================================");
        console.log("🚀 Starting Blockchain Drive (Sepolia Permanent)");
        console.log("==================================================\n");

        if (!await checkDocker()) {
            console.error("❌ Docker Desktop is not running! Please start Docker Desktop first.");
            process.exit(1);
        }

        // 1. Start Docker Services (Graph Node resumes syncing automatically)
        console.log("📦 Starting Graph Node, IPFS, and Postgres via Docker Compose...");
        try {
            await runCommand('docker', ['compose', 'up', '-d'], path.join(__dirname, 'subgraph'));
        } catch (e) {
            console.log("Fallback to docker-compose...");
            await runCommand(dockerComposeCmd, ['up', '-d'], path.join(__dirname, 'subgraph'));
        }

        // 2. Start Frontend
        console.log("\n🎨 Starting React Frontend...");
        frontend = spawnBackground(npmCmd, ['run', 'dev'], path.join(__dirname, 'client'), 'Vite Server');

        console.log("\n✅ Application is ready and permanently backed by Sepolia!");
        console.log("==================================================");
        console.log("Important Addresses:");
        console.log("Frontend: http://localhost:5050");
        console.log("GraphQL Endpoint: http://localhost:8000/subgraphs/name/blockchain-drive/subgraph/graphql");
        console.log("Press Ctrl+C in this terminal to stop all services.");
        console.log("==================================================\n");

        // Handle process exit to cleanup background processes
        process.on('SIGINT', () => {
            console.log("\nStopping services...");
            if (frontend) frontend.kill();
            process.exit(0);
        });

    } catch (err) {
        console.error("\n❌ Error starting environment:", err);
        if (frontend) frontend.kill();
        process.exit(1);
    }
}

main();
