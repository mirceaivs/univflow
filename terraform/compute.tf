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
    # FARA access_config block = FARA IP Public
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y ca-certificates curl gnupg git
    
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    cd /opt
    git clone https://github.com/${var.github_owner}/${var.github_repo}.git
    cd ${var.github_repo}/initBazaDeDate
    
    docker compose up -d
  EOT

  depends_on = [google_project_service.apis]
}
