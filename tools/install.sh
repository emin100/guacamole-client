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
  FILE="guacamole-darwin-$(uname -m)-${LATEST_RELEASE:1}.zip"
  curl -L -o $DOWNLOAD_PATH/$FILE https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$LATEST_RELEASE/$REPO_NAME-darwin-$(uname -m)-${LATEST_RELEASE:1}.zip
  rm -rf $DOWNLOAD_PATH/$REPO_NAME.app
  unzip $DOWNLOAD_PATH/$FILE -d $DOWNLOAD_PATH/
  xattr -cr $DOWNLOAD_PATH/$REPO_NAME.app
  codesign --force --deep --sign - $DOWNLOAD_PATH/$REPO_NAME.app
  chmod +x $DOWNLOAD_PATH/$REPO_NAME.app
  rm -rf /Applications/$REPO_NAME.app
  mv -f $DOWNLOAD_PATH/$REPO_NAME.app /Applications/
else
  echo "Running on a non-macOS system."
  # Commands for other operating systems
fi
