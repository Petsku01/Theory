#!/usr/bin/env python3
"""
- Server Backup Tool – Simple, reliable, production-ready
- Incremental/full backups · scheduling · email alerts · proper locking
- pk
"""

import os
import sys
import zipfile
import datetime
import logging
import logging.handlers
import configparser
import platform
import time
import signal
import fnmatch
from pathlib import Path
from typing import List, Optional, Callable

# --------------------------------------------------------------------------- #
# Third-party requirements (fail early with clear message)
# --------------------------------------------------------------------------- #
try:
    import schedule
except ImportError:
    print("Error: 'schedule' not found → pip install schedule")
    sys.exit(1)

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    print("Error: Python 3.9+ required (zoneinfo built-in)")
    sys.exit(1)

# --------------------------------------------------------------------------- #
# Platform-specific file locking (robust & simple)
# --------------------------------------------------------------------------- #
if platform.system() == "Windows":
    import msvcrt

    def lock_fd(fd):
        try:
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            return False

    def unlock_fd(fd):
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
        except Exception:
            pass
else:
    import fcntl

    def lock_fd(fd):
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except (BlockingIOError, OSError):
            return False

    def unlock_fd(fd):
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        except Exception:
            pass


# --------------------------------------------------------------------------- #
# Main backup class
# --------------------------------------------------------------------------- #
class BackupTool:
    def __init__(self, config_file: str = "backup_config.ini", progress_callback: Optional[Callable[[str], None]] = None):
        self.progress = progress_callback
        self.lock_fd: Optional[int] = None
        self.config_file = Path(config_file)

        self.logger = self._setup_logging()
        self._load_config()

        if not progress_callback:  # CLI mode → prevent double runs
            self._acquire_lock()

    def _setup_logging(self) -> logging.Logger:
        logger = logging.getLogger("BackupTool")
        if logger.handlers:
            return logger

        logger.setLevel(logging.INFO)
        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

        Path("logs").mkdir(exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            "logs/backup.log", maxBytes=10_485_760, backupCount=5, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Also log to console in CLI mode
        if not self.progress:
            console = logging.StreamHandler()
            console.setFormatter(formatter)
            logger.addHandler(console)

        return logger

    def _acquire_lock(self):
        lock_path = Path("backup.lock")
        try:
            self.lock_fd = os.open(lock_path, os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
            if not lock_fd(self.lock_fd):
                raise OSError
            self.logger.info("Lock acquired")
        except Exception:
            self.logger.error("Another backup process is already running")
            sys.exit(1)

    def _release_lock(self):
        if self.lock_fd is not None:
            try:
                unlock_fd(self.lock_fd)
                os.close(self.lock_fd)
                Path("backup.lock").unlink(missing_ok=True)
            except Exception:
                pass
            self.lock_fd = None

    def _load_config(self):
        # Defaults
        self.source_dirs: List[str] = []
        self.backup_dir = "./backups"
        self.backup_type = "incremental"
        self.max_backups = 5
        self.exclude_patterns: List[str] = []
        self.schedule_time = "02:00"
        self.timezone = "UTC"
        self.email_enabled = False
        self.smtp_server = self.smtp_port = self.smtp_user = self.smtp_password = self.email_to = ""

        if not self.config_file.exists():
            self._create_default_config()

        config = configparser.ConfigParser()
        config.read(self.config_file, encoding="utf-8")

        d = config["DEFAULT"]

        raw_sources = d.get("SourceDirs", "")
        self.source_dirs = [p.strip() for p in raw_sources.split(",") if p.strip()]

        self.backup_dir = d.get("BackupDir", "./backups")
        Path(self.backup_dir).mkdir(parents=True, exist_ok=True)

        self.backup_type = d.get("BackupType", "incremental").lower()
        if self.backup_type not in {"full", "incremental"}:
            self.backup_type = "incremental"

        self.max_backups = max(1, d.getint("MaxBackups", 5))

        exc = d.get("ExcludePatterns", "")
        self.exclude_patterns = [p.strip().lower() for p in exc.split(",") if p.strip()]

        self.schedule_time = d.get("ScheduleTime", "02:00")
        self.timezone = d.get("EmailTimezone", "UTC")

        self.email_enabled = d.getboolean("EmailEnabled", False)
        if self.email_enabled:
            self.smtp_server = d.get("SMTPServer", "")
            self.smtp_port = d.getint("SMTPPort", 587)
            self.smtp_user = d.get("SMTPUser", "")
            self.smtp_password = d.get("SMTPPassword", "")
            self.email_to = d.get("EmailTo", "")

        # Validate source directories
        valid = []
        for s in self.source_dirs:
            p = Path(s).expanduser().resolve()
            if p.is_dir():
                valid.append(str(p))
            else:
                self.logger.warning(f"Source directory not found: {s}")
        self.source_dirs = valid

        if not self.source_dirs:
            self.logger.error("No valid source directories configured")
            if self.progress:
                self.progress("ERROR: No valid source directories")

    def _create_default_config(self):
        example = ("C:\\Users\\YourName\\Documents" if platform.system() == "Windows"
                   else "/home/youruser/Documents")

        defaults = {
            "SourceDirs": example,
            "BackupDir": "./backups",
            "BackupType": "incremental",
            "MaxBackups": "5",
            "ExcludePatterns": "*.tmp, *.log, *.cache, Thumbs.db, .DS_Store",
            "ScheduleTime": "02:00",
            "EmailEnabled": "False",
            "SMTPServer": "smtp.gmail.com",
            "SMTPPort": "587",
            "SMTPUser": "you@gmail.com",
            "SMTPPassword": "your-app-password",
            "EmailTo": "admin@example.com",
            "EmailTimezone": "UTC",
        }

        cp = configparser.ConfigParser()
        cp["DEFAULT"] = defaults
        with open(self.config_file, "w", encoding="utf-8") as f:
            cp.write(f)
        self.logger.info(f"Created default config: {self.config_file}")

    def _should_exclude(self, path: Path) -> bool:
        return any(fnmatch.fnmatch(path.name.lower(), pat) for pat in self.exclude_patterns)

    )

    def _get_last_backup_time(self) -> Optional[datetime.datetime]:
        backups = sorted(Path(self.backup_dir).glob("backup_*.zip"))
        if not backups:
            return None
        latest = backups[-1]
        try:
            ts = latest.stem.split("_", 1)[1]
            naive = datetime.datetime.strptime(ts, "%Y%m%d_%H%M%S")
            tz = ZoneInfo(self.timezone)
            return naive.replace(tzinfo=tz).astimezone(datetime.timezone.utc)
        except Exception:
            return None

    def run_backup(self):
        start = datetime.datetime.now(ZoneInfo(self.timezone))
        timestamp = start.strftime("%Y%m%d_%H%M%S")
        name = f"backup_{timestamp}"

        try:
            if not self.source_dirs:
                raise RuntimeError("No valid source directories configured")

            if self.progress:
                self.progress(f"Starting backup {name}")

            since = self._get_last_backup_time() if self.backup_type == "incremental" else None

            files_to_backup: List[str] = []
            for src in self.source_dirs:
                if self.progress:
                    self.progress(f"Scanning {src}...")
                root = Path(src)
                for path in root.rglob("*"):
                    if not path.is_file() or self._should_exclude(path):
                        continue
                    if since:
                        try:
                            mt = datetime.datetime.fromtimestamp(path.stat().st_mtime, tz=datetime.timezone.utc)
                            if mt <= since:
                                continue
                        except OSError:
                            continue
                    files_to_backup.append(str(path))

            if not files_to_backup:
                msg = "No changes since last backup" if since else "No files found"
                self.logger.info(msg)
                if self.progress:
                    self.progress(msg)
                return

            # Create ZIP
            zip_path = Path(self.backup_dir) / f"{name}.zip"
            with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                for i, f in enumerate(files_to_backup, 1):
                    p = Path(f)
                    # Preserve relative path from its source root
                    for src in self.source_dirs:
                        try:
                            arcname = p.relative_to(src).as_posix()
                            break
                        except ValueError:
                            continue
                    else:
                        arcname = p.name
                    zf.write(f, arcname)

                    if i % 100 == 0 and self.progress:
                        self.progress(f"Compressing {i}/{len(files_to_backup)}...")

            size_mb = zip_path.stat().st_size / (1024 * 1024)
            duration = (datetime.datetime.now(ZoneInfo(self.timezone)) - start).total_seconds()

            success = f"Success · {len(files_to_backup)} files · {size_mb:.1f} MB · {duration:.1f}s"
            self.logger.info(success)
            if self.progress:
                self.progress(success)

            self._cleanup_old_backups()
            self._send_email("Backup Success", f"{success}\nArchive: {zip_path}")

        except Exception as e:
            self.logger.exception("Backup failed")
            if self.progress:
                self.progress(f"FAILED: {e}")
            self._send_email("Backup FAILED", str(e))
        finally:
            self._release_lock()

    def _cleanup_old_backups(self):
        try:
            backups = sorted(Path(self.backup_dir).glob("backup_*.zip"), key=os.path.getmtime)
            while len(backups) > self.max_backups:
                old = backups.pop(0)
                old.unlink()
                self.logger.info(f"Deleted old backup: {old.name}")
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")

    def _send_email(self, subject: str, body: str):
        if not self.email_enabled:
            return
        if not all([self.smtp_server, self.smtp_user, self.smtp_password, self.email_to]):
            return

        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = self.smtp_user
            msg["To"] = self.email_to

            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15) as s:
                s.starttls()
                s.login(self.smtp_user, self.smtp_password)
                s.send_message(msg)
            self.logger.info("Email notification sent")
        except Exception as e:
            self.logger.error(f"Email failed: {e}")

    def start_scheduler(self):
        schedule.clear()
        try:
            # schedule uses local system time – we just validate format
            datetime.datetime.strptime(self.schedule_time, "%H:%M")
        except ValueError:
            raise ValueError(f"Invalid ScheduleTime: {self.schedule_time}")

        schedule.every().day.at(self.schedule_time).do(self.run_backup)
        self.logger.info(f"Scheduler active → daily at {self.schedule_time} ({self.timezone})")

        print(f"Backup scheduler running – next run at {self.schedule_time}")
        print("Press Ctrl+C to stop")

        try:
            while True:
                schedule.run_pending()
                time.sleep(30)
        except KeyboardInterrupt:
            print("\nScheduler stopped")


# --------------------------------------------------------------------------- #
# CLI entry point
# --------------------------------------------------------------------------- #
def main():
    def _signal_handler(*_):
        print("\nShutting down...")
        sys.exit(0)

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    if len(sys.argv) > 1 and sys.argv[1] == "--schedule":
        tool = BackupTool()
        tool.start_scheduler()
    else:
        tool = BackupTool()
        tool.run_backup()


if __name__ == "__main__":
    main()
