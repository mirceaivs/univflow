# O adresa IP interna statica pentru VM-ul de baze de date
resource "google_compute_address" "db_internal_ip" {
  name         = "univflow-db-internal-ip"
  region       = var.region
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
  depends_on   = [google_project_service.apis]
}

# Regula firewall pentru acces intern din VPC
resource "google_compute_firewall" "db_firewall_internal" {
  name    = "univflow-db-allow-internal"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "5432", "7474", "7687"] # SSH, Postgres, Neo4j/AGE
  }

  # Permite accesul doar din plaja de adrese a VPC-ului (ex. din default subnet sau connector)
  source_ranges = ["10.128.0.0/9"] 
  target_tags   = ["univflow-db"]
  depends_on    = [google_project_service.apis]
}

resource "google_compute_instance" "db_vm" {
  name         = "univflow-db-vm"
  machine_type = "e2-medium"
  zone         = "${var.region}-b"
  tags         = ["univflow-db"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 30 # GB
    }
  }

  network_interface {
    network    = "default"
    network_ip = google_compute_address.db_internal_ip.address
    
    # Adaugam access_config gol pentru a atribui un IP public ephemeral (pentru internet egress la startup)
    access_config {}
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    export DEBIAN_FRONTEND=noninteractive

    apt-get update
    apt-get install -yq git curl

    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh

    cd /opt
    if [ ! -d "${var.github_repo}" ]; then
      git clone https://${var.github_token}@github.com/${var.github_owner}/${var.github_repo}.git
    else
      cd ${var.github_repo}
      git remote set-url origin https://${var.github_token}@github.com/${var.github_owner}/${var.github_repo}.git
      git pull
      cd ..
    fi

    cd ${var.github_repo}/initBazaDeDate
    docker compose up -d
  EOT

  depends_on = [google_project_service.apis]
}

# Regula firewall pentru acces SSH public si prin IAP (Identity-Aware Proxy)
resource "google_compute_firewall" "db_firewall_ssh" {
  name    = "univflow-db-allow-ssh"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["univflow-db"]
  depends_on    = [google_project_service.apis]
}
