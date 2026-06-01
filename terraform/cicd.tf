

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_artifact_admin" {
  project = var.project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_cloudbuild_trigger" "frontend_trigger" {
  name        = "deploy-frontend"
  description = "Build and deploy frontend"
  location    = "global"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.github_branch}$"
    }
  }

  included_files = ["frontend/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/frontend:latest", "-f", "frontend/Dockerfile.frontend", "frontend/"]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/frontend:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      
      args = ["run", "deploy", "frontend-service", "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/frontend:latest", "--region", var.region, "--no-allow-unauthenticated"]
    }
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "java_backend_trigger" {
  name     = "deploy-java-backend"
  location = "global"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.github_branch}$"
    }
  }

  included_files = ["univflow/**"]

  build {
    timeout = "1800s"
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/java-backend:latest", "-f", "univflow/Dockerfile.java", "univflow/"]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/java-backend:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args       = ["run", "deploy", "java-backend-service", "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/java-backend:latest", "--region", var.region]
    }
    options {
      logging      = "CLOUD_LOGGING_ONLY"
      machine_type = "E2_HIGHCPU_32"
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "ingest_service_trigger" {
  name     = "deploy-ingest-service"
  location = "global"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.github_branch}$"
    }
  }

  included_files = ["document_ingestion/ingestService/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-service:latest", "-f", "document_ingestion/ingestService/Dockerfile.ingest", "document_ingestion/ingestService/"]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-service:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args       = ["run", "deploy", "ingest-service", "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-service:latest", "--region", var.region]
    }
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "ask_service_trigger" {
  name     = "deploy-ask-service"
  location = "global"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.github_branch}$"
    }
  }

  included_files = ["document_ingestion/askService/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ask-service:latest", "-f", "document_ingestion/askService/Dockerfile.ask", "document_ingestion/askService/"]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ask-service:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args       = ["run", "deploy", "ask-service", "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ask-service:latest", "--region", var.region, "--concurrency", "80"]
    }
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "worker_job_trigger" {
  name     = "deploy-worker-job"
  location = "global"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.github_branch}$"
    }
  }

  included_files = ["document_ingestion/ingestService/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-worker:latest", "-f", "document_ingestion/ingestService/Dockerfile.worker", "document_ingestion/ingestService/"]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-worker:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args       = ["run", "jobs", "update", "ingest-worker-job", "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ingest-worker:latest", "--region", var.region]
    }
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }
  depends_on = [google_project_service.apis]
}
