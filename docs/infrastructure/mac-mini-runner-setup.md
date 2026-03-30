# Mac Mini: GitHub Actions Self-Hosted Runner Setup

Step-by-step guide to provision the Mac Mini as a self-hosted GitHub Actions runner
for native-rd Maestro E2E tests (iOS Simulator).

Related: Issue #895, Epic #889

## Prerequisites

- macOS 14+ (Sonoma or later)
- Admin account for initial setup (will create a dedicated runner user)
- Apple ID (for Xcode license acceptance)
- Network access to github.com

## 1. Create Dedicated Runner User

Create a non-admin `runner` user account. The runner process should never run as an
admin user.

```bash
# As admin user:
sudo sysadminctl -addUser runner -fullName "GitHub Runner" -password "<secure-password>" -home /Users/runner
```

All subsequent steps should be performed as the `runner` user unless noted otherwise.

```bash
su - runner
```

## 2. Install Xcode Command Line Tools

```bash
xcode-select --install
```

Accept the Xcode license:

```bash
sudo xcodebuild -license accept
```

## 3. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Add Homebrew to the runner user's PATH (follow the post-install instructions printed
by the installer).

## 4. Install Maestro CLI

```bash
brew install maestro
```

Verify:

```bash
maestro --version
```

## 5. Boot iOS Simulator

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

## 6. Build and Install the App

From the monorepo root:

```bash
cd apps/native-rd
npx expo run:ios
```

Verify the app `com.joe.rd.native-rd` is installed on the simulator:

```bash
xcrun simctl listapps booted | grep "com.joe.rd.native-rd"
```

## 7. Register the GitHub Actions Runner

### Get a Registration Token

```bash
gh api -X POST repos/rollercoaster-dev/monorepo/actions/runners/registration-token --jq '.token'
```

Or retrieve it from: `github.com/rollercoaster-dev/monorepo/settings/actions/runners/new`

### Download and Configure

```bash
mkdir ~/actions-runner && cd ~/actions-runner

# Download the latest runner package (check GitHub for current version)
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-osx-arm64-2.323.0.tar.gz
tar xzf actions-runner.tar.gz

# Configure with labels
./config.sh \
  --url https://github.com/rollercoaster-dev/monorepo \
  --token <REGISTRATION_TOKEN> \
  --labels self-hosted,macOS,e2e \
  --name mac-mini-e2e \
  --work _work
```

### Install as launchd Service

```bash
./svc.sh install
./svc.sh start
```

The runner auto-updates when installed as a service.

### Verify

Confirm the runner appears as **Online** at:
`github.com/rollercoaster-dev/monorepo/settings/actions/runners`

It should show labels: `self-hosted`, `macOS`, `e2e`.

## 8. Security Hardening

- **Non-admin user**: The `runner` user must NOT have admin privileges
- **No stored credentials**: Do not store SSH keys with write access or personal
  access tokens on the runner host
- **Auto-updates enabled**: The launchd service handles runner updates automatically
- **Dedicated to E2E**: This runner should only process jobs labeled
  `self-hosted, macOS, e2e` to avoid contention with other workloads
- **Firewall**: Enable macOS firewall, allow only outbound HTTPS (443) to
  `github.com` and `*.actions.githubusercontent.com`

## 9. Verification Checklist

- [ ] Runner user is non-admin
- [ ] `xcode-select -p` returns a valid path
- [ ] `maestro --version` works
- [ ] `xcrun simctl list devices | grep Booted` shows a device
- [ ] `com.joe.rd.native-rd` installs on the simulator
- [ ] Runner shows as **Online** in GitHub repo settings
- [ ] Labels are `self-hosted, macOS, e2e`
- [ ] `./svc.sh status` shows the service running

## Troubleshooting

### Runner Not Coming Online

Check the launchd service:

```bash
./svc.sh status
# If stopped:
./svc.sh start
```

Check logs:

```bash
cat ~/actions-runner/_diag/Runner_*.log | tail -50
```

### Simulator Won't Boot

```bash
# Reset all simulators
xcrun simctl shutdown all
xcrun simctl erase all
xcrun simctl boot "iPhone 16"
```

### Maestro Can't Find the App

Ensure the app bundle ID matches. Rebuild:

```bash
cd apps/native-rd
npx expo run:ios
```
