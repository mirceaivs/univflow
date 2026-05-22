output "frontend_url" {
  description = "URL-ul public al aplicatiei de frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "java_backend_url" {
  description = "URL-ul backend-ului Java"
  value       = google_cloud_run_v2_service.java_backend.uri
}

output "db_vm_ip" {
  description = "Adresa IP interna a VM-ului de baze de date"
  value       = google_compute_address.db_internal_ip.address
}

output "ingestion_bucket_name" {
  description = "Numele bucket-ului GCS pentru ingestie"
  value       = google_storage_bucket.ingestion_bucket.name
}

output "artifact_registry_repo" {
  description = "URL-ul repository-ului Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}
