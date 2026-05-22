# Enable APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "compute.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage-component.googleapis.com",
    "secretmanager.googleapis.com",
    "iap.googleapis.com"
  ])
  service = each.value
  disable_on_destroy = false
}

# Artifact Registry pentru containere
resource "google_artifact_registry_repository" "docker_repo" {
  depends_on    = [google_project_service.apis]
  location      = var.region
  repository_id = "univflow-repo"
  description   = "Docker repository for Univflow microservices"
  format        = "DOCKER"
}

# 1. Bucket Privat (Ingestie)
resource "google_storage_bucket" "ingestion_bucket" {
  name          = "univflow-bucket"
  location      = var.region
  force_destroy = false
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

# 2. Bucket Public (Diagrame)
resource "google_storage_bucket" "public_diagrams_bucket" {
  name          = "univflow-public-diagrams-56183bb6"
  location      = var.region
  force_destroy = false
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_member" "public_diagrams_viewer" {
  bucket = google_storage_bucket.public_diagrams_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
