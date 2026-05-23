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

  metadata_startup_script = <<-EOT
    #!/bin/bash
    # Așteaptă ca rețeaua să fie disponibilă
    sleep 10
    
    apt-get update
    apt-get install -y ca-certificates curl gnupg git
    
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    cd /opt
    if [ ! -d "${var.github_repo}" ]; then
      git clone https://github.com/${var.github_owner}/${var.github_repo}.git
    else
      cd ${var.github_repo}
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

  source_ranges = ["0.0.0.0/0", "35.235.240.0/20"]
  target_tags   = ["univflow-db"]
  depends_on    = [google_project_service.apis]
}
