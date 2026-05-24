# --- IAP Securizare Frontend Nativ ---

# 1. Cloud Run invoker pentru IAP Service Agent
resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {  
  project  = google_cloud_run_v2_service.frontend.project  
  location = google_cloud_run_v2_service.frontend.location  
  name     = google_cloud_run_v2_service.frontend.name  
  role     = "roles/run.invoker"  
  member   = "serviceAccount:service-${var.project_number}@gcp-sa-iap.iam.gserviceaccount.com"
}

# 2. Permisiunea explicita pentru utilizatorul aplicatiei (CORECTATĂ)
# Utilizăm o resursă IAM aplicabilă EXCLUSIV pe acest serviciu Cloud Run.
resource "google_iap_web_cloud_run_service_iam_member" "iap_user_frontend" {  
  project                  = var.project_id  
  location                 = google_cloud_run_v2_service.frontend.location  
  cloud_run_service_name   = google_cloud_run_v2_service.frontend.name  
  role                     = "roles/iap.httpsResourceAccessor"  
  member                   = "user:univflow.app@gmail.com"
}

# --- Public Access (IAM Invokers) for Backend Services ---
# Since these services run their own application-level authentication (Spring Security / API Keys),
# we allow allUsers to invoke their Cloud Run URLs so that GFE passes traffic.

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project  = google_cloud_run_v2_service.java_backend.project
  location = google_cloud_run_v2_service.java_backend.location
  name     = google_cloud_run_v2_service.java_backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ingest_invoker" {
  project  = google_cloud_run_v2_service.ingest_service.project
  location = google_cloud_run_v2_service.ingest_service.location
  name     = google_cloud_run_v2_service.ingest_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ask_invoker" {
  project  = google_cloud_run_v2_service.ask_service.project
  location = google_cloud_run_v2_service.ask_service.location
  name     = google_cloud_run_v2_service.ask_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
