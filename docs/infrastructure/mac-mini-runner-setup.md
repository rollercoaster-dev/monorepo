# Mac Mini: GitHub Actions Self-Hosted Runner Setup

Step-by-step guide to provision the Mac Mini as a self-hosted GitHub Actions runner
for native-rd Maestro E2E tests (iOS Simulator).

Related: Issue #895, Epic #889

## Prerequisites

- macOS 14+ (Sonoma or later)
- Admin account for initial setup (will create a dedicated runner user)
- Apple ID (for Xcode license acceptance)
- Network access to github.com

## Part 1: Admin Setup (as your admin user)

These steps require admin/sudo privileges. Run them from your normal admin account.

### 1.1 Install Xcode Command Line Tools

```bash
xcode-select --install
sudo xcodebuild -license accept
```

### 1.2 Create Dedicated Runner User

Create a non-admin `runner` user account. The runner process should never run as an
admin user.

```bash
sudo sysadminctl -addUser runner -fullName "GitHub Runner" -password "<secure-password>" -home /Users/runner
```

### 1.3 Install Homebrew (system-wide) and Maestro

If Homebrew isn't already installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Install Maestro (available to all users):

```bash
brew install maestro
```

### 1.4 Install the Runner Service

The `svc.sh` scripts require sudo. Download and configure the runner as admin,
then install the service. The service itself will run as the `runner` user.

```bash
sudo mkdir -p /Users/runner/actions-runner
sudo chown runner:staff /Users/runner/actions-runner
cd /Users/runner/actions-runner

# Download the latest runner package
RUNNER_VERSION=$(gh api repos/actions/runner/releases/latest --jq '.tag_name' | sed 's/^v//')
sudo -u runner curl -o actions-runner.tar.gz -L "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
sudo -u runner tar xzf actions-runner.tar.gz

# Get a registration token
TOKEN=$(gh api -X POST repos/rollercoaster-dev/monorepo/actions/runners/registration-token --jq '.token')

# Configure as the runner user
sudo -u runner ./config.sh \
  --url https://github.com/rollercoaster-dev/monorepo \
  --token "$TOKEN" \
  --labels self-hosted,macOS,e2e \
  --name mac-mini-e2e \
  --work _work

# Install and start the launchd service (requires sudo, runs as runner user)
sudo ./svc.sh install runner
sudo ./svc.sh start
```

The runner auto-updates when installed as a service.

## Part 2: Runner User Setup (as `runner`)

Switch to the runner user for simulator and app setup:

```bash
su - runner
```

### 2.1 Boot iOS Simulator

List available runtimes and devices:

```bash
xcrun simctl list runtimes
xcrun simctl list devices
```

Boot a simulator (e.g., iPhone 16):

```bash
xcrun simctl boot "iPhone 16"
```

Verify the simulator is booted:

```bash
xcrun simctl list devices | grep Booted
```

### 2.2 Build and Install the App

From the monorepo root:

```bash
cd apps/native-rd
npx expo run:ios
```

Verify the app `com.joe.rd.native-rd` is installed on the simulator:

```bash
xcrun simctl listapps booted | grep "com.joe.rd.native-rd"
```

### 2.3 Verify Runner is Online

Confirm the runner appears as **Online** at:
`github.com/rollercoaster-dev/monorepo/settings/actions/runners`

It should show labels: `self-hosted`, `macOS`, `e2e`.

## Security Hardening

- **Non-admin user**: The `runner` user must NOT have admin privileges
- **No stored credentials**: Do not store SSH keys with write access or personal
  access tokens on the runner host
- **Auto-updates enabled**: The launchd service handles runner updates automatically
- **Dedicated to E2E**: This runner should only process jobs labeled
  `self-hosted, macOS, e2e` to avoid contention with other workloads
- **Firewall**: Enable macOS firewall, allow only outbound HTTPS (443) to
  `github.com` and `*.actions.githubusercontent.com`

## Verification Checklist

- [ ] Runner user is non-admin
- [ ] `xcode-select -p` returns a valid path
- [ ] `maestro --version` works (as runner user)
- [ ] `xcrun simctl list devices | grep Booted` shows a device (as runner user)
- [ ] `com.joe.rd.native-rd` installs on the simulator
- [ ] Runner shows as **Online** in GitHub repo settings
- [ ] Labels are `self-hosted, macOS, e2e`
- [ ] `sudo ./svc.sh status` shows the service running

## Troubleshooting

### Runner Not Coming Online

Check the launchd service (as admin):

```bash
cd /Users/runner/actions-runner
sudo ./svc.sh status
# If stopped:
sudo ./svc.sh start
```

Check logs:

```bash
cat /Users/runner/actions-runner/_diag/Runner_*.log | tail -50
```

### Simulator Won't Boot

As runner user:

```bash
xcrun simctl shutdown all
xcrun simctl erase all
xcrun simctl boot "iPhone 16"
```

### Maestro Can't Find the App

Ensure the app bundle ID matches. Rebuild (as runner user):

```bash
cd apps/native-rd
npx expo run:ios
```
