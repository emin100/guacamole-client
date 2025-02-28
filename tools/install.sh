#!/bin/bash
DOWNLOAD_PATH=/tmp/guacamole

REPO_OWNER="emin100"
REPO_NAME="guacamole-client"

LATEST_RELEASE=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

echo "Latest release of $REPO_OWNER/$REPO_NAME: $LATEST_RELEASE"


if [[ "$EUID" -ne 0 ]]; then
  echo "Please run this script as root."
  exit 1
fi

mkdir $DOWNLOAD_PATH
if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "Running on macOS."
  curl -s https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$LATEST_RELEASE/guacamole-darwin-$(uname -m)-${LATEST_RELEASE:1}.zip > $DOWNLOAD_PATH/guacamole.app
  xattr -cr $DOWNLOAD_PATH/guacamole.app
  codesign --force --deep --sign - $DOWNLOAD_PATH/guacamole.app
  chmod +x $DOWNLOAD_PATH/guacamole.app

  mv -f $DOWNLOAD_PATH/guacamole.app /Applications/
else
  echo "Running on a non-macOS system."
  # Commands for other operating systems
fi
