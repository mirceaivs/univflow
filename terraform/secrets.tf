

resource "google_secret_manager_secret" "db_password" {
  secret_id = "db_password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "internal_api_key" {
  secret_id = "internal_api_key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "internal_api_key_version" {
  secret      = google_secret_manager_secret.internal_api_key.id
  secret_data = var.internal_api_key
}

resource "google_secret_manager_secret" "service_account_key" {
  secret_id = "service_account_key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "service_account_key_version" {
  secret      = google_secret_manager_secret.service_account_key.id
  secret_data = file("D:\\Facultate\\Master\\Disertatie\\secret\\serviceaccount.txt")
}

resource "google_secret_manager_secret_iam_member" "compute_sa_db_password" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "compute_sa_internal_api_key" {
  secret_id = google_secret_manager_secret.internal_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "compute_sa_service_account_key" {
  secret_id = google_secret_manager_secret.service_account_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret" "mail_password" {
  secret_id = "mail_password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "mail_password_version" {
  secret      = google_secret_manager_secret.mail_password.id
  secret_data = var.mail_password
}

resource "google_secret_manager_secret_iam_member" "compute_sa_mail_password" {
  secret_id = google_secret_manager_secret.mail_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"
}
