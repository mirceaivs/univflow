
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
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker_repo" {
  depends_on    = [google_project_service.apis]
  location      = var.region
  repository_id = "univflow-repo"
  description   = "Docker repository for Univflow microservices"
  format        = "DOCKER"
}

resource "google_storage_bucket" "ingestion_bucket" {
  name                        = "univflow-bucket"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  soft_delete_policy {
    retention_duration_seconds = 0
  }
}

resource "google_storage_bucket" "public_diagrams_bucket" {
  name                        = "univflow-public-diagrams-56183bb6"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  soft_delete_policy {
    retention_duration_seconds = 0
  }
}

resource "google_storage_bucket_iam_member" "public_diagrams_viewer" {
  bucket = google_storage_bucket.public_diagrams_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "ingestion_bucket_native_sa_admin" {
  bucket = google_storage_bucket.ingestion_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "public_diagrams_native_sa_admin" {
  bucket = google_storage_bucket.public_diagrams_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "ingestion_bucket_external_sa_admin" {
  bucket = google_storage_bucket.ingestion_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:test-sa-platform@wave27-mivascu-447311.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "public_diagrams_external_sa_admin" {
  bucket = google_storage_bucket.public_diagrams_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:test-sa-platform@wave27-mivascu-447311.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "compute_sa_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}
