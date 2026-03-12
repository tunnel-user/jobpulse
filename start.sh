#!/bin/bash

if [ ! -f .env ]; then
    echo "Generating env..."
    cp .env.example .env
else
    echo ".env exists"
fi

docker compose up -d --build