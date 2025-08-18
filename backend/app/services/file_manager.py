import os
import json
import gzip
import uuid
import shutil
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime

from fastapi import UploadFile, HTTPException
from app.core.config import settings

try:
	import boto3
	from botocore.config import Config as BotoConfig
	_S3_AVAILABLE = True
except Exception:
	_S3_AVAILABLE = False


class FileManager:
	"""
	Service for managing file storage with organized directory structure:
	uploads/{user_id}/{pdf_id}/ (local)
	R2 key structure: users/{user_id}/{pdf_id}/
	"""
	
	def __init__(self):
		self.uploads_dir = Path(settings.UPLOAD_DIR)
		self.max_json_size = 5 * 1024 * 1024  # 5MB threshold for compression
		self.is_r2 = settings.STORAGE_BACKEND.lower() == "r2"
		self.bucket = settings.R2_BUCKET
		# Lazy-init S3 client to avoid errors where not needed (e.g., listing books)
		self.s3 = None
	
	def _ensure_s3(self):
		if not self.is_r2:
			raise RuntimeError("S3 client requested but STORAGE_BACKEND is not r2")
		if self.s3 is not None:
			return self.s3
		if not _S3_AVAILABLE:
			raise RuntimeError("boto3 not installed; required for R2 backend")
		if not settings.R2_ENDPOINT or not settings.R2_ACCESS_KEY_ID or not settings.R2_SECRET_ACCESS_KEY or not self.bucket:
			raise RuntimeError("R2 configuration missing (endpoint, keys, or bucket)")
		self.s3 = boto3.client(
			"s3",
			endpoint_url=settings.R2_ENDPOINT,
			region_name="auto",
			aws_access_key_id=settings.R2_ACCESS_KEY_ID,
			aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
			config=BotoConfig(signature_version="s3v4"),
		)
		return self.s3

	def generate_pdf_id(self) -> str:
		"""Generate a unique PDF ID using UUID4."""
		return str(uuid.uuid4())
	
	def _r2_key_prefix(self, user_id: int, pdf_id: str) -> str:
		return f"users/{user_id}/{pdf_id}"
	
	def get_user_directory(self, user_id: int) -> Path:
		"""Get the directory path for a specific user (local only)."""
		return self.uploads_dir / str(user_id)
	
	def get_pdf_directory(self, user_id: int, pdf_id: str) -> Path:
		"""Get the directory path for a specific PDF (local only)."""
		return self.get_user_directory(user_id) / pdf_id
	
	def create_pdf_directory(self, user_id: int, pdf_id: str) -> Path:
		"""Create directory structure for a new PDF upload (local only)."""
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		pdf_dir.mkdir(parents=True, exist_ok=True)
		return pdf_dir
	
	async def save_uploaded_file(
		self, 
		user_id: int, 
		pdf_id: str, 
		file: UploadFile, 
		file_content: bytes
	) -> str:
		"""
		Save uploaded file.
		- Local: write to disk; return absolute file path
		- R2: upload to bucket; return R2 key (not URL)
		"""
		original_name = file.filename or "document.pdf"
		safe_filename = self._sanitize_filename(original_name)
		if self.is_r2:
			try:
				s3 = self._ensure_s3()
				key = f"{self._r2_key_prefix(user_id, pdf_id)}/{safe_filename}"
				s3.put_object(
					Bucket=self.bucket,
					Key=key,
					Body=file_content,
					ContentType=file.content_type or "application/octet-stream",
				)
				return key
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"StorageError: failed to upload file: {e}")
		# local
		pdf_dir = self.create_pdf_directory(user_id, pdf_id)
		file_path = pdf_dir / safe_filename
		with open(file_path, "wb") as f:
			f.write(file_content)
		return str(file_path)
	
	def save_processed_content(
		self, 
		user_id: int, 
		pdf_id: str, 
		content: Dict[str, Any]
	) -> str:
		"""
		Save processed PDF content as JSON (local only cache for processing).
		"""
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		content_json = json.dumps(content, indent=2, ensure_ascii=False)
		content_bytes = content_json.encode('utf-8')
		if len(content_bytes) > self.max_json_size:
			content_file = pdf_dir / "content.json.gz"
			with gzip.open(content_file, 'wt', encoding='utf-8') as f:
				f.write(content_json)
		else:
			content_file = pdf_dir / "content.json"
			with open(content_file, 'w', encoding='utf-8') as f:
				f.write(content_json)
		return str(content_file)
	
	def load_processed_content(self, user_id: int, pdf_id: str) -> Optional[Dict[str, Any]]:
		"""Load processed content from local cache (if present)."""
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		compressed_file = pdf_dir / "content.json.gz"
		if compressed_file.exists():
			try:
				with gzip.open(compressed_file, 'rt', encoding='utf-8') as f:
					return json.load(f)
			except Exception as e:
				print(f"Error loading compressed content: {e}")
				return None
		uncompressed_file = pdf_dir / "content.json"
		if uncompressed_file.exists():
			try:
				with open(uncompressed_file, 'r', encoding='utf-8') as f:
					return json.load(f)
			except Exception as e:
				print(f"Error loading uncompressed content: {e}")
				return None
		return None
	
	def save_metadata(self, user_id: int, pdf_id: str, metadata: Dict[str, Any]) -> str:
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		metadata_file = pdf_dir / "metadata.json"
		with open(metadata_file, 'w', encoding='utf-8') as f:
			json.dump(metadata, f, indent=2, ensure_ascii=False, default=str)
		return str(metadata_file)
	
	def save_images(self, user_id: int, pdf_id: str, images: List[Dict]) -> str:
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		images_dir = pdf_dir / "images"
		images_dir.mkdir(exist_ok=True)
		images_file = images_dir / "images.json"
		with open(images_file, 'w', encoding='utf-8') as f:
			json.dump(images, f, indent=2, ensure_ascii=False)
		return str(images_dir)
	
	def get_original_file_path(self, user_id: int, pdf_id: str) -> Optional[str]:
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		if not pdf_dir.exists():
			return None
		for file_path in pdf_dir.iterdir():
			if file_path.is_file() and file_path.suffix.lower() == '.pdf':
				return str(file_path)
		return None
	
	def content_exists(self, user_id: int, pdf_id: str) -> bool:
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		compressed_file = pdf_dir / "content.json.gz"
		uncompressed_file = pdf_dir / "content.json"
		return compressed_file.exists() or uncompressed_file.exists()
	
	def delete_pdf_directory(self, user_id: int, pdf_id: str) -> bool:
		pdf_dir = self.get_pdf_directory(user_id, pdf_id)
		if pdf_dir.exists():
			try:
				shutil.rmtree(pdf_dir)
				return True
			except Exception as e:
				print(f"Error deleting PDF directory {pdf_dir}: {e}")
				return False
		return True
	
	def migrate_existing_file(self, old_file_path: str, user_id: int, pdf_id: str) -> str:
		if not os.path.exists(old_file_path):
			raise FileNotFoundError(f"Source file not found: {old_file_path}")
		pdf_dir = self.create_pdf_directory(user_id, pdf_id)
		filename = os.path.basename(old_file_path)
		safe_filename = self._sanitize_filename(filename)
		new_file_path = pdf_dir / safe_filename
		shutil.copy2(old_file_path, new_file_path)
		try:
			os.remove(old_file_path)
		except Exception as e:
			print(f"Warning: Could not remove old file {old_file_path}: {e}")
		return str(new_file_path)
	
	def _sanitize_filename(self, filename: str) -> str:
		base, ext = os.path.splitext(filename)
		# Sanitize base
		safe_chars: List[str] = []
		for char in base:
			if char.isalnum() or char in "._-":
				safe_chars.append(char)
			elif char == " ":
				safe_chars.append("_")
		safe_base = "".join(safe_chars) or "file"
		# Ensure extension exists; default to .pdf for unknowns
		ext = ext if ext else ".pdf"
		# Normalize extension to lowercase and strip unsafe chars
		ext = ext.lower() if ext.startswith(".") else f".{ext.lower()}"
		return f"{safe_base}{ext}"
	
	def save_cover_image(self, user_id: int, book_id: str, cover_image_content: bytes, filename: str) -> str:
		"""
		Save cover image
		- Local: save and return absolute file path
		- R2: upload to bucket and return key
		"""
		safe_filename = self._sanitize_filename(filename)
		# normalize to .jpg if not image
		if not any(safe_filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
			safe_filename = safe_filename.rsplit('.', 1)[0] + '.jpg'
		cover_name = f"cover{os.path.splitext(safe_filename)[1]}"
		if self.is_r2:
			s3 = self._ensure_s3()
			key = f"{self._r2_key_prefix(user_id, book_id)}/{cover_name}"
			try:
				s3.put_object(
					Bucket=self.bucket,
					Key=key,
					Body=cover_image_content,
					ContentType="image/jpeg",
				)
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"StorageError: failed to save cover image: {e}")
			return key
		# local
		book_dir = self.get_pdf_directory(user_id, book_id)
		cover_path = book_dir / cover_name
		with open(cover_path, "wb") as f:
			f.write(cover_image_content)
		return str(cover_path)
	
	def get_cover_image_url(self, user_id: int, book_id: str) -> Optional[str]:
		"""
		Return a URL or key for the cover image.
		- Local: /uploads/{user_id}/{book_id}/cover.ext
		- R2: return a presigned GET URL
		"""
		if self.is_r2:
			s3 = self._ensure_s3()
			# try common extensions
			for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
				key = f"{self._r2_key_prefix(user_id, book_id)}/cover{ext}"
				try:
					url = s3.generate_presigned_url(
						"get_object",
						Params={"Bucket": self.bucket, "Key": key},
						ExpiresIn=settings.R2_PRESIGN_TTL_SECONDS,
					)
					return url
				except Exception:
					continue
			return None
		# local
		book_dir = self.get_pdf_directory(user_id, book_id)
		for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
			cover_path = book_dir / f"cover{ext}"
			if cover_path.exists():
				return f"/uploads/{user_id}/{book_id}/cover{ext}"
		return None 

	def generate_presigned_get_url(self, key: str, ttl: Optional[int] = None) -> str:
		"""Generate a presigned GET URL for an R2 object key."""
		if not self.is_r2:
			raise RuntimeError("Presigned URL only available for R2 backend")
		s3 = self._ensure_s3()
		return s3.generate_presigned_url(
			"get_object",
			Params={"Bucket": self.bucket, "Key": key},
			ExpiresIn=ttl or settings.R2_PRESIGN_TTL_SECONDS,
		)

	def download_object_to_temp(self, key: str, suffix: str = ".pdf") -> str:
		"""Download an R2 object to a temporary local file and return the path."""
		if not self.is_r2:
			raise RuntimeError("Download only available for R2 backend")
		import tempfile
		s3 = self._ensure_s3()
		resp = s3.get_object(Bucket=self.bucket, Key=key)
		body = resp["Body"].read()
		tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
		tmp.write(body)
		tmp.flush()
		tmp.close()
		return tmp.name 