#!/usr/bin/env bash
# Render Build Script for AIMS (Node.js 22+ & Python AI Engine)
set -o errexit

echo "=========================================================="
echo "  AIMS BUILD: Installing Node.js & Python dependencies"
echo "=========================================================="

# 1. Install Node.js dependencies
echo "--> Installing Node.js packages via npm ci..."
npm ci

# 2. Install Python AI/ML dependencies
echo "--> Installing Python requirements for scikit-learn forecasting..."
if command -v pip3 >/dev/null 2>&1; then
  pip3 install --break-system-packages -r requirements.txt || pip3 install --user -r requirements.txt || pip3 install -r requirements.txt
elif command -v python3 >/dev/null 2>&1; then
  python3 -m pip install --break-system-packages -r requirements.txt || python3 -m pip install --user -r requirements.txt || python3 -m pip install -r requirements.txt
elif command -v pip >/dev/null 2>&1; then
  pip install -r requirements.txt
else
  echo "[WARNING] Neither pip3 nor python3 found in PATH. Subprocess retraining may fail."
fi

echo "=========================================================="
echo "  AIMS BUILD: Completed successfully!"
echo "=========================================================="
