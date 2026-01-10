#!/bin/bash

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default flags
INITIALIZE=false
BACKEND_ONLY=false
RUN_ALL=false
SAVE_LOGS=false
CLEAN_UP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --initialize)
            INITIALIZE=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        --log)
            SAVE_LOGS=true
            shift
            ;;
        --clean)
            CLEAN_UP=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --initialize    Run initial setup (GRUB config, Judge0 passwords, start Judge0)"
            echo "  --backend-only  Run only the backend-server container (no Judge0)"
            echo "  --all           Run both backend-server and Judge0 containers"
            echo "  --log           Save Docker logs to files"
            echo "  --clean         Stop and remove all containers and volumes (resets databases)"
            echo "  -h, --help      Show this help message"
            echo ""
            echo "At least one option is required."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Check if no action was specified
if ! $INITIALIZE && ! $BACKEND_ONLY && ! $RUN_ALL && ! $SAVE_LOGS && ! $CLEAN_UP; then
    echo "No action specified. Use --help for usage information."
    exit 1
fi

# Function to save docker logs
save_logs() {
    local log_dir="$SCRIPT_DIR/logs"
    mkdir -p "$log_dir"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    echo "Saving Docker logs to $log_dir..."
    
    # Get all running containers and save their logs
    local containers=$(docker ps --format '{{.Names}}')
    
    for container in $containers; do
        echo "Saving logs for $container..."
        docker logs "$container" > "$log_dir/${container}_$timestamp.log" 2>&1 || true
    done
    
    echo "Logs saved to $log_dir with timestamp $timestamp"
}

# Shared network name
NETWORK_NAME="evman-network"

# Ensure shared network exists
ensure_network() {
    docker network create $NETWORK_NAME 2>/dev/null || true
}

# Connect container to shared network
connect_to_network() {
    local container=$1
    docker network connect $NETWORK_NAME "$container" 2>/dev/null || true
}

# Initial setup function
run_initialize() {
    echo "Running initial setup..."
    
    # Create shared network
    ensure_network
    
    # Update GRUB config
    sudo sed -i '/^GRUB_CMDLINE_LINUX=/ { /systemd.unified_cgroup_hierarchy=0/! s/"$/ systemd.unified_cgroup_hierarchy=0"/ }' /etc/default/grub

    cd "$SCRIPT_DIR/docker/judge0"
    
    # Generate random passwords for PostgreSQL and Redis
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(< /dev/urandom tr -dc 'A-Za-z0-9' | head -c 32)/" judge0.conf 
    sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$(< /dev/urandom tr -dc 'A-Za-z0-9' | head -c 32)/" judge0.conf 

    # Start database and redis first
    docker-compose up -d db redis
    echo "Waiting for database and redis to initialize..."
    sleep 10s

    # Start Judge0 server and workers
    docker-compose up -d
    echo "Waiting for Judge0 to start..."
    sleep 5s
    
    # Connect Judge0 to shared network
    connect_to_network judge0_server_1
    connect_to_network judge0_workers_1
    connect_to_network judge0_db_1
    connect_to_network judge0_redis_1
    
    echo "Initial setup complete. Judge0 connected to '$NETWORK_NAME'."
    cd "$SCRIPT_DIR"
}

# Run backend server only
run_backend_only() {
    echo "Starting backend server only..."
    cd "$SCRIPT_DIR"
    
    # Create shared network
    ensure_network
    
    docker-compose -f docker/docker-compose.dev.yaml up -d backend-server mongo
    
    # Connect backend to shared network
    connect_to_network docker_backend-server_1
    connect_to_network docker_mongo_1
    
    echo "Backend server started and connected to '$NETWORK_NAME'."
}

# Run all services (backend + Judge0)
run_all() {
    echo "Starting all services (backend + Judge0)..."
    cd "$SCRIPT_DIR"
    
    # Create shared network
    ensure_network
    
    # Start Judge0 services
    cd "$SCRIPT_DIR/docker/judge0"
    docker-compose up -d
    
    # Start backend services
    cd "$SCRIPT_DIR"
    docker-compose -f docker/docker-compose.dev.yaml up -d
    
    # Connect all containers to shared network
    connect_to_network judge0_server_1
    connect_to_network judge0_workers_1
    connect_to_network judge0_db_1
    connect_to_network judge0_redis_1
    connect_to_network docker_backend-server_1
    connect_to_network docker_mongo_1
    
    echo "All services started on shared network '$NETWORK_NAME'."
}

# Clean up all containers and volumes
run_clean() {
    echo "Stopping and removing all containers and volumes..."
    cd "$SCRIPT_DIR"
    
    # Clean up backend services
    docker-compose -f docker/docker-compose.dev.yaml down -v 2>/dev/null || true
    
    # Clean up Judge0 services
    cd "$SCRIPT_DIR/docker/judge0"
    docker-compose down -v 2>/dev/null || true
    
    # Remove shared network
    docker network rm $NETWORK_NAME 2>/dev/null || true
    
    echo "All containers and volumes removed."
}

# Main execution
if $CLEAN_UP; then
    run_clean
fi

if $INITIALIZE; then
    run_initialize
fi

if $BACKEND_ONLY; then
    run_backend_only
elif $RUN_ALL; then
    run_all
fi

if $SAVE_LOGS; then
    save_logs
fi

echo "Done."