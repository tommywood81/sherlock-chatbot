#!/usr/bin/env python3
"""
Build, publish, and deploy Sherlock Chatbot containers to a DigitalOcean droplet.

Workflow:
1) Build frontend/backend images locally from this repo.
2) Push both images to Docker Hub.
3) SSH into droplet, pull images, and run docker compose.
4) Configure nginx reverse proxy for DOMAIN and request SSL cert via certbot.

Secrets/config are loaded from deploy/.env (gitignored).
"""

from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass


REPO_ROOT = pathlib.Path(__file__).resolve().parent
DEPLOY_ENV_PATH = REPO_ROOT / "deploy" / ".env"


def read_env_file(path: pathlib.Path) -> dict[str, str]:
    """Read a simple KEY=VALUE env file."""
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        clean_key = key.strip()
        if clean_key in values:
            # Keep first value to avoid accidental overrides from duplicated blocks.
            continue
        values[clean_key] = value.strip().strip("'").strip('"')
    return values


def run(command: list[str], *, cwd: pathlib.Path | None = None) -> None:
    """Run a shell command and fail fast if it errors."""
    printable = " ".join(command)
    print(f"$ {printable}")
    subprocess.run(command, cwd=str(cwd) if cwd else None, check=True)


def run_capture(command: list[str]) -> str:
    """Run command and return stdout text."""
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def ssh_base(host: str, user: str, key_path: str) -> list[str]:
    return [
        "ssh",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-i",
        key_path,
        f"{user}@{host}",
    ]


def scp_to(host: str, user: str, key_path: str, local_file: str, remote_file: str) -> None:
    run(
        [
            "scp",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-i",
            key_path,
            local_file,
            f"{user}@{host}:{remote_file}",
        ]
    )


def run_remote_script(config: Config, script_body: str, remote_path: str) -> None:
    """Upload and execute a shell script on the droplet."""
    ssh_cmd = ssh_base(config.droplet_host, config.droplet_user, config.droplet_ssh_key_path)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sh", delete=False, encoding="utf-8") as tmp:
        tmp.write(script_body)
        temp_script = tmp.name

    try:
        scp_to(
            config.droplet_host,
            config.droplet_user,
            config.droplet_ssh_key_path,
            temp_script,
            remote_path,
        )
    finally:
        pathlib.Path(temp_script).unlink(missing_ok=True)

    run(ssh_cmd + [f"bash {remote_path}"])


@dataclass(frozen=True)
class Config:
    dockerhub_namespace: str
    dockerhub_frontend_repo: str
    dockerhub_backend_repo: str
    image_tag: str
    droplet_host: str
    droplet_user: str
    droplet_ssh_key_path: str
    domain: str
    include_www_domain: bool
    email: str
    frontend_host_port: int
    install_nginx_if_missing: bool

    @property
    def frontend_image(self) -> str:
        return (
            f"{self.dockerhub_namespace}/"
            f"{self.dockerhub_frontend_repo}:{self.image_tag}"
        )

    @property
    def backend_image(self) -> str:
        return (
            f"{self.dockerhub_namespace}/"
            f"{self.dockerhub_backend_repo}:{self.image_tag}"
        )

    @property
    def domain_names(self) -> list[str]:
        domains = [self.domain]
        if self.include_www_domain and not self.domain.startswith("www."):
            domains.append(f"www.{self.domain}")
        return domains


def load_config() -> Config:
    file_values = read_env_file(DEPLOY_ENV_PATH)
    # Local deploy file should take precedence to avoid stale shell env overrides.
    env = {**os.environ, **file_values}

    required = [
        "DOCKERHUB_NAMESPACE",
        "DOCKERHUB_FRONTEND_REPO",
        "DOCKERHUB_BACKEND_REPO",
        "IMAGE_TAG",
        "DROPLET_HOST",
        "DROPLET_USER",
        "DROPLET_SSH_KEY_PATH",
        "DOMAIN",
        "EMAIL",
    ]

    missing = [k for k in required if not env.get(k)]
    if missing:
        formatted = ", ".join(missing)
        raise ValueError(
            f"Missing required values: {formatted}. "
            "Create deploy/.env from deploy/.env.example."
        )

    frontend_host_port = int(env.get("FRONTEND_HOST_PORT", "3100"))
    install_nginx_if_missing = (
        env.get("INSTALL_NGINX_IF_MISSING", "true").strip().lower() == "true"
    )
    include_www_domain = (
        env.get("INCLUDE_WWW_DOMAIN", "true").strip().lower() == "true"
    )

    key_path = env["DROPLET_SSH_KEY_PATH"]
    if not pathlib.Path(key_path).exists():
        raise ValueError(f"DROPLET_SSH_KEY_PATH does not exist: {key_path}")
    if pathlib.Path(key_path).is_dir():
        raise ValueError(
            "DROPLET_SSH_KEY_PATH must be a private key file path, not a directory."
        )

    return Config(
        dockerhub_namespace=env["DOCKERHUB_NAMESPACE"],
        dockerhub_frontend_repo=env["DOCKERHUB_FRONTEND_REPO"],
        dockerhub_backend_repo=env["DOCKERHUB_BACKEND_REPO"],
        image_tag=env["IMAGE_TAG"],
        droplet_host=env["DROPLET_HOST"],
        droplet_user=env["DROPLET_USER"],
        droplet_ssh_key_path=env["DROPLET_SSH_KEY_PATH"],
        domain=env["DOMAIN"],
        include_www_domain=include_www_domain,
        email=env["EMAIL"],
        frontend_host_port=frontend_host_port,
        install_nginx_if_missing=install_nginx_if_missing,
    )


def build_and_push_images(config: Config) -> None:
    local_frontend = "sherlock-local-frontend:deploy"
    local_backend = "sherlock-local-backend:deploy"

    run(
        [
            "docker",
            "build",
            "-f",
            str(REPO_ROOT / "frontend" / "Dockerfile"),
            "-t",
            local_frontend,
            str(REPO_ROOT / "frontend"),
        ]
    )
    run(
        [
            "docker",
            "build",
            "-f",
            str(REPO_ROOT / "backend" / "Dockerfile"),
            "-t",
            local_backend,
            str(REPO_ROOT / "backend"),
        ]
    )

    run(["docker", "tag", local_frontend, config.frontend_image])
    run(["docker", "tag", local_backend, config.backend_image])

    run(["docker", "push", config.frontend_image])
    run(["docker", "push", config.backend_image])


def build_remote_compose(config: Config) -> str:
    return f"""services:
  frontend:
    image: {config.frontend_image}
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "{config.frontend_host_port}:80"
    networks:
      - app

  backend:
    image: {config.backend_image}
    restart: unless-stopped
    environment:
      - MODEL_PATH=/app/models/llama32-1b-sherlock-v6-q4.gguf
      - PROJECT_ROOT=/app
      - N_CTX=2048
      - N_GPU_LAYERS=0
    volumes:
      - ./models:/app/models:ro
      - ./results:/app/results:ro
    networks:
      - app

networks:
  app:
    driver: bridge
"""


def deploy_to_droplet(config: Config) -> None:
    remote_root = "~/apps/sherlock-chatbot"
    compose_path = f"{remote_root}/docker-compose.prod.yml"
    ssh_cmd = ssh_base(config.droplet_host, config.droplet_user, config.droplet_ssh_key_path)

    run(
        ssh_cmd
        + [
            (
                f"mkdir -p {remote_root}/models {remote_root}/results "
                f"&& test -f {remote_root}/models/llama32-1b-sherlock-v6-q4.gguf "
                "|| echo 'WARNING: model file missing on droplet. "
                "Place GGUF at ~/apps/sherlock-chatbot/models/'."
            )
        ]
    )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False, encoding="utf-8") as tmp:
        tmp.write(build_remote_compose(config))
        temp_path = tmp.name

    try:
        scp_to(
            config.droplet_host,
            config.droplet_user,
            config.droplet_ssh_key_path,
            temp_path,
            compose_path,
        )
    finally:
        pathlib.Path(temp_path).unlink(missing_ok=True)

    # Guardrail: fail if chosen app port already in use.
    run(
        ssh_cmd
        + [
            (
                "bash -lc "
                f"\"if ss -ltn '( sport = :{config.frontend_host_port} )' | grep -q LISTEN; "
                "then echo 'ERROR: desired frontend host port already in use.'; exit 1; "
                "fi\""
            )
        ]
    )

    run(
        ssh_cmd
        + [
            (
                "bash -lc "
                f"\"cd {remote_root} "
                "&& docker compose -f docker-compose.prod.yml pull "
                "&& docker compose -f docker-compose.prod.yml up -d\""
            )
        ]
    )


def configure_domain_and_ssl(config: Config) -> None:
    install_nginx = "true" if config.install_nginx_if_missing else "false"
    server_names = " ".join(config.domain_names)
    certbot_domain_flags = " ".join(f"-d {domain}" for domain in config.domain_names)

    # This uses nginx as host reverse proxy so we do not bind app directly to 80/443.
    remote_script = f"""set -euo pipefail
if ! command -v nginx >/dev/null 2>&1; then
  if [ "{install_nginx}" = "true" ]; then
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx
  else
    echo "nginx missing and INSTALL_NGINX_IF_MISSING=false"
    exit 1
  fi
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

site_avail="/etc/nginx/sites-available/{config.domain}.conf"
site_enabled="/etc/nginx/sites-enabled/{config.domain}.conf"
if [ -f "$site_avail" ]; then
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "$site_avail" "${{site_avail}}.${{ts}}.bak"
fi

cat >/etc/nginx/sites-available/{config.domain}.conf <<'NGINXCONF'
server {{
    listen 80;
    server_name {server_names};

    location / {{
        proxy_pass http://127.0.0.1:{config.frontend_host_port};
        proxy_http_version 1.1;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Accel-Buffering no;
        add_header Cache-Control no-cache;
    }}
}}
NGINXCONF

ln -sf "$site_avail" "$site_enabled"
nginx -t
systemctl reload nginx

certbot --nginx --non-interactive --agree-tos -m {config.email} {certbot_domain_flags} --redirect
"""
    run_remote_script(config, remote_script, "~/apps/sherlock-chatbot/configure-domain.sh")


def validate_local_tools() -> None:
    required_binaries = ["docker", "ssh", "scp"]
    for binary in required_binaries:
        if shutil.which(binary) is None:
            raise RuntimeError(
                f"Missing required tool '{binary}'. Install it and retry."
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy sherlock-chatbot images and configure droplet domain/SSL."
    )
    parser.add_argument(
        "--skip-domain",
        action="store_true",
        help="Skip nginx + certbot configuration.",
    )
    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        config = load_config()
        validate_local_tools()

        print("Building and pushing Docker images...")
        build_and_push_images(config)

        print("Deploying containers on droplet...")
        deploy_to_droplet(config)

        if not args.skip_domain:
            print("Configuring domain and SSL...")
            configure_domain_and_ssl(config)
        else:
            print("Skipped domain and SSL setup (--skip-domain).")

        print("Deployment complete.")
        print(
            f"App should be available via https://{config.domain} "
            f"(or http://{config.domain} until cert is issued)."
        )
        return 0
    except subprocess.CalledProcessError as exc:
        print(f"Command failed with exit code {exc.returncode}: {exc.cmd}", file=sys.stderr)
        return exc.returncode
    except Exception as exc:  # pragma: no cover - top-level CLI safety
        print(f"Deployment failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
