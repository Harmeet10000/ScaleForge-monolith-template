# S3 Module Outputs

output "documents_bucket_id" {
  description = "The name of the documents bucket"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "The ARN of the documents bucket"
  value       = aws_s3_bucket.documents.arn
}

output "documents_bucket_domain_name" {
  description = "The bucket domain name of the documents bucket"
  value       = aws_s3_bucket.documents.bucket_domain_name
}

output "backups_bucket_id" {
  description = "The name of the backups bucket"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "The ARN of the backups bucket"
  value       = aws_s3_bucket.backups.arn
}

output "logs_bucket_id" {
  description = "The name of the logs bucket"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "The ARN of the logs bucket"
  value       = aws_s3_bucket.logs.arn
}

output "kms_key_id" {
  description = "The globally unique identifier for the key"
  value       = aws_kms_key.s3.key_id
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the key"
  value       = aws_kms_key.s3.arn
}
