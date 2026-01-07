import { $ } from "bun";

console.log("🚀 Starting server at http://localhost:3000");

// Kill any existing Next.js processes on port 3000
try {
  const pid = await $`lsof -ti:3000`.quiet();
  if (pid.stdout.toString().trim()) {
    console.log("⚠️  Killing existing process on port 3000...");
    await $`kill -9 ${pid.stdout.toString().trim()}`.quiet();
    // Wait a moment for the process to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
} catch (e) {
  // No process found, that's fine
}

// Remove the lock file if it exists
try {
  await $`rm -f .next/dev/lock`.quiet();
} catch (e) {
  // Lock file doesn't exist, that's fine
}

// Run the dev server
await $`bun run dev`.nothrow();