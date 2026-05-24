locals {
  dummy_image = "us-docker.pkg.dev/cloudrun/container/hello"
  db_host     = google_compute_address.db_internal_ip.address
  
  # Deterministic URLs
  backend_url = "https://java-backend-service-${var.project_number}.${var.region}.run.app"
  ingest_url  = "https://ingest-service-${var.project_number}.${var.region}.run.app"
  ask_url     = "https://ask-service-${var.project_number}.${var.region}.run.app"
}

# --- 1. Frontend Service ---
resource "google_cloud_run_v2_service" "frontend" {
  provider = google-beta
  name     = "frontend-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # Frontend trebuie sa fie accesibil din afara, dar va fi protejat de IAP
  iap_enabled = true

  template {
    containers {
      image = local.dummy_image
      env {
        name  = "BACKEND_URL"
        value = local.backend_url
      }
      resources {
        startup_cpu_boost = true
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
  depends_on = [google_project_service.apis]
}

# --- 2. Java Backend Service ---
resource "google_cloud_run_v2_service" "java_backend" {
  name     = "java-backend-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network = "default"
      }
    }
    containers {
      image = local.dummy_image
      env {
        name  = "DB_URL"
        value = "jdbc:postgresql://${local.db_host}:5432/${var.db_name}"
      }
      env {
        name  = "DB_USERNAME"
        value = var.db_user
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "INGEST_SERVICE_URL"
        value = local.ingest_url
      }
      env {
        name  = "ASK_SERVICE_URL"
        value = local.ask_url
      }
      env {
        name = "INTERNAL_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.internal_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MAIL_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mail_password.secret_id
            version = "latest"
          }
        }
      }
      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        startup_cpu_boost = true
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.internal_api_key_version,
    google_secret_manager_secret_version.mail_password_version
  ]
}

# --- 3. Ingest API Service ---
resource "google_cloud_run_v2_service" "ingest_service" {
  name     = "ingest-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network = "default"
      }
    }
    containers {
      image = local.dummy_image
      env {
        name  = "DB_HOST"
        value = local.db_host
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.ingestion_bucket.name
      }
      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "REGION"
        value = var.region
      }
      env {
        name  = "WORKER_JOB_NAME"
        value = google_cloud_run_v2_job.ingest_worker.name
      }
      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/secrets/serviceaccount.json"
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INTERNAL_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.internal_api_key.secret_id
            version = "latest"
          }
        }
      }
      volume_mounts {
        name       = "sa-key-volume"
        mount_path = "/secrets"
      }
      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        startup_cpu_boost = true
      }
    }
    volumes {
      name = "sa-key-volume"
      secret {
        secret = google_secret_manager_secret.service_account_key.secret_id
        items {
          version = "latest"
          path    = "serviceaccount.json"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.internal_api_key_version,
    google_secret_manager_secret_version.service_account_key_version
  ]
}

# --- 4. Ask API Service ---
resource "google_cloud_run_v2_service" "ask_service" {
  name     = "ask-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network = "default"
      }
    }
    containers {
      image = local.dummy_image
      env {
        name  = "DB_HOST"
        value = local.db_host
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/secrets/serviceaccount.json"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "VERTEX_AI_PROJECT_ID"
        value = "wave27-mivascu-447311"
      }
      env {
        name  = "LOCATION"
        value = "global"
      }
      env {
        name  = "GEMINI_MODEL_NAME"
        value = "gemini-3.5-flash"
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INTERNAL_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.internal_api_key.secret_id
            version = "latest"
          }
        }
      }
      volume_mounts {
        name       = "sa-key-volume"
        mount_path = "/secrets"
      }
      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        startup_cpu_boost = true
      }
    }
    volumes {
      name = "sa-key-volume"
      secret {
        secret = google_secret_manager_secret.service_account_key.secret_id
        items {
          version = "latest"
          path    = "serviceaccount.json"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.internal_api_key_version,
    google_secret_manager_secret_version.service_account_key_version
  ]
}

# --- 5. Worker Cloud Run Job ---
resource "google_cloud_run_v2_job" "ingest_worker" {
  name     = "ingest-worker-job"
  location = var.region

  template {
    template {
      vpc_access {
        network_interfaces {
          network = "default"
        }
      }
      containers {
        image = local.dummy_image
        command = ["python", "worker.py"]
        env {
          name  = "DB_HOST"
          value = local.db_host
        }
        env {
          name  = "DB_NAME"
          value = var.db_name
        }
        env {
          name  = "DB_USER"
          value = var.db_user
        }
        env {
          name  = "GCS_BUCKET_NAME"
          value = google_storage_bucket.public_diagrams_bucket.name
        }
        env {
          name  = "GOOGLE_APPLICATION_CREDENTIALS"
          value = "/secrets/serviceaccount.json"
        }
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "VERTEX_AI_PROJECT_ID"
          value = "wave27-mivascu-447311"
        }
        env {
          name  = "LOCATION"
          value = "global"
        }
        env {
          name  = "GEMINI_MODEL_NAME"
          value = "gemini-3.5-flash"
        }
        env {
          name = "DB_PASS"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }
        volume_mounts {
          name       = "sa-key-volume"
          mount_path = "/secrets"
        }
        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
      }
      volumes {
        name = "sa-key-volume"
        secret {
          secret = google_secret_manager_secret.service_account_key.secret_id
          items {
            version = "latest"
            path    = "serviceaccount.json"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].template[0].containers[0].image]
  }
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.service_account_key_version
  ]
}

# --- 6. IAM Permissions for External Service Account to trigger Cloud Run Job ---
resource "google_project_iam_member" "external_sa_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:test-sa-platform@wave27-mivascu-447311.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "external_sa_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:test-sa-platform@wave27-mivascu-447311.iam.gserviceaccount.com"
}
