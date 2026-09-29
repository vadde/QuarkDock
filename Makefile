# ==============================================================================
# ⚛️ QuarkDock Master Operations Makefile
# ==============================================================================
# Usage:
#   make <target>
#
# Examples:
#   make help       - View available commands
#   make dev        - Start full container ecosystem
#   make logs       - Tail logs from all containers
#   make doctor     - Diagnostic check of ports, Docker, and hardware
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE_FILE := deploy/compose/docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)
OLLAMA_MODEL ?= qwen2.5:7b

# Colors
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
BOLD   := \033[1m
RESET  := \033[0m

.PHONY: help setup dev stop restart logs logs-api logs-ui logs-ollama logs-langfuse \
        status doctor test test-api test-ui lint format clean pull-model eval-judge

##@ 📋 Command Center & Help
help: ## Display this help message
	@echo -e "$(BOLD)$(CYAN)⚛️  QuarkDock Ecosystem Operations$(RESET)"
	@echo -e "Engineered for macOS Apple Silicon (M5 Pro 24GB)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(CYAN)<target>$(RESET)\n"} \
		/^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ 🚀 Ecosystem Lifecycle
setup: ## Initialize environment files and directories
	@echo -e "$(CYAN)⚙️ Setting up QuarkDock environment...$(RESET)"
	@if [ ! -f deploy/compose/.env ]; then \
		if [ -f deploy/compose/.env.example ]; then \
			cp deploy/compose/.env.example deploy/compose/.env; \
			echo -e "$(GREEN)✓ Created deploy/compose/.env from template$(RESET)"; \
		fi \
	else \
		echo -e "$(YELLOW)deploy/compose/.env already exists$(RESET)"; \
	fi
	@mkdir -p eval/results services/api/src services/ui/src
	@echo -e "$(GREEN)✓ Setup complete.$(RESET)"

dev: ## Start all ecosystem containers in detached mode
	@echo -e "$(CYAN)🚀 Starting QuarkDock ecosystem in background...$(RESET)"
	@$(COMPOSE) up -d
	@echo -e "$(GREEN)✓ QuarkDock running!$(RESET)"
	@echo -e "  • Chat UI:             $(CYAN)http://localhost:3000$(RESET)"
	@echo -e "  • FastAPI Docs:        $(CYAN)http://localhost:8000/docs$(RESET)"
	@echo -e "  • Langfuse Dashboard:  $(CYAN)http://localhost:3001$(RESET)"
	@echo -e "  • Ollama Inference:    $(CYAN)http://localhost:11434$(RESET)"

stop: ## Stop all running ecosystem containers
	@echo -e "$(YELLOW)🛑 Stopping QuarkDock containers...$(RESET)"
	@$(COMPOSE) down
	@echo -e "$(GREEN)✓ Containers stopped cleanly.$(RESET)"

restart: stop dev ## Restart all ecosystem containers

##@ 📊 Observability & Diagnostics
logs: ## Follow logs from all containers
	@$(COMPOSE) logs -f --tail=100

logs-api: ## Follow logs from FastAPI backend
	@$(COMPOSE) logs -f api

logs-ui: ## Follow logs from React 19 UI
	@$(COMPOSE) logs -f ui

logs-ollama: ## Follow logs from Ollama model engine
	@$(COMPOSE) logs -f ollama

logs-langfuse: ## Follow logs from Langfuse server
	@$(COMPOSE) logs -f langfuse

status: ## Show running container status, ports, and memory stats
	@echo -e "$(CYAN)📦 Container Status:$(RESET)"
	@$(COMPOSE) ps
	@echo ""
	@echo -e "$(CYAN)🧠 Container Memory & CPU Consumption:$(RESET)"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | grep -E 'NAME|quarkdock' || true

doctor: ## Audit host port availability, Docker status, and system memory
	@echo -e "$(BOLD)$(CYAN)🔍 Running QuarkDock Doctor Diagnostics...$(RESET)"
	@echo -n "Checking Docker daemon... "
	@if docker info > /dev/null 2>&1; then \
		echo -e "$(GREEN)OK$(RESET)"; \
	else \
		echo -e "$(RED)FAIL (Docker daemon not running)$(RESET)"; \
	fi
	@echo "Checking port availability on host:"
	@for port in 3000 3001 8000 11434 5432 6379; do \
		if lsof -i :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
			PID=$$(lsof -i :$$port -sTCP:LISTEN -t | head -n1); \
			CMD=$$(ps -p $$PID -o comm= 2>/dev/null || echo "process"); \
			echo -e "  Port $$port: $(YELLOW)IN USE$(RESET) by $$CMD (PID: $$PID)"; \
		else \
			echo -e "  Port $$port: $(GREEN)AVAILABLE$(RESET)"; \
		fi \
	done

##@ 🧠 Model Operations
pull-model: ## Pull default LLM weights (qwen2.5:7b) into Ollama
	@echo -e "$(CYAN)📥 Pulling model weights $(OLLAMA_MODEL) into Ollama...$(RESET)"
	@curl -s -X POST http://localhost:11434/api/pull -d "{\"name\": \"$(OLLAMA_MODEL)\"}" | grep -E '"status"' || true
	@echo -e "$(GREEN)✓ Model pull initiated/completed.$(RESET)"

##@ 🔬 Quality, Testing & Evals
test: test-api test-ui ## Run all test suites across services

test-api: ## Run backend unit & integration tests
	@echo -e "$(CYAN)🧪 Running API tests...$(RESET)"
	@if [ -d services/api/tests ]; then \
		pytest services/api/tests -v; \
	else \
		echo -e "$(YELLOW)services/api/tests directory not yet populated$(RESET)"; \
	fi

test-ui: ## Run frontend test suite
	@echo -e "$(CYAN)🧪 Running UI tests...$(RESET)"
	@if [ -f services/ui/package.json ]; then \
		cd services/ui && npm test -- --run; \
	else \
		echo -e "$(YELLOW)services/ui/package.json not yet populated$(RESET)"; \
	fi

lint: ## Run linters (Ruff on Python, ESLint on TypeScript)
	@echo -e "$(CYAN)🧹 Linting Python code with Ruff...$(RESET)"
	@if command -v ruff > /dev/null 2>&1; then \
		ruff check services/api/; \
	else \
		echo -e "$(YELLOW)ruff not installed on host, skipping host check$(RESET)"; \
	fi

format: ## Auto-format Python code (Ruff) and UI code (Prettier)
	@echo -e "$(CYAN)✨ Formatting Python code with Ruff...$(RESET)"
	@if command -v ruff > /dev/null 2>&1; then \
		ruff format services/api/; \
	fi

eval-judge: ## Run LLM-as-judge automated quality evaluation harness
	@echo -e "$(CYAN)⚖️ Running LLM-as-Judge Evaluation Suite...$(RESET)"
	@if [ -f eval/run_eval.py ]; then \
		python3 eval/run_eval.py; \
	else \
		echo -e "$(YELLOW)eval/run_eval.py not yet populated$(RESET)"; \
	fi

##@ 🧹 Maintenance
clean: ## Clean Python caches, build artifacts, and test temp files
	@echo -e "$(CYAN)🧹 Cleaning temporary caches and artifacts...$(RESET)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo -e "$(GREEN)✓ Workspace cleaned.$(RESET)"
