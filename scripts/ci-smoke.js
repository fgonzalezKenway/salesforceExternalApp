process.env.PORT = process.env.CI_SMOKE_PORT || '3105';

const { startServer, server } = require('../server');

const port = Number(process.env.PORT);
const timeoutMs = 15000;

async function waitForHealth() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/health`);
            const payload = await response.json();

            if (payload?.ok) {
                return;
            }
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }

    throw new Error('Smoke test timed out waiting for /api/health.');
}

async function closeServer() {
    if (!server.listening) {
        return;
    }

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

(async () => {
    try {
        await startServer(port);
        await waitForHealth();
        console.log('Smoke test passed.');
    } catch (error) {
        console.error(error.stack || String(error));
        process.exitCode = 1;
    } finally {
        await closeServer();
    }
})();
