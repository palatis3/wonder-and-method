#!/usr/bin/env bash
set -euo pipefail

# The hosted runner's Azure mirror can stall during browser dependency installs.
# Keep the same Ubuntu suites, components and signing keys; change only its URI.
if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  echo "This helper is only for ephemeral GitHub Actions runners." >&2
  exit 1
fi
for task_apt_source in /etc/apt/apt-mirrors.txt /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do
  if [[ -f "$task_apt_source" ]]; then
    sudo sed -i \
      -e 's|http://azure\.archive\.ubuntu\.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      -e 's|https://azure\.archive\.ubuntu\.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      "$task_apt_source"
  fi
done
echo "Ubuntu archive URIs prepared; package signature verification is unchanged."
