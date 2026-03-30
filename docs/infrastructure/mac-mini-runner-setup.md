# Mac Mini: GitHub Actions Self-Hosted Runner Setup

Step-by-step guide to provision the Mac Mini as a self-hosted GitHub Actions runner
for native-rd Maestro E2E tests (iOS Simulator).

Related: Issue #895, Epic #889

## Prerequisites

- macOS 14+ (Sonoma or later)
- Admin account for initial setup
- **Xcode** (full install from App Store — the iOS Simulator SDK is required,
  CLI Tools alone are not enough)
- **Homebrew** (`brew` — for installing Maestro and CocoaPods)
- **`gh` CLI** (`brew install gh`, authenticated with `gh auth login`)
- Network access to github.com

## Part 1: Admin Setup (as your admin user)

These steps require admin/sudo privileges. Run them from your normal admin account.

### 1.1 Xcode

Install Xcode from the App Store (or via `mas install 497799835`). Then:

```bash
# Point xcode-select to the full Xcode.app (not just CLI Tools)
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

`npx expo run:ios` needs the iOS Simulator SDK, which ships with Xcode.app — not
with the standalone Command Line Tools.

### 1.2 Homebrew, Maestro, and CocoaPods

```bash
# Install Homebrew if not already present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Maestro (E2E test runner)
brew install maestro

# CocoaPods (Expo runs `pod install` during native builds)
brew install cocoapods
```

### 1.3 Make Homebrew tools available to the runner user

The GitHub Actions runner does not source `~/.zshrc`. To ensure Homebrew-installed
tools (`maestro`, `pod`) are on PATH for all users including the runner service:

```bash
# Add Homebrew to the system-wide PATH
echo '/opt/homebrew/bin' | sudo tee /etc/paths.d/homebrew
```

This takes effect for new shells and launchd services.

### 1.4 Create Dedicated Runner User

Create a non-admin `runner` user account. The runner process should never run as
admin.

```bash
sudo sysadminctl -addUser runner -fullName "GitHub Runner" \
  -password "<secure-password>" -home /Users/runner
```

### 1.5 Install and Register the Runner Service

The `svc.sh` scripts require sudo. Download and configure the runner as admin,
then install the service. The service runs as the `runner` user.

```bash
sudo mkdir -p /Users/runner/actions-runner
sudo chown runner:staff /Users/runner/actions-runner
cd /Users/runner/actions-runner

# Download the latest runner package
RUNNER_VERSION=$(gh api repos/actions/runner/releases/latest --jq '.tag_name' | sed 's/^v//')
ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && ARCH_STR="arm64" || ARCH_STR="x64"
sudo -u runner curl -o actions-runner.tar.gz -L \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-${ARCH_STR}-${RUNNER_VERSION}.tar.gz"
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

### 2.1 Verify tools are on PATH

```bash
which maestro    # → /opt/homebrew/bin/maestro
which pod        # → /opt/homebrew/bin/pod
xcode-select -p  # → /Applications/Xcode.app/Contents/Developer
xcrun --find simctl  # should return a path
```

If `maestro` or `pod` are not found, check that `/etc/paths.d/homebrew` exists
and contains `/opt/homebrew/bin`, then open a new shell.

### 2.2 Boot iOS Simulator

```bash
xcrun simctl list runtimes
xcrun simctl list devices
xcrun simctl boot "iPhone 16"
xcrun simctl list devices | grep Booted
```

### 2.3 Build and Install the App

From the monorepo root:

```bash
cd apps/native-rd
npx expo run:ios
```

Verify the app is installed:

```bash
xcrun simctl listapps booted | grep "com.joe.rd.native-rd"
```

### 2.4 Verify Runner is Online

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

All checks below should be run as the `runner` user unless noted.

- [ ] Runner user is non-admin
- [ ] `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer`
- [ ] `which maestro` → `/opt/homebrew/bin/maestro`
- [ ] `which pod` → `/opt/homebrew/bin/pod`
- [ ] `xcrun simctl list devices | grep Booted` shows a device
- [ ] `com.joe.rd.native-rd` installs on the simulator
- [ ] Runner shows as **Online** in GitHub repo settings
- [ ] Labels are `self-hosted, macOS, e2e`
- [ ] `sudo ./svc.sh status` shows the service running (as admin)

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

### Homebrew tools not found by runner

```bash
# Verify /etc/paths.d/homebrew exists
cat /etc/paths.d/homebrew  # should show /opt/homebrew/bin

# Restart the runner service to pick up PATH changes
cd /Users/runner/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
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
