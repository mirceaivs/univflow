variable "project_id" {
  type        = string
  description = "Project ID-ul implicit al aplicației UnivFlow."
}
variable "project_number" {
  type        = string
  description = "Project Number-ul utilizat pentru generarea agenților de servicii."
}
variable "region" {
  type        = string
  description = "Regiunea GCP în care se va proviziona întreaga infrastructură."
  default     = "europe-west3"
}
variable "db_password" {
  type        = string
  description = "Parola bazei de date relaționale PostgreSQL."
  sensitive   = true
}
variable "internal_api_key" {
  type        = string
  description = "Cheia API internă utilizată pentru validarea traficului inter-servicii."
  sensitive   = true
}
variable "db_name" {
  type        = string
  description = "Numele logic al bazei de date."
}
variable "db_user" {
  type        = string
  description = "Utilizatorul administrator al bazei de date."
}
variable "github_owner" {
  type        = string
  description = "Numele organizației sau utilizatorului GitHub care deține codul sursă."
}
variable "github_repo" {
  type        = string
  description = "Numele repository-ului GitHub asociat UnivFlow."
}
variable "github_branch" {
  type        = string
  description = "Ramura (branch-ul) GitHub monitorizată de serviciul Cloud Build."
  default     = "main"
}

variable "github_token" {
  type        = string
  description = "Personal Access Token-ul de GitHub utilizat pentru clonarea repository-ului privat."
  sensitive   = true
}

variable "mail_password" {
  type        = string
  description = "Parola aplicatiei de email utilizata pentru trimiterea de emailuri (SMTP)."
  sensitive   = true
}