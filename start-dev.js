const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
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
    let hardhatNode, frontend;
    try {
        console.log("=========================================");
        console.log("🚀 Starting Blockchain Drive Environment");
        console.log("=========================================\n");

        if (!await checkDocker()) {
            console.error("❌ Docker Desktop is not running! Please start Docker Desktop first.");
            process.exit(1);
        }

        // 1. Start Docker Services
        console.log("📦 Starting Graph Node, IPFS, and Postgres via Docker Compose...");
        try {
            await runCommand('docker', ['compose', 'up', '-d'], path.join(__dirname, 'subgraph'));
        } catch (e) {
            console.log("Fallback to docker-compose...");
            await runCommand(dockerComposeCmd, ['up', '-d'], path.join(__dirname, 'subgraph'));
        }

        // 2. Start Hardhat Node
        console.log("\n⛓️ Starting Hardhat Local Blockchain...");
        hardhatNode = spawnBackground(npxCmd, ['hardhat', 'node'], path.join(__dirname, 'smart_contract'), 'Hardhat Node');

        // Wait for Hardhat to be ready
        console.log("⏳ Waiting 6 seconds for Hardhat to initialize...");
        await new Promise(r => setTimeout(r, 6000));

        // 3. Deploy Smart Contracts
        console.log("\n📜 Deploying Smart Contracts...");
        await runCommand(npxCmd, ['hardhat', 'run', 'scripts/deploy-v6-direct.js', '--network', 'localhost'], path.join(__dirname, 'smart_contract'));

        // Wait for Graph Node to be ready
        console.log("\n⏳ Waiting 15 seconds for Graph Node and IPFS to be fully ready...");
        await new Promise(r => setTimeout(r, 15000));

        // 4. Deploy Subgraph
        console.log("\n📊 Deploying Subgraph...");
        await runCommand(npmCmd, ['run', 'codegen'], path.join(__dirname, 'subgraph'));
        await runCommand(npmCmd, ['run', 'build'], path.join(__dirname, 'subgraph'));
        try {
            await runCommand(npmCmd, ['run', 'create-local'], path.join(__dirname, 'subgraph'));
        } catch (e) {
            console.log("Graph already exists or failed to create, skipping create step...");
        }
        await runCommand(npmCmd, ['run', 'deploy-local', '--', '--version-label', Date.now().toString()], path.join(__dirname, 'subgraph'));

        // 5. Start Frontend
        console.log("\n🎨 Starting React Frontend...");
        frontend = spawnBackground(npmCmd, ['run', 'dev'], path.join(__dirname, 'client'), 'Vite Server');

        console.log("\n✅ All services started successfully!");
        console.log("=========================================");
        console.log("Important Addresses:");
        console.log("Frontend: http://localhost:5050");
        console.log("GraphQL Endpoint: http://localhost:8000/subgraphs/name/blockchain-drive/subgraph/graphql");
        console.log("Press Ctrl+C in this terminal to stop all services.");
        console.log("=========================================\n");

        // Handle process exit to cleanup background processes
        process.on('SIGINT', () => {
            console.log("\nStopping services...");
            if (hardhatNode) hardhatNode.kill();
            if (frontend) frontend.kill();
            process.exit(0);
        });

    } catch (err) {
        console.error("\n❌ Error starting environment:", err);
        if (hardhatNode) hardhatNode.kill();
        if (frontend) frontend.kill();
        process.exit(1);
    }
}

main();
